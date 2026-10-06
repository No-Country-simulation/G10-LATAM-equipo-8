# Backend: integración y pruebas funcionales

Fecha: 01/10/2026. Rama: `feature/backend-foundation`, creada desde `develop`.
Se incorporaron `main`, `feat/backend-automatizacion-scaffold` y
`feat/backend/module1`, conservando el historial. La integración permanece en esta
rama de trabajo; no se actualizó `develop` ni `main` con la implementación.

## Fuentes y precedencia

1. `mediflow-agente-autonomo.md`: requisitos obligatorios del reto.
2. `PLAN_FINAL.md`: arquitectura y alcance final propuesto.
3. `plan-equipo.md`: contrato preliminar y organización del equipo.

El instructivo da un ejemplo de triaje, no define todas las rutas.
El plan antiguo dice "sin base de datos"; el plan final adopta PostgreSQL.
Esta etapa usa memoria únicamente para probar HTTP. Para el siguiente incremento se
propone PostgreSQL local para desarrollo y Neon como instancia compartida; OCI seguirá
guardando los documentos. Elegir Neon modifica ADR-11 y debe reflejarse al cerrar esa decisión.

## Endpoints implementados

| Método | Ruta | Resultado |
|---|---|---|
| GET | `/health` | Entorno y proveedores activos |
| POST | `/api/v1/triajes/process-text` | Ingesta JSON con texto; `201` |
| POST | `/api/v1/triajes` | Alias compatible de ingesta de texto |
| POST | `/api/v1/triajes/process-file` | Multipart: `documento_id`, `canal_origen`, `archivo`; `201` |
| POST | `/api/v1/triajes/archivo` | Alias del contrato preliminar |
| GET | `/api/v1/triajes` | Historial paginado; filtros `status` y `destino` |
| GET | `/api/v1/triajes/{documento_id}` | Detalle |
| GET | `/api/v1/triajes/{documento_id}/documento` | Bytes originales para visor |
| GET | `/api/v1/audit/queue` | Solo registros `NEEDS_AUDIT`, paginados |

Errores: `422` entrada inválida, `404` documento inexistente, `409` ID duplicado,
`413` archivo demasiado grande, `415` MIME/firma no soportados.
IDs: letras ASCII, números, guiones y guiones bajos; máximo 100 caracteres.
Texto: no vacío, máximo 100.000 caracteres. Archivos: PDF/PNG/JPEG, máximo 10 MiB.
`tipo_archivo` en ingesta de texto es metadata compatible con el ejemplo, no carga un PDF.

Se preservan las secciones `clasificacion`, `datos_extraidos` y
`decision_enrutamiento`, usando `nombre` en lugar del typo `nome`.
Los estados usan `PROCESSED` y `NEEDS_AUDIT`, como el plan final, y no `procesado`.
Esto debe acordarse con frontend antes de integrarlo a `develop`.
`requiere_auditoria_humana` se deriva del estado. Los destinos expuestos en esta
etapa son historia clínica, emergencia y revisión humana; farmacia y autorizaciones
se incorporarán con las reglas R1–R4 reales.

`almacenamiento_oci=null`, `almacenamiento.proveedor=local`, `modo_ia=simulado`.
Revisión implementada en `POST /api/v1/triajes/{id}/revision` según la asignación del equipo,
con acciones `aprobar`, `corregir_aprobar` y `rechazar`. Consultar eventos con
`GET /api/v1/triajes/{id}/revisiones`. No se agregó un alias `PATCH /review`.
Solo casos pendientes pasan a `APPROVED` o `REJECTED`; score, motivos y archivo original
se conservan. El repositorio aplica estado y evento bajo un bloqueo dentro del proceso.
Persistencia y concurrencia entre procesos siguen pendientes de PostgreSQL.
No se implementaron settings ni voz.

## Secuencia de siguientes incrementos

1. **Ahora:** integración, Python 3.12.14, lockfile, arquitectura mínima y pruebas HTTP
   con fixtures sintéticos. Aceptación: los tres escenarios, validación, consulta,
   originales, filtros y duplicados funcionan sin servicios externos.
2. **Persistencia:** SQLAlchemy/psycopg y Alembic; PostgreSQL local para pruebas de
   integración y conexión configurable a Neon para el equipo. Guardar estados,
   decisiones, referencias al documento y eventos de revisión. Aceptación: historial
   sobrevive al reinicio y las migraciones crean una base vacía correctamente.
3. **Auditoría persistente:** migrar la revisión en memoria ya implementada a PostgreSQL,
   con identidad declarada del revisor,
   historial y bloqueo de fila. Aceptación: dos revisiones concurrentes no sobrescriben
   decisiones y la segunda recibe `409`. La identidad declarada no equivale a autenticación.
4. **IA real por texto:** adaptar funciones reutilizables del prototipo; puertos de
   Gemini, salida estructurada, errores y timeouts; LangGraph stateless para el pipeline.
   Aceptación: caso de rutina real y fallos enviados a auditoría, sin datos inventados.
5. **Fiabilidad y multimodal:** fórmula del score acordada, enums completos, evidencia,
   red flags y segunda opinión; lectura real de PDF/imágenes. Alertar una urgencia no
   autoriza el enrutamiento de un documento pendiente de auditoría.
6. **OCI:** adaptador de Object Storage, prefijos por estado y referencias en PostgreSQL.
   Aceptación: documentos y decisiones se verifican en OCI con los tres escenarios.
7. **Consolidación:** merge directo a `develop` después de validar la entrega,
   sin PRs; nuevas ramas `feature/...` por tarea. `main` recibe entregas probadas.
   Cada avance se registra en commits por responsabilidad, conservando las ramas
   existentes. Ninguna fase de prueba simulada equivale a un MVP con IA real.

## Forma de trabajo acordada

- Proponer alcance y criterios de validación antes de implementar nuevos pasos.
- Priorizar la seguridad humana: los resultados simulados no acreditan precisión
  clínica y los fallos críticos no se resuelven únicamente con un promedio de confianza.
- Distinguir decisiones aprobadas de propuestas pendientes sobre score y evidencias.
- Mantener requisitos, estado real, decisiones y verificaciones en esta bitácora.
- Commits separados por avance o función; publicación de la rama de trabajo sin PRs
  ni eliminación de ramas. No integrar a `develop` o `main` sin un paso acordado.

## Las tres inconsistencias y su efecto

| Tema | Diferencia | Qué falta decidir |
|---|---|---|
| Score | Plan: IA aporta 30 %, sistema 70 %. Prototipo: completitud 60 %, consistencia por IA 40 %. | Componentes, pesos, campos obligatorios por tipo y umbral. No reutilizar el score como si cumpliera el plan. |
| Evidencias | El plan presenta citas como técnica central y MoSCoW las marca `Should`. | Propuesta: obligatorias antes de evaluar el MVP real; esta fase no extrae datos reales. |
| Dataset | README/plan de equipo: `data/`; plan final: `datasets/`. | Para esta etapa se usa `data/functional/`; unificar el plan al ratificar la convención. |

Los valores 0.95/0.20 de las fixtures son constantes para probar respuestas y decisiones,
no una fórmula aprobada ni mediciones clínicas. Los fixtures tienen solo entradas sintéticas.

## Verificación de esta entrega

### Configuración Neon del 03/10/2026

- Actualización posterior: por solicitud del usuario, el entorno local se vinculó
  a `development` (`br-broad-bread-b4sii0lv`), creada desde `production`.
  `.neon` y las siete variables gestionadas de `.env.local` ahora corresponden
  a desarrollo. Se verificó el bucket `mediflow-pruebas` privado en esta rama.
  No se modificó ni eliminó la rama `production` en esta actualización.
- Se consultó la skill oficial en la URL `.well-known/agent-skills/neon/SKILL.md`
  indicada por el usuario y se actualizaron las ocho skills instaladas mediante
  `neon skills update -y`. MCP ya estaba instalado y limitado al proyecto:
  se preservó su configuración. Esa limitación es por proyecto, no por rama;
  las operaciones deben dirigirse explícitamente a `development`.

- Alcance autorizado: CLI Neon, skills oficiales, MCP de Codex, vínculo del
  proyecto `wandering-voice-40276879` a su rama Neon `production` y despliegue
  del bucket privado `mediflow-pruebas`. La rama Git sigue siendo
  `feature/backend-foundation`; ambas ramas pertenecen a sistemas diferentes.
- CLI verificada: 8.0.3. Proyecto en `aws-us-east-2`, PostgreSQL 16.
- Configuración declarada en `neon.ts`; dependencias de estas herramientas en
  `package.json` y `package-lock.json`. El backend continúa usando Python.
- MCP limitado a este proyecto; credencial guardada fuera del repositorio.
  `.env.local` y `.neon` están excluidos de Git. No copiar sus valores a esta bitácora.
- `neon config plan` y `neon deploy` finalizaron sin cambios pendientes:
  el bucket ya coincidía con la configuración. `neon bucket list` confirmó
  `mediflow-pruebas` con acceso `private`. Neon acepta `preview.buckets`,
  aunque recomienda moverlo al nivel superior por disponibilidad general.
- Pendiente: prueba de subida/descarga de archivos sintéticos e integración
  mediante el puerto de documentos. Swagger sigue usando almacenamiento local.
  No se implementaron tablas, migraciones ni persistencia PostgreSQL.
- Neon Object Storage es una opción temporal para pruebas; OCI continúa como
  objetivo del plan. Esta configuración no demuestra seguridad clínica.

### Incremento del 02/10/2026: revisión humana sin BD

- Alcance aceptado: completar revisión en memoria antes de configurar PostgreSQL,
  manteniendo arquitectura y puertos. Las propuestas del score y evidencias no se aprobaron.
- Aprobación exige nombre, tipo soportado y destino explícito; no valida matrícula,
  dosis, evidencia ni todos los campos críticos por tipo. Son controles de una demo técnica.
- Rechazo no autoriza destino final. Corregir/aprobar exige cambios efectivos;
  campos no admitidos, valores inválidos y revisiones repetidas fallan sin modificar el caso.
- La auditoría registra acción, identidad declarada, comentario, fecha UTC, estados,
  destinos y extracción antes/después. No cambia artificialmente el score.
- La identidad no está autenticada. No hay despacho real, alertas enviadas ni persistencia.
- Fixture adicional `data/functional/baja_confianza.json` y demo reproducible
  `backend/scripts/demo_revision.py`. Un score fijo de demo no prueba calibración del fallback real.
- Verificación: 61 pruebas aprobadas; lint y formato aprobados para `app`, `tests`
  y `scripts`; demo HTTP ejecutada contra localhost:8001 con las tres acciones y
  repetición rechazada con `409`. Se mantiene la advertencia de Starlette/HTTPX
  ya registrada en la base inicial.

### Verificación de la base inicial

- 28 pruebas aprobadas: escenarios, fixtures JSON documentadas, consultas, cola,
  paginación, validaciones, duplicados concurrentes, recuperación de originales,
  límite de archivos y fallo de almacenamiento sin registro de un resultado exitoso.
- Ruff: lint y formato aprobados. Lockfile vigente y `git diff --check` sin errores.
- Servidor Uvicorn iniciado localmente: `/health` y `/docs` respondieron correctamente.
- Una advertencia de deprecación de Starlette sobre su integración de TestClient con
  HTTPX; no afecta los resultados de esta ejecución. Revisar la migración del cliente
  de pruebas al actualizar esas dependencias.

## Incremento Neon development — 2026-10-05

- PostgreSQL real detrás del puerto: documents, triages y review_events; migraciones
  aditivas 0001/0002 aplicadas solo a development. Extracción original y auditoría
  protegidas contra sobrescritura por triggers. Creación/actualización en UTC.
- Documentos en bucket privado mediflow-pruebas; API conserva IDs públicos y devuelve
  proveedor neon. Hash de integridad, reserva PENDING/READY/FAILED y reconciliación.
  No existe transacción distribuida con S3 ni limpieza automática de objetos huérfanos.
- Revisión y evento atómicos; dos revisiones concurrentes producen 200/409.
- Configuración local ignorada activa postgres/neon. No se cambia production.
- 66 pruebas unitarias/API aprobadas; Alembic check no detecta drift. Demo real
  confirma hash/texto/PDF, nueva instancia recupera historial, duplicado y auditoría.
- IA sigue simulada, PDF/imagen sin OCR genera AI_UNAVAILABLE y revisión. Sin
  autenticación de revisores, despacho, OCI final ni seguridad clínica acreditada.
- Guía PyCharm y generación de originales sintéticos en backend/README.md.
  Commits y revisión independiente pendientes del coordinador; no se hizo push.
