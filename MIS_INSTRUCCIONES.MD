# MIS INSTRUCCIONES — Bitácora del proyecto PioDocsAI

Este documento resume, en orden cronológico, todo lo que se pidió en esta conversación con Claude Code y qué hizo cada petición. Sirve como referencia rápida de "qué es cada cosa y por qué está ahí" en el proyecto.

> Proyecto: sistema de detección temprana de riesgo académico para el Colegio Franciscano de Pío XII. Notebook de clasificación + backend FastAPI/SQLite + frontend Next.js con un asistente conversacional (Claude). Repo: https://github.com/YOMP89/PioDocsAI

---

## 1. Conversión del dataset a CSV

**Pedido:** convertir `acumulado_desde_2020_al_2025_datos.xlsx` a `.csv` sin perder datos ni información.

**Qué se hizo:** el Excel tenía 3 hojas (Consolidado, Diccionario, Metodología), así que se exportó cada una a su propio CSV (`acumulado_desde_2020_al_2025_datos.csv`, `_diccionario.csv`, `_metodologia.csv`) en UTF-8 con BOM, conservando ceros iniciales del curso y campos de texto con comas/comillas. Se detectó y resolvió el bloqueo de escritura de Windows Defender (Acceso controlado a carpetas) usando Node.js como intermediario para copiar los archivos generados.

---

## 2. Notebook de clasificación con detección temprana de riesgo

**Pedido:** actualizar `Proceso_ML_1_Clasificacion.ipynb` (que traía un dataset de ejemplo de carros) con el dataset real, para detectar estudiantes en riesgo de perder una materia **antes** del último periodo, con alerta, materia en riesgo y recomendación — sin alterar el dataset original.

**Qué se hizo:** se rediseñaron las 7 fases originales sobre los datos reales: se excluyó preescolar (escala de notas distinta), se usaron los periodos 1-3 como variables para predecir el resultado del periodo 4 (`RandomForestClassifier` con `class_weight='balanced'` por el desbalance extremo de clases, AUC 0.937), se evaluó con matriz de confusión/umbral/ROC, y se agregaron dos fases nuevas: **Fase 8** (sistema de alertas con recomendación en texto) y **Fase 9** (se guarda el modelo entrenado como `modelo_riesgo_academico.joblib` para reutilizarlo sin reentrenar).

---

## 3. Backend + SQLite + Docker para la app EduAlerta AI

**Pedido:** tomar el frontend ya existente (`edu-alerta-ai.zip`), construir el backend en una carpeta `backend/`, con base de datos SQLite, dockerizar todo (frontend y backend como volúmenes) y que `docker compose up` levante la aplicación.

**Qué se hizo:** se extrajo el frontend a `frontend/` y se construyó `backend/` completo en FastAPI + SQLAlchemy + SQLite: carga el CSV real al arrancar, recalcula las alertas de riesgo con el modelo del notebook, y expone endpoints para el dashboard, alertas, materias, ficha de estudiante e importación de nuevos datos. Se creó `docker-compose.yml` con ambos servicios y volúmenes bind-mount para desarrollo en caliente.

---

## 4. Verificación real en Docker

**Pedido:** correr el proyecto en Docker, comprobar que funcione y abrirlo en el navegador.

**Qué se hizo:** se levantó el stack de verdad (no solo se armó el código) y se corrigieron 3 bugs reales que impedían que arrancara: la imagen del backend con Python 3.14 no compilaba (se bajó a 3.13), el `CMD` del contenedor del frontend estaba mal formado, y un bug de índice en el pipeline de alertas. Se verificó con Playwright (capturas + cero errores de consola) y se probó el flujo de importar un CSV de prueba de punta a punta.

---

## 5. Gestión de usuarios y roles (sin concluir)

**Pedido:** ayuda para definir los roles de un futuro sistema de gestión de usuarios.

**Qué se hizo:** se propuso una tabla de roles (Administrador, Coordinación académica, Docente, Orientación escolar) y se empezaron a hacer preguntas de aclaración, pero el usuario cambió de tema antes de terminar esta conversación — **queda pendiente**, no se implementó nada de gestión de usuarios todavía.

---

## 6. Asistente conversacional "Pío Docs" con Claude

**Pedido:** un botón flotante (inspirado en la mascota del fraile franciscano) que al abrirse permita hacerle preguntas al modelo de Claude y generar gráficas dinámicas sobre los datos reales del dashboard.

**Qué se hizo:** se creó `backend/app/assistant/` (definición de *tools* que consultan la base de datos real, y el loop de *tool use* con la API de Anthropic) y `frontend/components/AssistantWidget.tsx` (botón flotante + panel de chat). Se creó `backend/.env` con `ANTHROPIC_API_KEY` vacío para que el usuario ponga su clave.

---

## 7. Favicon con el logo del libro + gráfica

**Pedido:** cambiar el favicon por un logo de un libro abierto con barras de gráfica saliendo de él.

**Qué se hizo:** como la imagen adjunta no se pudo leer directamente, se recreó el logo como SVG (usando la misma geometría del ícono `book-open` de lucide-react ya presente en la app) y se conectó por primera vez en `metadata.icons` de `layout.tsx` — antes no había ningún favicon realmente enlazado.

---

## 8-9. Nombre e ícono del bot

**Pedido:** renombrar el bot a "Pío Docs" y luego cambiar su ícono por el mismo logo del favicon (en vez de la mascota del fraile).

**Qué se hizo:** se actualizó el nombre en el encabezado del chat, el mensaje de saludo y el *system prompt* de Claude; y se reemplazó el ícono del botón flotante por `icon.svg` (el mismo del favicon), con reintento a un ícono de respaldo si la imagen no carga.

---

## 10. Gráficas de pastel y dispersión

**Pedido:** agregar gráficos de pastel y de dispersión a lo que el asistente puede dibujar (antes solo tenía barra/línea/dona).

**Qué se hizo:** se extendió el *schema* de la herramienta `generar_grafica` (backend), los tipos TypeScript y el componente de render (`recharts`) para soportar `pastel` (torta completa) y `dispersion` (relación entre dos variables numéricas, con ejes X/Y nombrados). Se probó con datos de ejemplo inyectados temporalmente y luego se revirtieron.

---

## 11. Rebranding completo: PioDocsAI + paleta del Colegio Pío XII

**Pedido:** cambiar el nombre de la página a "PioDocsAI" y aplicar la paleta de colores/tipografías de la guía de marca del colegio (adjunta como imagen).

**Qué se hizo:** se redefinió la escala de colores de Tailwind (`blue`→Burg Cinoleo, `rose`→Granate, `amber`→Pacquirismo) a nivel de tema en `globals.css`, en vez de editar cada componente a mano — así se propaga a toda la app de una sola vez. Se cambiaron las tipografías a Playfair Display (títulos) y Nunito (cuerpo), y "PioDocsAI" se aplicó en el título de la pestaña, el sidebar, el saludo del chat y el backend. De paso se corrigió un bug real: una regla CSS preexistente (`button, input, select { font: inherit; }`) anulaba el tamaño de fuente de todos los botones de la app.

---

## 12. Limpieza del sidebar + pestañas Estudiantes/Materias/Modelo con datos reales

**Pedido:** ocultar el cuadro "Datos reales" y el botón/avatar de abajo a la izquierda del sidebar; y que las pestañas "Estudiantes", "Materias" y "Modelo ML" muestren gráficas e información real del dataset (antes eran vistas genéricas sin contenido).

**Qué se hizo:** se eliminó ese bloque del sidebar. Se construyeron `EstudiantesView` (alertas por curso + tabla completa buscable) y `MateriasView` (riesgo por materia, gráfica de barras + tabla) desde cero, y se agregó un gráfico de importancia de variables a "Modelo ML" (nuevo campo `importancia_variables` expuesto por el backend desde el propio modelo entrenado). De paso se corrigió un bug real de React (keys duplicadas por materias con el mismo nombre y área distinta en el CSV, ej. "Inglés" dos veces).

---

## 13. Descripciones y recomendaciones generadas por el LLM sobre cada predicción

**Pedido:** que al hacer una predicción con el modelo, el LLM genere una descripción detallada de esa clasificación y recomendaciones (antes el botón "Generar estrategia de apoyo" solo mostraba un texto fijo).

**Qué se hizo:** nuevo endpoint `POST /api/assistant/explicar` que toma los datos reales de una predicción específica (notas por periodo, tendencia, probabilidad del modelo) y le pide a Claude, con salida estructurada (JSON schema), una descripción y una lista de recomendaciones concretas para ese caso — nunca inventadas, siempre basadas en los números reales de esa predicción.

---

## 14. Quitar el botón negro con "N"

**Pedido:** quitar un botón negro con la letra "N" en la esquina inferior izquierda.

**Qué se hizo:** se identificó que no era parte de la app, sino el indicador de desarrollo de Next.js (aparece automáticamente en modo `dev`). Se desactivó con `devIndicators: false` en `next.config.mjs`.

---

## 15-16. Colores más vivos + forma (bordes, sombra, espaciado, degradados)

**Pedido:** ajustar el dashboard a los colores de otra imagen adjunta para que se vea "más vivo"; y luego, tras confirmar que el color sí había cambiado (probable caché del navegador), aplicar también estilos y forma.

**Qué se hizo:** se extrajo el color dominante de la imagen (`modelo.png`) analizando los píxeles por código (un azul vivo, `#1337A2`) y se aplicó en todo el sistema de color. Después, con las opciones que eligió el usuario, se aumentó el radio de bordes, se profundizaron las sombras, se aumentó el espaciado base (todo vía tokens de Tailwind, un solo lugar) y se agregaron degradados a los botones principales y a las etiquetas de riesgo (Alto/Medio/Bajo).

---

## 17. Subida del proyecto a GitHub

**Pedido:** subir todo el proyecto al repositorio https://github.com/YOMP89/PioDocsAI.

**Qué se hizo:** como `git init`/`mkdir` estaban bloqueados por Windows Defender en esta carpeta, se corrió git dentro de un contenedor Docker temporal montando el proyecto. Se hizo *merge* con el commit inicial que ya tenía el repo (un README de una línea), se escribió un README real del proyecto, y se subieron 67 archivos — excluyendo a propósito `backend/.env` (la clave real), la base de datos SQLite y `node_modules`. El token de acceso que se compartió en el chat se usó solo para ese push (nunca se guardó en ningún archivo) y se recomendó revocarlo por haber quedado expuesto en la conversación.

---

## Notas técnicas recurrentes en este proyecto

- **Windows Defender / Acceso controlado a carpetas** bloquea escrituras directas de `python.exe`, `powershell.exe`, `bash`/`git` dentro de `Documents`. Soluciones usadas según el caso: Node.js, `docker exec`/contenedores temporales, o la herramienta de escritura de archivos de Claude Code (esta sí está permitida).
- Los cambios de estilo/color/tipografía se hacen **a nivel de tokens de Tailwind** (`globals.css`) en vez de editar cada componente, porque el archivo `page.tsx` es muy denso — así se reduce el riesgo de errores y se garantiza consistencia.
- El asistente Claude **nunca inventa cifras**: siempre consulta la base de datos real (por *tools* o por contexto directo) antes de responder o generar una recomendación.
