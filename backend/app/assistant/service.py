"""Loop manual de tool use con OpenAI (Responses API): el modelo decide que
herramientas llamar (consultar datos reales de la BD, o pedir una grafica)
hasta que responde con texto final. Ver app/assistant/tools.py para las
definiciones. Se usa /v1/responses (no /v1/chat/completions) porque el modelo
configurado (razonador) solo soporta function tools en ese endpoint.

Tambien incluye explicar_prediccion(): una llamada directa (sin tools) que
convierte UNA prediccion ya calculada por el modelo de clasificacion en una
descripcion y recomendaciones en lenguaje natural, para el boton "Generar
estrategia de apoyo" de la ficha del estudiante."""
from __future__ import annotations

import json
import logging

import openai
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.assistant.tools import CHART_TOOL_NAME, TOOLS, execute_data_tool
from app.config import OPENAI_API_KEY, OPENAI_MODEL
from app.models import RiskAlert
from app.services import get_materia_detalle, obtener_tema_materia

logger = logging.getLogger("eduapp.assistant")

MAX_TOOL_ITERATIONS = 6
MAX_HISTORY_MESSAGES = 12  # ultimos N mensajes de la conversacion (usuario+asistente)

SYSTEM_PROMPT = """Eres Pío Docs, el asistente de PioDocsAI, el sistema de \
deteccion temprana de riesgo academico del Colegio Franciscano Pio XII.

Respondes preguntas de coordinacion academica y orientacion escolar sobre los \
datos reales de riesgo de reprobacion de los estudiantes, y puedes generar \
graficas dinamicas en su dashboard.

Reglas:
- Usa SIEMPRE las herramientas para obtener numeros; nunca inventes cifras.
- Si el usuario no especifica el año lectivo, usa el mas reciente disponible \
(no hace falta preguntar, consulta_resumen_riesgo te lo indica).
- Cuando la pregunta se preste para una comparacion visual (varias materias, \
una distribucion de riesgo, la evolucion de un estudiante entre periodos), \
llama a generar_grafica ademas de responder en texto, usando los datos que ya \
consultaste.
- Responde siempre en español, de forma breve y concreta (2-5 frases salvo que \
te pidan mas detalle). Este es un panel de acompañamiento escolar: cuando \
hables de un estudiante en riesgo, mantén un tono profesional y empático, \
nunca alarmista.
- Las probabilidades del modelo son estimaciones, no certezas: dilo si es \
relevante para la pregunta.
"""


class AssistantError(Exception):
    """Error legible para mostrar en el chat (clave faltante, rate limit, etc.)."""


def _client() -> openai.OpenAI:
    if not OPENAI_API_KEY:
        raise AssistantError(
            "El asistente no esta configurado: falta OPENAI_API_KEY en backend/.env "
            "(agrega tu clave y reinicia el contenedor del backend)."
        )
    return openai.OpenAI(api_key=OPENAI_API_KEY)


def _create(client: openai.OpenAI, **kwargs):
    """client.responses.create con el mismo mapeo de errores en los dos
    flujos (chat y explicar_prediccion)."""
    try:
        return client.responses.create(**kwargs)
    except openai.AuthenticationError as err:
        raise AssistantError("La clave de OpenAI no es valida. Revisa OPENAI_API_KEY en backend/.env.") from err
    except openai.RateLimitError as err:
        raise AssistantError("Se alcanzo el limite de uso de la API de OpenAI. Intenta de nuevo en un momento.") from err
    except openai.APIStatusError as err:
        logger.exception("Error de la API de OpenAI")
        raise AssistantError(f"El asistente no pudo responder ({err.status_code}).") from err
    except openai.APIConnectionError as err:
        raise AssistantError("No se pudo conectar con la API de OpenAI. Revisa la conexion a internet.") from err


def _tools_openai() -> list[dict]:
    return [
        {
            "type": "function",
            "name": t["name"],
            "description": t["description"],
            "parameters": t["input_schema"],
        }
        for t in TOOLS
    ]


def chat(db: Session, message: str, history: list[dict] | None = None) -> dict:
    """Devuelve {'reply': str, 'chart': dict | None}."""
    client = _client()

    input_items: list = []
    for turn in (history or [])[-MAX_HISTORY_MESSAGES:]:
        role = turn.get("role")
        content = turn.get("content")
        if role in ("user", "assistant") and content:
            input_items.append({"role": role, "content": content})
    input_items.append({"role": "user", "content": message})

    chart: dict | None = None

    for _ in range(MAX_TOOL_ITERATIONS):
        response = _create(
            client,
            model=OPENAI_MODEL,
            instructions=SYSTEM_PROMPT,
            input=input_items,
            tools=_tools_openai(),
        )

        function_calls = [item for item in response.output if item.type == "function_call"]

        if not function_calls:
            texto = (response.output_text or "").strip()
            return {"reply": texto or "No tengo una respuesta para eso.", "chart": chart}

        input_items += response.output

        for call in function_calls:
            name = call.name
            try:
                tool_input = json.loads(call.arguments or "{}")
            except json.JSONDecodeError:
                tool_input = {}

            if name == CHART_TOOL_NAME:
                chart = tool_input
                result_content = "Grafica generada y mostrada al usuario en el dashboard."
            else:
                try:
                    result_content = execute_data_tool(name, tool_input, db)
                except Exception as err:  # noqa: BLE001 - se lo devolvemos al modelo como error de tool
                    logger.exception("Fallo ejecutando la tool %s", name)
                    result_content = f"Error ejecutando {name}: {err}"

            input_items.append({"type": "function_call_output", "call_id": call.call_id, "output": result_content})

    return {
        "reply": "No pude terminar de consultar los datos para responder eso. "
                 "¿Puedes reformular la pregunta de forma mas especifica?",
        "chart": chart,
    }


EXPLICACION_SYSTEM_PROMPT = """Eres Pío Docs, el asistente de PioDocsAI. Tu \
tarea aqui es explicar UNA prediccion que ya hizo el modelo de clasificacion \
(un bosque aleatorio entrenado sobre el consolidado academico 2020-2025 del \
Colegio Franciscano Pio XII) a partir de los datos reales que te da el sistema.

Reglas:
- Usa exclusivamente los numeros que se te dan; no inventes datos ni menciones \
otras materias o periodos que no esten en el contexto.
- La descripcion debe citar los numeros concretos (notas, promedio, tendencia) \
que explican el nivel de riesgo, en 3-5 frases, tono profesional y empatico \
(nunca alarmista: esto lo va a leer un docente u orientador, no el estudiante).
- Las recomendaciones deben ser especificas a este caso (que variable pesa mas: \
una nota puntual baja, una tendencia a la baja, o que el resto de materias \
tambien va mal), no genericas, y accionables por un docente o el area de \
orientacion en las proximas semanas.
- Si viene 'tema_del_curriculo' (el tema de la malla curricular para esta \
materia y grado, a veces por periodo), usalo para que las recomendaciones \
sean sobre el contenido concreto (ej. reforzar ese tema puntual) en vez de \
genericas. Si no viene, no lo menciones ni inventes un tema.
- Responde siempre en español."""


def explicar_prediccion(db: Session, anio: str, cod_estudiante: int, materia: str) -> dict:
    """Devuelve {'descripcion': str, 'recomendaciones': list[str]} para UNA
    prediccion ya calculada (una fila de risk_alerts), generadas por el modelo
    a partir de los datos reales de esa fila — no de todo el dataset."""
    alerta = db.execute(
        select(RiskAlert).where(
            RiskAlert.anio == anio,
            RiskAlert.cod_estudiante == cod_estudiante,
            RiskAlert.materia == materia,
        )
    ).scalar_one_or_none()
    if alerta is None:
        raise AssistantError("No hay una predicción calculada para ese estudiante en esa materia.")

    contexto = {
        "anio": alerta.anio, "curso": alerta.curso, "seccion": alerta.seccion,
        "materia": alerta.materia, "area": alerta.area,
        "nota_periodo_1": alerta.valor_p1, "nota_periodo_2": alerta.valor_p2, "nota_periodo_3": alerta.valor_p3,
        "promedio_en_la_materia": round(alerta.promedio_propio, 2),
        "nota_minima_en_la_materia": round(alerta.minimo_propio, 2),
        "tendencia_periodo1_a_3": round(alerta.tendencia, 2),
        "promedio_en_sus_otras_materias": round(alerta.promedio_otras_materias, 2),
        "periodos_ya_reprobados_en_esta_materia": alerta.veces_no_aprobado,
        "probabilidad_de_reprobar_estimada_por_el_modelo": round(alerta.probabilidad_riesgo * 100, 1),
        "nivel_de_riesgo": alerta.nivel_riesgo,
        "tema_del_curriculo": obtener_tema_materia(alerta.materia, alerta.curso),
    }

    client = _client()
    response = _create(
        client,
        model=OPENAI_MODEL,
        instructions=EXPLICACION_SYSTEM_PROMPT,
        input=[{
            "role": "user",
            "content": "Estos son los datos reales de la prediccion (no inventes otros):\n"
                       + json.dumps(contexto, ensure_ascii=False, indent=2),
        }],
        text={
            "format": {
                "type": "json_schema",
                "name": "explicacion_prediccion",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "descripcion": {"type": "string"},
                        "recomendaciones": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 5},
                    },
                    "required": ["descripcion", "recomendaciones"],
                    "additionalProperties": False,
                },
            },
        },
    )

    return json.loads(response.output_text)


EXPLICACION_MATERIA_SYSTEM_PROMPT = """Eres Pío Docs, el asistente de PioDocsAI. Tu \
tarea aqui es explicar el patron de riesgo de UNA MATERIA a nivel institucional \
(agregando a todos los estudiantes evaluados en ella, no un solo caso), a partir \
de datos reales que te da el sistema: el % de riesgo agregado y el desglose por \
grado.

Reglas:
- Usa exclusivamente los numeros que se te dan; no inventes otras materias, \
grados o cifras.
- Compara los grados entre si: si el riesgo esta concentrado en 1-2 grados \
(muy por encima del resto), dilo explicitamente y recomienda una estrategia \
puntual en esos grados (ej. revisar al docente o la metodologia de ese grado \
especifico). Si esta repartido de forma pareja entre todos los grados, dilo y \
recomienda una estrategia transversal (ej. revisar el plan de area completo, \
la malla curricular o la formacion docente en la materia, no solo un grado).
- Cada grado puede traer 'tema_del_curriculo' (el o los temas de la malla \
curricular para ese grado, a veces desglosados por periodo). Cuando este \
presente en los grados de mayor riesgo, cita el tema concreto en la \
descripcion y usalo para hacer las recomendaciones mas especificas (que \
contenido revisar, no solo "la metodologia"). Cuando sea null, no lo \
menciones ni inventes un tema.
- Publico: coordinacion academica y jefes de area, no un estudiante ni su \
familia. Tono profesional, basado en datos, nunca alarmista.
- Las recomendaciones deben ser accionables por coordinacion en las proximas \
semanas (3-5 frases de descripcion + 3-5 recomendaciones).
- Responde siempre en español."""


def explicar_materia(db: Session, materia: str, anio: str | None = None) -> dict:
    """Devuelve {'descripcion': str, 'recomendaciones': list[str]} para UNA \
    materia agregada (todos los grados), a partir de get_materia_detalle — \
    para el boton 'Generar estrategia' de la fila de materia en el dashboard."""
    detalle = get_materia_detalle(db, materia, anio)
    if detalle is None:
        raise AssistantError("No hay datos de riesgo para esa materia.")

    client = _client()
    response = _create(
        client,
        model=OPENAI_MODEL,
        instructions=EXPLICACION_MATERIA_SYSTEM_PROMPT,
        input=[{
            "role": "user",
            "content": "Estos son los datos reales agregados de la materia (no inventes otros):\n"
                       + json.dumps(detalle, ensure_ascii=False, indent=2),
        }],
        text={
            "format": {
                "type": "json_schema",
                "name": "explicacion_materia",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "descripcion": {"type": "string"},
                        "recomendaciones": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 5},
                    },
                    "required": ["descripcion", "recomendaciones"],
                    "additionalProperties": False,
                },
            },
        },
    )

    return json.loads(response.output_text)
