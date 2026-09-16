"""Herramientas que Claude puede llamar para responder preguntas sobre datos
reales (nunca inventados) y para pedir que el dashboard dibuje una grafica.
Las tres primeras solo leen de la base de datos, reusando exactamente las
mismas funciones que usan los endpoints del dashboard (app/services.py) para
que el asistente nunca muestre un numero distinto al que ve el usuario en
pantalla."""
from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.services import get_alerts, get_dashboard_summary, get_student_detail, get_subjects_summary

TOOLS = [
    {
        "name": "consultar_resumen_riesgo",
        "description": (
            "Resumen institucional de riesgo academico para un año lectivo: "
            "estudiantes evaluados, cuantos en riesgo alto/medio/bajo, y las "
            "materias con mayor porcentaje de riesgo. Usala para preguntas "
            "generales sobre el estado del colegio o de un año en particular."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "anio": {
                    "type": "string",
                    "description": "Año lectivo 'AAAA-AAAA' (ej. '2024-2025'). "
                                    "Si se omite, se usa el año mas reciente disponible.",
                }
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "consultar_alertas",
        "description": (
            "Lista alertas de riesgo (estudiante + materia) de un año, "
            "opcionalmente filtradas por nivel de riesgo o por texto de "
            "materia/codigo de estudiante. Usala para preguntas sobre "
            "estudiantes o materias especificas en riesgo."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "anio": {"type": "string", "description": "Año lectivo 'AAAA-AAAA'."},
                "riesgo": {"type": "string", "enum": ["Todos", "Alto", "Medio", "Bajo"]},
                "busqueda": {"type": "string", "description": "Texto para filtrar por materia o codigo de estudiante."},
                "limite": {"type": "integer", "minimum": 1, "maximum": 100},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "consultar_materias",
        "description": (
            "Porcentaje de estudiantes en riesgo (alto+medio) por materia en "
            "un año, ordenado de mayor a menor. Usala para comparar materias entre si."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"anio": {"type": "string", "description": "Año lectivo 'AAAA-AAAA'."}},
            "additionalProperties": False,
        },
    },
    {
        "name": "consultar_estudiante",
        "description": (
            "Detalle academico de un estudiante especifico: notas por periodo "
            "en cada materia y su nivel de riesgo. Requiere el codigo exacto "
            "del estudiante (aparece en la ficha o en la tabla de alertas, ej. 'EST-16241404' -> 16241404)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "anio": {"type": "string", "description": "Año lectivo 'AAAA-AAAA'."},
                "codigo_estudiante": {"type": "integer"},
            },
            "required": ["anio", "codigo_estudiante"],
            "additionalProperties": False,
        },
    },
    {
        "name": "generar_grafica",
        "description": (
            "Dibuja una grafica dinamica en el dashboard del usuario con datos "
            "que YA consultaste con las otras herramientas. Llamala solo despues "
            "de tener numeros reales — nunca inventes valores. 'tipo' puede ser:\n"
            "- 'barra': comparar valores entre categorias (ej. riesgo por materia).\n"
            "- 'linea': evolucion en el tiempo (ej. notas por periodo).\n"
            "- 'dona' o 'pastel': distribucion de partes de un todo (ej. Alto/Medio/"
            "Bajo). Son el mismo dato; 'dona' deja un hueco en el centro y 'pastel' "
            "es el circulo completo — usa la que pida el usuario, o 'dona' por defecto.\n"
            "- 'dispersion': relacion entre DOS variables numericas de un mismo grupo "
            "(ej. promedio general vs. probabilidad de riesgo de cada estudiante, para "
            "ver si van juntas). Cada serie lleva 'valores' (eje X) y 'valores_y' (eje "
            "Y), del mismo tamaño; usa 'eje_x' y 'eje_y' para nombrar los ejes."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "tipo": {"type": "string", "enum": ["barra", "linea", "dona", "pastel", "dispersion"]},
                "titulo": {"type": "string"},
                "etiquetas": {
                    "type": "array", "items": {"type": "string"},
                    "description": "Categorias del eje X, o segmentos si es 'dona'/'pastel'. "
                                    "En 'dispersion' se puede dejar vacio.",
                },
                "eje_x": {"type": "string", "description": "Nombre del eje X (sobre todo para 'dispersion')."},
                "eje_y": {"type": "string", "description": "Nombre del eje Y (sobre todo para 'dispersion')."},
                "series": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "nombre": {"type": "string"},
                            "valores": {
                                "type": "array", "items": {"type": "number"},
                                "description": "Valores por categoria, o coordenadas X en 'dispersion'.",
                            },
                            "valores_y": {
                                "type": "array", "items": {"type": "number"},
                                "description": "Solo 'dispersion': coordenadas Y, mismo tamaño que 'valores'.",
                            },
                        },
                        "required": ["nombre", "valores"],
                        "additionalProperties": False,
                    },
                },
            },
            "required": ["tipo", "titulo", "etiquetas", "series"],
            "additionalProperties": False,
        },
    },
]

# Nombre de la tool especial cuyo "resultado" no es una consulta a la base de
# datos sino una señal para el backend: capturar su input como la grafica a
# devolver al frontend.
CHART_TOOL_NAME = "generar_grafica"


def execute_data_tool(name: str, tool_input: dict, db: Session) -> str:
    """Ejecuta una tool de consulta (todas menos generar_grafica) y devuelve
    el resultado como JSON en texto, listo para mandar de vuelta a Claude
    como tool_result."""
    if name == "consultar_resumen_riesgo":
        data = get_dashboard_summary(db, tool_input.get("anio"))
    elif name == "consultar_alertas":
        total, items = get_alerts(
            db, anio=tool_input.get("anio"), risk=tool_input.get("riesgo", "Todos"),
            search=tool_input.get("busqueda", ""), limit=tool_input.get("limite", 20),
        )
        data = {"total": total, "items": items}
    elif name == "consultar_materias":
        data = get_subjects_summary(db, tool_input.get("anio"))
    elif name == "consultar_estudiante":
        detalle = get_student_detail(db, tool_input["anio"], tool_input["codigo_estudiante"])
        data = detalle if detalle is not None else {"error": "No hay registros para ese estudiante en ese año."}
    else:
        return json.dumps({"error": f"Herramienta desconocida: {name}"})

    return json.dumps(data, ensure_ascii=False, default=str)
