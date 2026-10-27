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
  Checkpoint guardado: `b0236f1f83782e92bc28dbfb378e107924ca28d7`, con revisión nativa
  aprobada y acknowledgement consumido. No se hizo push.

### Cierre acotado de observaciones de revisión: reintento y recuperación

- Reintento FAILED: se rechaza cambio de MIME, canal, nombre original o tamaño;
  proveedor/bucket y hash ya se comprobaban. Un rechazo no ejecuta la subida ni
  modifica la reserva. El reintento idéntico conserva sus metadatos originales.
- Reconciliación: adaptador y proveedor/bucket deben coincidir; la reserva, hash y
  ubicación se vuelven a comprobar después de leer, antes de habilitar el documento.
- RED observado: 9 fallos/18 aprobadas en pruebas del repositorio antes del arreglo.
  GREEN: 27 pruebas del repositorio y 90 totales aprobadas; Ruff y diff check aprobados.
- Frontera de cinco minutos, hash incorrecto, lectura fallida, reserva reemplazada y
  revocación de token por liberación se probaron localmente con SQLite/mocks. Estas
  pruebas no acreditan concurrencia real de PostgreSQL/S3 ni seguridad clínica.
- Sin operaciones Neon, cambios de entorno, Gemini ni migraciones en este incremento.
  Nuevo commit y revisión del coordinador pendientes.

## Base local de ingesta IA original primero

- Base confirmada: `9b5097ca260008257cbede56657c720d0c6ae0a3`. Incremento acotado,
  sin Gemini/Google SDK/LangGraph ni llamadas a proveedores.
- Original se conserva y confirma antes de extraer; procesamiento PENDING/PROCESSING/
  SUCCEEDED/FAILED separado del almacenamiento. Fallo conserva original y marca revisión
  con confianza null, nunca un score inventado ni mensaje crudo del proveedor.
- Contrato v2 con campos comunes opcionales, proveniencia y referencias de evidencia;
  JSON v1 sigue legible. No se agregan reglas/pesos clínicos ni se acredita identidad.
- Migración 0003 local/aditiva pendiente de aplicación development. Permite inicializar
  original de extracción una vez; protege filas históricas ya finalizadas. No arrancar
  este adaptador PostgreSQL actualizado contra schema 0002.
- RED inicial: dos errores de colección por contrato ausente; GREEN enfocado: 24 casos
  locales. Token obsoleto/doble finalización, interrupción, contrato legacy y auditoría
  nullable cubiertos. SQL offline no prueba triggers/concurrencia PostgreSQL reales.
- Revisión y commit del coordinador pendientes; ninguna operación remota ejecutada.

### Validación runtime de salida de extracción

- Checkpoint de la base de ingesta: `325d549b4d173665b7e09ce8c967af48562e78be`.
- Tipos opcionales, edad técnica existente (entero 0..130), confianza finita,
  evidencia/proveniencia y colecciones se validan en dataclasses sin frameworks.
  Se conservan strings opcionales vacíos; no se agregan reglas clínicas.
- Tipos documentales reutilizan el conjunto ya existente y el sentinel de simulación
  No determinado. Fixture genérica Informe se corrigió a Informe de Laboratorio,
  conservando las mismas comprobaciones de alerta urgente y revisión.
- Una salida malformada (estudio numérico o tipo desconocido) produce fallo técnico
  seguro/revisión, confianza null y original disponible; no SUCCEEDED seguido de HTTP500.
- RED observado: 28 fallos/24 aprobadas. GREEN: 54 enfocadas/144 totales aprobadas;
  Ruff/diff check aprobados. Advertencia Starlette/HTTPX previa sin cambios.
- Sin Gemini, red, migraciones, instalaciones ni cambios de entorno. Revisión/commit
  del coordinador pendientes; migración 0003 sigue pendiente de verificación development.

## Integración Gemini directo + LangGraph (sin llamadas vivas)

- Base e265cb8; coordinador informó aplicación/verificación independiente de 0003 en
  development. Este trabajador no ejecutó operaciones remotas ni leyó claves.
- google-genai 2.28.0 y LangGraph 1.2.13 locked, requirements con hashes; pip preservado.
- Grafo real stateless: extracción → validación → revisión. Original-first y auditoría
  permanecen fuera del grafo; sin tools/URL retrieval/checkpoint de larga duración.
- Gemini usa schema estricto y bytes inline PDF/PNG/JPEG/texto; proveniencia guardada.
  Todos sus resultados requieren revisión; confianza autodeclarada no equivale a seguridad.
- Evidencia textual literal/valor comprobada técnicamente; binaria no verificada.
  Errores seguros/timeout/retries acotados, sin cambio de modelo o fallback simulado.
- RED inicial: dos módulos ausentes. GREEN actual: 29 enfocadas y 173 totales aprobadas,
  sin llamadas de proveedor. Verificaciones finales y commit/revisión pendientes.
- GEMINI_API_KEY y modelo se agregarán localmente; modo sigue sin modificación. Free tier
  de gemini-3.8-flash confirmado en documentación oficial, no acceso de cuenta ni costo real.
- La dependencia httpx2 eliminó la advertencia Starlette anterior en esta suite.

## Portabilidad del entorno Python

- Requisito actual: Python 3.12.x; `.python-version` ahora contiene 3.12, consistente
  con pyproject `>=3.12,<3.13`. Las referencias históricas a 3.12.14 son evidencia del
  entorno Windows probado, no un parche obligatorio para Linux.
- No se recrea la .venv Windows ni se cambia el lock/dependencias. Linux usa
  `uv python install 3.12` y `uv sync --locked`; PyCharm puede conservar pip con
  `--inexact`. Guía diferencia instalación de paquetes de comportamiento de la API.
- Los 61 casos de una versión anterior no acreditan la suite actual en Linux;
  última suite actual observada: 173 en Windows. Este cambio documental no repite Linux.
- Clave Gemini se conserva local; no se inspeccionó, copió ni usó. Guía especifica
  AI_MODE=gemini/modelo explícito/reinicio y demo con --confirm-provider-call, solo tras
  autorización. Sin llamadas reales de Google/Neon en esta tarea.

## Estado de publicación y prueba manual — 2026-10-07

- Checkpoints conservados: b0236f1 persistencia; 9b5097c recuperación; 325d549 ingesta
  original-first; e265cb8 tipos runtime; 18ff4db Gemini/grafo; c7efbb7 portabilidad.
- Migración 0003 aplicada/verificada en development en etapa independiente previa.
  Las menciones anteriores a pendiente describen sus momentos históricos.
- Usuario informó PDF exitoso vía API completa. Independientemente se verificó una
  llamada directa PDF sintético con gemini-3.5-flash-lite en 4.34 s; esta prueba no
  demuestra por sí sola todo HTTP/Neon. No se hizo otra llamada en esta preparación.
- La precedencia de variables del proceso puede ocultar cambios de backend/.env;
  mantener modelo/key explícitos sin imprimirlos y reiniciar el proceso apropiado.
- Publicación pendiente del coordinador: IaC privada y locks de tooling, exclusiones
  locales y actualización documental. Skills propias se versionan; ocho skills oficiales
  descargadas quedan locales/ignoradas, con fuente/hash en skills-lock.json.
- Persisten pendientes autenticación/revisores/descargas, CI Linux, contratos API,
  evidencia/calibración clínica y reglas/pesos aprobados. Pipeline real siempre exige
  revisión; no hay despacho ni fallback automático aprobado. Error400/401/403 agrupado
  como GEMINI_AUTH es deuda de diagnóstico, no se cambia en este ajuste.

## Handoff HTTP frontend — 2026-10-08

- Publicación previa confirmada en checkpoint 9f6df98. Nuevo documento
  docs/CONTRATO_API_FRONTEND.md describe HTTP/OpenAPI actual y nueve fixtures sintéticos.
  No se modifica runtime, CORS/auth, tipos clínicos, reglas o infraestructura.
- Se separan estado técnico/proveedor, decisión humana, alerta y despacho no implementado;
  201 con extracción FAILED no se muestra como análisis exitoso. Correcciones restringidas
  al contrato real; una aprobación conserva score null y la trazabilidad del fallo.
- JSON de historial es envelope items/total/offset/limit; revisiones es array con snapshots
  de nombres ingleses. UI no accede directamente a DB/SDK ni convierte claves en URLs.
- Autorización de descarga/revisores y CORS permanecen pendientes. Memoria no comparte
  procesos ni sobrevive reinicios; PostgreSQL es persistente, no equivaler ambos modos.
- Validación observada: nueve fixtures Pydantic y tres solicitudes de revisión de forma/
  semántica local, score null conservado y enlaces válidos; no seguridad clínica ni nueva
  ejecución Google/Neon. Commit del coordinador pendiente; no push de este incremento.

## Almacenamiento OCI Object Storage — 2026-10-13

Registro de la rama OCI antes de integrar los avances posteriores de foundation.
La evidencia histórica de esta sección no acredita la validación de la combinación
actual ni una nueva prueba contra OCI durante la resolución del merge.

- Rama `feature/backend-oci-storage` (Silvio), creada desde `feature/backend-foundation`.
  Nuevo `STORAGE_MODE=oci`: `OciDocumentStorage` hereda save/read y errores del adaptador
  S3 de Neon; solo cambia endpoint `https://<namespace>.compat.objectstorage.<region>.
  oraclecloud.com` y configuración del cliente. No se modificó `neon_storage.py`.
- Bucket del equipo: tenancy de Nico, región `sa-santiago-1`, bucket
  `mediflow-documentos-clinicos`. Variables `OCI_NAMESPACE`, `OCI_REGION`, `OCI_BUCKET`,
  `OCI_ACCESS_KEY_ID`, `OCI_SECRET_ACCESS_KEY`; cada integrante usa su Customer Secret Key.
- Hallazgos: boto3 >= 1.36 exige `request_checksum_calculation` y
  `response_checksum_validation` en `when_required`; sin eso OCI responde
  `NotImplemented: AWS chunked encoding not supported`. Una clave recién creada tarda
  minutos en propagarse y mientras tanto falla con `SignatureDoesNotMatch`.
- Decisión: OCI se permite con `REPOSITORY_MODE=memory` para pruebas. Al reiniciar se
  pierde el historial y los originales quedan en el bucket sin referencia; con PostgreSQL
  aplican las reservas PENDING/READY/FAILED y la reconciliación existentes. Namespace y
  región se validan con formato estricto porque forman el hostname del endpoint.
- Contrato sin cambios de forma: `almacenamiento.proveedor` admite `oci` y
  `almacenamiento_oci` sigue en null. Pendiente acordar con frontend si se completa.
- Fuera de alcance: prefijos por decisión (`procesados/<destino>/`, `auditoria_humana/`);
  los originales siguen en `recibidos/<id>`.
- Verificación reportada en la rama OCI: 12 pruebas nuevas con cliente simulado
  (endpoint, checksums, errores sin secretos, variables obligatorias, hostname, API
  con proveedor oci y 503 sin registro);
  185 pruebas aprobadas; ruff lint y formato aprobados. Prueba real con IA simulada y
  memoria: POST 201 con `proveedor=oci`, `GET /documento` leyó el original desde OCI y
  `head_object` confirmó el objeto en el bucket.

## Verificaciones pendientes para la demo — 2026-10-13

- En foundation, por decisión del usuario en esa fecha, se pospuso volver a ejecutar
  la suite de regresión. La última ejecución allí registrada fue de 173 pruebas
  aprobadas en Windows; no equivale a una ejecución reciente, a la validación de esta
  integración ni a validación clínica.
- Antes de cerrar la integración web, queda pendiente ejecutar las pruebas de navegador:
  preflight CORS desde el origen acordado, llamada permitida y rechazo de un origen no
  autorizado. Primero se debe confirmar el origen local exacto del frontend.

## Fase 1: rutas condicionales con revisión humana — 2026-10-16

- El grafo distingue propuesta rutinaria, revisión por ambigüedad/incompletitud y
  revisión urgente mediante ramas que solo agregan trazas efímeras; no persisten estado
  ni realizan revisión. El resultado actual lo determina `decide`; la confianza reportada
  no tiene corte.
- `decide` mantiene toda señal urgente en `NEEDS_AUDIT`/`REVISION_HUMANA` con alerta
  activa. Solo la revisión explícita puede aprobar `EMERGENCIA_MEDICA`; rutina produce
  `PROCESSED`/`HISTORIA_CLINICA`, no una aprobación ni despacho. El fallback de
  `ProcessDocument` no se cambió.
- Verificación focalizada: 23 pruebas aprobadas; Ruff check aprobado; Ruff format check
  aprobado (advertencia de caché, código de salida 0); `git diff --check` aprobado con
  advertencias de normalización LF/CRLF. Se usaron los ejecutables existentes de
  `backend/.venv` porque `uv` no está disponible. El coordinador repitió la suite
  focalizada con 23 aprobadas. La suite completa no se ejecutó.
- `gentle-ai review assess` clasificó el riesgo como alto/no evaluable porque los
  archivos sin seguimiento no estaban declarados. La revisión estática independiente
  no encontró bloqueos.
- Estas pruebas no acreditan seguridad clínica. No se afirma persistencia durable de
  las trazas del grafo ni despacho real. En foundation, OCI Object Storage seguía
  pendiente de integración como requisito obligatorio de Alura; el adaptador de la
  rama OCI se documenta en su sección anterior.
- El commit sigue pendiente; no se hizo push, PR ni merge.

## Handoff: plan de alertas externas — 2026-10-16

- Se documentó una propuesta por fases para alertas operativas sintéticas, con Slack
  como primer canal y Resend como ampliación opcional: [Plan MVP de alertas y fases](PLAN_MVP_ALERTAS_Y_FASES.md).
- No se implementó envío externo. La revisión humana y el enrutamiento permanecen
  independientes; en foundation, OCI Object Storage seguía pendiente de integración
  como requisito obligatorio de Alura, no sustituible por Slack.

## Fase 2: outbox persistente de revisión — 2026-10-17

- El adaptador SQLAlchemy añade una intención `REVIEW_REQUIRED`/`SLACK`/`PENDING` al
  finalizar en `NEEDS_AUDIT`, dentro de la misma transacción del cambio de triaje.
  La unicidad por triaje/tipo y por hash idempotente evita duplicados. El outbox guarda
  una referencia interna al triaje y el SHA-256 de documento/tipo, no el ID público,
  extracción, texto clínico ni contenido de excepción. Solo códigos de error permitidos
  quedan como metadato.
- Verificación local con los ejecutables existentes de `backend/.venv` (porque `uv` no
  está disponible): RED de pruebas al faltar el modelo; GREEN focalizado: 35 aprobadas.
  Ruff check y Ruff format check pasaron; `git diff --check` pasó con advertencias
  LF/CRLF.
- El intento de suite completa quedó interrumpido sin salida ni resumen; no se afirma
  que haya pasado. La migración aditiva `0004` está escrita, pero no se ejecutó ni en
  PostgreSQL local ni en Neon. No hubo llamadas externas.
- `MemoryTriageRepository` no persiste outbox; no se afirma durabilidad en memoria ni
  tras reinicios. No hay worker, reintentos efectivos, envío Slack, endpoint, validación
  clínica ni despacho real.
- Commit de esta unidad: `3925d17`; registro de cierre: `3d0161b`. Sin push, PR ni merge.

### Hardening de Fase 2

- Commit: `cf7c8b0` — `fix(outbox): alinear default y aislar pruebas de unicidad`.
- Se alineó `attempt_count` del ORM con el default de servidor de la migración `0004`,
  conservando el default del cliente. Una inserción SQL sin contador prueba el default
  real de la tabla SQLite. Las dos restricciones únicas se verifican por separado.
- RED: 1 fallo y 36 aprobadas; GREEN: 37 aprobadas. Ruff check/format y diff check
  pasaron. Revisión independiente sin bloqueos; el coordinador reprodujo 37 aprobadas.
- La suite completa y la migración PostgreSQL/Neon siguen sin verificar. No se hicieron
  llamadas externas ni se implementó Slack. Evidencia: `odd/tasks/phase2-outbox-hardening.md`.

## Validación aislada de outbox 0004 en Neon — 2026-10-16 (America/Lima)

- Migración verificada únicamente en `test/outbox-0004`, ID `br-noisy-tooth-b4y7bq5u`,
  hija de development `br-broad-bread-b4sii0lv`, proyecto `wandering-voice-40276879`,
  base `mediflow-bd`. Baseline observado: `0003_processing_state`, sin outbox.
- Se generó el SQL versionado con Alembic offline y se aplicaron su CREATE y UPDATE
  exactos mediante MCP transaccional, con guardas antes y después. SHA-256 del stdout
  completo: `49e76f6125c56158f8eb51d4fe8da4401089d3ce9963e57eebf90add09d12782`.
  La hija quedó en `0004_notification_outbox`.
- Catálogo real: 12 columnas con tipos/longitudes/nulabilidad/default esperados, PK,
  FK a `triages(id)`, dos claves únicas y tres checks. Siete aserciones sintéticas
  probaron default 0 omitido, contador negativo, evento/canal inválidos, FK inexistente
  y ambas colisiones únicas de forma independiente, verificando cada nombre de constraint.
- Fixtures revertidos mediante subtransacción después de todas las aserciones;
  conteo posterior 0. No se leyeron filas clínicas ni se borraron datos existentes.
  Development se releyó: sigue en `0003`, sin outbox. Producción no se consultó.
- `.neon` y tres archivos de entorno conservaron sus bytes. El modo simulado/local
  se pasó únicamente al subproceso de generación offline, sin abrir conexión ni
  debilitar la validación de hostname de `Settings`.
- Un primer intento MCP fue rechazado por múltiples comandos en una entrada; tras
  confirmar baseline intacto, se enviaron los comandos generados por separado en la
  misma transacción. Una consulta de catálogo de solo lectura también requirió corregir
  su ORDER BY; ambas incidencias y el detalle están en
  `odd/tasks/neon-outbox-0004-validation.md`.
- No se verificaron Alembic online, FastAPI contra la hija, concurrencia, Slack ni
  seguridad clínica. La suite completa Python permanece sin verificar. Hija preservada;
  commit documental `5803641`, sin push, PR ni merge. Revisión independiente confirmó
  catálogo, revisiones y cero fixtures; el coordinador comprobó ambas revisiones.
  Migrar development e iniciar
  Slack requieren una decisión posterior; este resultado no los ejecuta ni autoriza.

## Outbox 0004 aplicado online en development — 2026-10-17 (America/Lima)

- Tras autorización explícita, se aplicó la migración existente a development
  `br-broad-bread-b4sii0lv`, proyecto `wandering-voice-40276879`, base `mediflow-bd`.
  Desde `backend/`: `.venv/Scripts/python.exe -m alembic upgrade 0004_notification_outbox`,
  salida 0. Antes de lanzarlo se verificaron endpoint directo sin pooler, base,
  revisión `0003_processing_state` y tabla ausente. El render offline previo conservó
  el SHA-256 `49e76f6125c56158f8eb51d4fe8da4401089d3ce9963e57eebf90add09d12782`.
- MCP confirmó revisión `0004_notification_outbox`, las 12 columnas con tipos,
  longitudes, nulabilidad/default exactos y siete restricciones: PK, FK a `triages(id)`,
  dos únicas y tres checks. Este resultado sí prueba Alembic ONLINE en development;
  no debe confundirse con la ejecución de SQL offline de la hija anterior.
- Siete aserciones SQL sintéticas verificaron default 0 omitido y rechazos por contador
  negativo, evento/canal inválidos, FK inexistente y las dos colisiones únicas por
  separado, comprobando SQLSTATE y nombre de constraint. Excepción controlada `P4004`
  tras las aserciones revirtió todos los fixtures; errores inesperados se propagan.
  Consulta posterior confirmó cero fixtures y outbox vacío. Conteos antes/después:
  documentos 20/20, triajes 20/20 y revisiones 6/6; sin deriva observada, no una prueba
  de ausencia de modificaciones concurrentes. No se borraron datos existentes.
- El primer preflight sandbox falló con `OperationalError` antes de lanzar Alembic;
  bajo elevación autorizada se revalidó el baseline y se ejecutó una sola migración.
  Los cuatro archivos de configuración conservaron sus hashes. El modo simulated/local
  se limitó al entorno del subproceso y no debilitó las guardas de `Settings`.
- Producción no se consultó y la hija no se modificó. No se verificaron ingesta HTTP
  completa, concurrencia, Slack, despacho ni seguridad clínica; la suite Python completa
  sigue pendiente. No hubo nuevas credenciales, cambios funcionales, instalaciones,
  llamadas a IA/storage/Slack, push, PR ni merge. Revisión independiente sin bloqueos:
  confirmó catálogo, conteos y cero fixtures; el coordinador confirmó revisión y outbox
  vacío. Commit local `fa188ed`; evidencia en
  `odd/tasks/neon-development-outbox-0004.md`.

## Integración local OCI y lecturas seguras — 2026-10-19

- La integración conserva `OciDocumentStorage` detrás del puerto de documentos,
  su cliente S3 con credenciales explícitas, timeouts/reintentos acotados y checksums
  `when_required`; `almacenamiento.proveedor=oci` y `almacenamiento_oci=null` no
  cambian de forma. Se mantienen Neon/local, PostgreSQL y el outbox/migración 0004.
- La descarga compara el proveedor y bucket del registro con el adaptador activo
  **antes de llamar a `read`**. Una diferencia o adaptador sin identidad produce
  503 seguro; no se intenta otro almacenamiento. El modo local existente conserva
  proveedor `local` y bucket nulo. Después de leer se mantiene el control SHA-256.
- Configuración: copiar `backend/.env.example` a un archivo local ignorado,
  seleccionar `STORAGE_MODE=oci` y completar `OCI_NAMESPACE`, `OCI_REGION`,
  `OCI_BUCKET`, `OCI_ACCESS_KEY_ID` y `OCI_SECRET_ACCESS_KEY` desde una fuente
  autorizada fuera de Git. El ejemplo solo contiene valores sintéticos; no copiar
  claves a documentación, logs ni respuestas. Variables vacías o hostname inválido
  impiden iniciar OCI. Esta configuración no autoriza contactar el servicio.
- **OCI con `REPOSITORY_MODE=memory` es solo demo:** reiniciar pierde historial,
  revisiones y referencias a documentos, aunque los objetos permanezcan en OCI.
  PostgreSQL conserva las reservas/reconciliación existentes, pero no se validó
  contra servicios reales en esta unidad. Cambiar proveedor o bucket no migra
  objetos; no existe soporte de dataset mixto ni migración automática.
- Pruebas locales únicamente con datos sintéticos y cliente OCI simulado:
  construcción/configuración, guardar/leer/cerrar cuerpo, metadatos, errores
  sanitizados, coincidencia de ubicación y rechazo sin lectura de otra ubicación.
  RED observado: 8 fallos y 57 aprobadas antes de proteger la descarga.
  GREEN: 69 enfocadas y 234 totales aprobadas; Ruff check aprobado y format check
  con 45 archivos ya formateados. TestClient requirió permisos locales de loopback;
  el primer intento sandbox se interrumpió por bloqueo, sin contactar OCI.
- La evidencia OCI histórica del 13/10 no demuestra conectividad ni una prueba
  nueva de esta integración. No se inspeccionaron credenciales ni buckets, no hubo
  migraciones de objetos, push, PR ni merge a `develop`/`main`. No se modificaron
  scores, urgencia, decisiones clínicas ni autorización humana.

## Pendientes priorizados para integración y seguridad — 2026-10-23

Los cambios de CORS están publicados para `http://localhost:5173` y
`http://localhost:5174`; eso habilita el navegador, pero no prueba por sí solo la
integración real ni protege la API. Mantener datos sintéticos hasta cerrar los
controles de acceso y privacidad.

- [ ] Probar la integración real con el frontend desde `localhost:5173` o
  `localhost:5174`, verificando la petición `OPTIONS` y la llamada API en el
  navegador. Si el frontend usa otro origen, acordar y agregarlo explícitamente.
- [ ] Agregar autenticación y autorización antes de permitir descargar documentos
  o registrar revisiones. Derivar la identidad del usuario de una sesión/token
  validado; no confiar en el campo `revisor` enviado por el cliente. Definir roles
  y una matriz de permisos para consulta, descarga, revisión y administración.
- [ ] Definir cómo cancelar o reemplazar una carga equivocada con trazabilidad,
  preservando el original y el historial. No habilitar borrado físico indiscriminado;
  evaluar purga separada, restringida y sujeta a política de retención.
- [ ] Evaluar fallback de Gemini y precisión de extracción con datos sintéticos:
  documentar errores que permiten reintento/cambio de modelo, preservar procedencia
  del modelo y nunca convertir un fallo en éxito simulado. No hay fallback entre
  modelos ni validación clínica acreditada actualmente.
- [ ] Incorporar audio y transcripción solo después de cerrar el flujo base exigido
  por Alura y aprobar su alcance: formatos/tamaño, consentimiento, retención,
  transcripción, evidencia, revisión humana y manejo de fallos. No hay soporte de
  audio implementado en el backend.

La conformidad completa con el reto no se declara hasta contrastar cada requisito de
`docs/mediflow-agente-autonomo.md` con implementación y evidencia funcional vigente;
el checklist del reto sigue siendo la fuente de aceptación, no esta lista de tareas.
