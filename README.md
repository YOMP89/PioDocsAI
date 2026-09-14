# PioDocsAI

Sistema de detección temprana de riesgo académico para el **Colegio Franciscano de Pío XII**, desarrollado como proyecto de Maestría. Incluye el proceso de ciencia de datos completo (notebook), un backend con la API y el modelo entrenado, y un frontend con dashboard y un asistente conversacional impulsado por Claude.

## Contenido

- **`Proceso_ML_1_Clasificacion.ipynb`** — notebook de clasificación: carga y limpieza del consolidado académico, ingeniería de variables, entrenamiento de un Random Forest, evaluación (matriz de confusión, ROC/AUC, umbral) y un sistema de alertas de riesgo temprano.
- **`acumulado_desde_2020_al_2025_datos.csv`** — consolidado académico 2020-2025 (formato largo: una fila por estudiante, materia y periodo). Ver también el `.xlsx` de origen y las hojas `_diccionario.csv` / `_metodologia.csv` con el detalle de codificación.
- **`modelo_riesgo_academico.joblib`** — modelo entrenado (bosque aleatorio) más metadata (umbral de alerta, AUC, fecha de entrenamiento).
- **`backend/`** — API en FastAPI + SQLite: sirve el dashboard, recalcula alertas de riesgo con el modelo, permite importar nuevos datos, y expone un asistente conversacional (Claude, con *tool use* sobre los datos reales) que responde preguntas, genera gráficas dinámicas y explica predicciones individuales con recomendaciones.
- **`frontend/`** — dashboard en Next.js: resumen institucional, alertas por estudiante/materia, ficha individual, y el asistente flotante "Pío Docs".
- **`docker-compose.yml`** — levanta todo el stack (`docker compose up`).

## Cómo correrlo

1. Copia `backend/.env.example` a `backend/.env` y agrega tu clave de la [API de Anthropic](https://console.anthropic.com/settings/keys) en `ANTHROPIC_API_KEY` (necesaria solo para el asistente conversacional; el resto del dashboard funciona sin ella).
2. `docker compose up -d --build`
3. Frontend: http://localhost:3001 — Backend (docs de la API): http://localhost:8001/docs

El backend carga el CSV real en una base SQLite y calcula las alertas de riesgo automáticamente la primera vez que arranca (usa el modelo ya entrenado, sin reentrenar).

## Stack

FastAPI · SQLAlchemy · SQLite · pandas/scikit-learn · Next.js 16 · React 19 · Tailwind v4 · Recharts · Anthropic Claude.
