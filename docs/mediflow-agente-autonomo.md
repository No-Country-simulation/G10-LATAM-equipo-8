# 🏥 MediFlow – Agente Autónomo para Triaje, Extracción y Enrutamiento de Documentos Clínicos

**Programa ONE · Grupo 10** — Hackathon ONE G10 — Oracle Next Education & Alura
**Proyecto 2**

---

## Mapeo de Formaciones ONE (Grupo 10)

- **Formaciones Indispensables:** Ingeniería de Agentes y Automatización con IA, y Oracle Cloud Infrastructure (OCI).
- **Formaciones de Refuerzo:** Desarrollo y Orquestación con IA Generativa.
- **Núcleo Técnico:** Grafo de decisión condicional para clasificación, extracción precisa de datos clínicos y manejo de ambigüedades/urgencias (Human-in-the-Loop), automatización de flujos y segregación de archivos en OCI Object Storage en la capa Always Free.

---

## Sector empresarial

HealthTech / Gestión Hospitalaria / Aseguradoras de Salud & Clínicas Médicas — Soluciones tecnológicas aplicadas al procesamiento, auditoría y triaje de flujos documentales en salud. El sector gestiona diariamente miles de documentos heterogéneos (informes médicos, recetas, órdenes de autorización de procedimientos, solicitudes de estudios complementarios y reportes quirúrgicos), en los cuales la precisión de la información y la agilidad en la derivación son determinantes para la seguridad del paciente y la eficiencia operativa.

---

## Descripción del proyecto

Desarrollar un agente inteligente y autónomo capaz de recibir documentos clínicos y administrativos en múltiples formatos (archivos PDF digitalizados, imágenes de estudios/recetas o texto), clasificarlos automáticamente, extraer entidades y datos clínicos esenciales con altísima precisión y enrutarlos al destino correcto sin necesidad de intervención humana manual para los casos estándar.

El procesamiento documental en el área de la salud exige un rigor absoluto. La solución MediFlow debe resolver desafíos complejos de visión multimodal, extracción estructurada de datos clínicos, lógica de decisión condicional y manejo de casos ambiguos o urgentes (como datos ilegibles, prescripciones de alto riesgo o solicitudes de urgencia).

**La aplicación deberá:**

1. Ingerir el documento clínico en los formatos soportados (PDF / Imagen / JSON).
2. Identificar y clasificar la categoría del documento (ej.: Receta Médica, Informe de Estudio de Diagnóstico por Imágenes/Laboratorio, Orden de Solicitud de Procedimiento, Epicrisis / Informe de Alta, Certificado Médico).
3. Extraer datos clínicos y administrativos esenciales (identificación del paciente, datos del profesional/matrícula, hipótesis diagnóstica/CIE-10, medicamentos, dosis, urgencia, estudios solicitados) utilizando LLMs a elección del equipo (Google Gemini, OpenAI, Claude u otros modelos).
4. Evaluar consistencia, potenciales conflictos y puntaje de confianza de la extracción.
5. Ejecutar la lógica de enrutamiento automatizado hacia el departamento correspondiente (ej.: Cola de Urgencias Médicas, Auditoría de Autorizaciones, Farmacia Hospitalaria, Historia Clínica Electrónica o Cola de Revisión Humana en caso de ambigüedad).

Los resultados y el historial de triaje deberán ponerse a disposición en formato JSON estructurado, y la persistencia de los documentos y decisiones debe integrarse a OCI Object Storage (capa Always Free).

---

## Necesidad del cliente (explicación no técnica)

Hospitales, laboratorios y aseguradoras de salud pierden miles de horas con equipos administrativos leyendo manualmente informes y recetas para transcribir datos en sistemas heredados. Además de lento y costoso, este proceso manual está sujeto a errores graves de tipeo y demoras en la atención a pacientes con cuadros de urgencia.

**La solución debe permitir:**

- Recibir documentos en cualquier formato (PDFs digitales o escaneados).
- Comprender de inmediato el tipo de documento y su nivel de prioridad clínica.
- Extraer con precisión quirúrgica los datos vitales (medicamentos, diagnósticos, médicos solicitantes).
- Identificar casos ambiguos o datos faltantes, alertando de inmediato a un auditor humano (Human-in-the-Loop).
- Derivar los datos automáticamente hacia los sistemas de destino, acelerando autorizaciones y atenciones.

---

## Validación de mercado

El mercado de automatización en salud (HealthTech Document Automation & Clinical NLP) es uno de los sectores que más atrae inversiones en IA:

- Las fallas y demoras en autorizaciones de estudios y medicamentos generan pérdidas millonarias en débitos hospitalarios e impactan directamente en el tratamiento de los pacientes.
- Las soluciones basadas en agentes autónomos con LLMs multimodales superan ampliamente a los OCRs tradicionales, ya que son capaces de interpretar el contexto clínico, validar consistencia y tomar decisiones de enrutamiento inteligentes.
- La capacidad de operar con flujos de Human-in-the-Loop ofrece la seguridad regulatoria necesaria para su adopción inmediata en entornos de salud.

---

## Objetivo del Hackathon

Desarrollar un MVP funcional de agente autónomo capaz de:

1. Recibir documentos clínicos y administrativos en PDF, imagen o texto.
2. Utilizar LLMs multimodales (Google Gemini, OpenAI GPT-4o, Claude o equivalentes) para interpretar el documento y extraer entidades estructuradas.
3. Implementar un grafo de decisión con nodos condicionales (vía LangGraph, n8n o código Python equivalente) para clasificar el documento, evaluar la confianza y enrutarlo al destino correcto.
4. Manejar casos ambiguos, inconsistentes o urgentes con reglas de contingencia y alertas de revisión humana.
5. Persistir los documentos en buckets organizados en OCI Object Storage (capa Always Free).
6. Disponer de una interfaz de triaje o API REST para la visualización de los flujos.

---

## Resultados esperados

### 1. IA Multimodal, Agentes & Lógica de Decisión

Notebook o módulos que contengan:

- Pipeline de ingestión y procesamiento de documentos clínicos (PDFs/Imágenes).
- Extracción de entidades estructuradas utilizando LLMs/Multimodalidad.
- Modelado del flujo de decisión como un Grafo de Agentes (LangGraph), Workflow n8n con nodos de IA o pipeline condicional en Python con bifurcaciones (Conditional Edges / nodos IF).
- Mecanismo de cálculo de score de confianza y detección de urgencias médicas.

### 2. Automatización de Flujos & Back-End

Aplicación en Python (Streamlit / Gradio / FastAPI / Flask) o flujo en n8n que contenga:

- Endpoint o pantalla para envío de documentos clínicos.
- Ejecución del flujo de triaje y enrutamiento automatizado.
- Manejo de excepciones y fallback para revisión humana cuando el score de confianza sea bajo.
- Estructuración de datos clínicos en formato JSON validado con Pydantic o JSON Schema.

### 3. Oracle Cloud Infrastructure (OCI) — Capa Always Free

- **Requisito Obligatorio (MVP):** OCI Object Storage — Buckets segregados para el almacenamiento de los documentos recibidos y organización por estado (ej.: `/recibidos`, `/procesados`, `/auditoria_humana`).
- **Recurso Opcional / Diferencial:** OCI Compute Instance ("Despliegue Completo en la Nube") — Alojamiento de la aplicación o contenedor n8n en una máquina virtual Always Free de OCI.
- **Aviso Importante ONE:** En respeto a la naturaleza social y 100% gratuita del programa ONE, utilice exclusivamente los recursos Always Free de OCI.

### 4. Documentación & Demostración

- Repositorio Git con commits bien documentados.
- README.md con la arquitectura, diagrama del flujo de decisión del agente e instrucciones de ejecución.
- Demostración práctica cubriendo al menos tres casos de prueba: (1) Flujo estándar aprobado, (2) Caso con prioridad de urgencia médica y (3) Caso ambiguo derivado a auditoría humana.

---

## Funcionalidades obligatorias (MVP)

### Endpoint / Flujo: Procesamiento y Triaje Clínico

El sistema debe recibir un documento clínico, procesarlo mediante el agente y retornar el diagnóstico de triaje con los datos extraídos y la decisión de enrutamiento.

**Ejemplo de Solicitud (Entrada):**

```json
{
  "documento_id": "DOC-CLIN-2026-8942",
  "tipo_archivo": "PDF",
  "documento_texto": "HOSPITAL SANTA LUCIA - INFORME DE ESTUDIO RADIOLOGICO. Paciente: Carlos Eduardo Mendes, 52 anos. Medico Solicitante: Dra. Renata Silveira MP 145892. Estudio: Tomografia de Torax con contraste. Indicacion: Sospecha de embolia pulmonar aguda, disnea subita. Hallazgos: Defecto de llenado en arteria pulmonar principal derecha compatible con TEP agudo. CONCLUSION: Cuadro compatible con Tromboembolismo Pulmonar Agudo. Se sugiere correlacion clinica urgente.",
  "canal_origen": "Guardia_Emergencias"
}
```

**Ejemplo de Respuesta (Salida Estructurada):**

```json
{
  "status": "procesado",
  "documento_id": "DOC-CLIN-2026-8942",
  "clasificacion": {
    "tipo_documento": "Informe de Estudio por Imagenes",
    "especialidad": "Radiologia / Neumonologia",
    "nivel_prioridad": "Urgente",
    "score_confianza_clasificacion": 0.99
  },
  "datos_extraidos": {
    "paciente": {
      "nome": "Carlos Eduardo Mendes",
      "edad": 52
    },
    "medico_solicitante": {
      "nombre": "Dra. Renata Silveira",
      "matricula": "145892"
    },
    "estudio_realizado": "Tomografia de Torax con contraste",
    "diagnostico_principal": "Tromboembolismo Pulmonar Agudo (TEP)",
    "cie10_sugerido": "I26.9"
  },
  "decision_enrutamiento": {
    "destino_principal": "Cola_Emergencia_Medica",
    "requiere_auditoria_humana": false,
    "justificacion_enrutamiento": "Hallazgo critico de alta gravedad (TEP agudo) detectado en paciente sintomatico.",
    "notificacion_generada": {
      "canal": "Alerta_Guardia_Medica",
      "mensaje": "ALERTA URGENTE: Informe critico de TEP Agudo para el paciente Carlos Eduardo Mendes en Guardia de Emergencias."
    }
  },
  "almacenamiento_oci": {
    "bucket": "mediflow-documentos-clinicos",
    "ruta_objeto": "procesados/urgentes/DOC-CLIN-2026-8942.json",
    "status_backup": "exito"
  }
}
```

---

## Requisitos mínimos (Checklist de Evaluación)

- [ ] Ingestión funcional de documentos clínicos en texto o PDF/imagen.
- [ ] Clasificación automática del tipo de documento clínico con LLMs/Multimodalidad (Google Gemini, OpenAI, Claude o equivalentes).
- [ ] Extracción precisa de datos clínicos esenciales en formato estructurado (JSON).
- [ ] Implementación de lógica de decisión condicional con manejo de casos ambiguos o urgentes (LangGraph, n8n o código Python).
- [ ] Integración activa con OCI Object Storage (capa Always Free) para la segregación y almacenamiento de los documentos.
- [ ] Demostración de un mínimo de 3 escenarios distintos (Rutina, Urgencia y Ambigüedad/Error derivado a revisión humana).
- [ ] Documentación completa en el repositorio GitHub con diagrama del flujo del agente.

---

## Recursos opcionales (Diferenciales)

- **Flujo Clínico Personalizable por el Usuario:** Módulo o interfaz que permita al gestor hospitalario configurar reglas de triaje personalizadas, nuevos destinos de enrutamiento y umbrales de urgencia sin modificar el código fuente.
- **Despliegue Completo en la Nube (OCI Compute):** Alojamiento de la aplicación o contenedor n8n en una máquina virtual Always Free de OCI con acceso público.
- **OCR y Visión Computacional Multimodal:** Lectura directa de fotos de recetas manuscritas o informes escaneados.
- **Panel de Auditoría Human-in-the-Loop en Streamlit:** Interfaz visual donde auditores clínicos puedan visualizar documentos con baja confianza y aprobar/rechazar la extracción con un clic.
- **Alertas en Tiempo Real:** Workflow en n8n disparando alertas en Slack/Email para los equipos de guardia.

---

## Directrices técnicas para los estudiantes

### IA Generativa & Agentes Autónomos

- **Modelos de Lenguaje:** Los equipos pueden utilizar libremente Google Gemini, OpenAI (ChatGPT / GPT-4o), Anthropic (Claude) u otras LLMs (Gemini es la herramienta enseñada en el curso, pero cualquier LLM equivalente está permitida).
- **Orquestación de Agentes:** Se sugiere el uso de LangGraph para grafos de decisión o n8n con nodos de IA; arquitecturas en Python puro u otros frameworks de agentes (ej.: CrewAI) también son totalmente aceptadas.
- **Validación de Datos:** Se recomienda Pydantic para validar tipados y consistencia clínica.

### Automatización & Interfaz

- **Tecnologías Sugeridas:** n8n para automatizaciones de flujo y Streamlit o Gradio para pantallas de triaje; soluciones en Node.js o frameworks web equivalentes son permitidas.

### Oracle Cloud Infrastructure (OCI)

- **Object Storage (Obligatorio):** Cree buckets Always Free para almacenar y organizar los documentos por estado.
- **Atención a los Costos:** Mantenga la utilización restringida a los recursos de la capa Always Free.
