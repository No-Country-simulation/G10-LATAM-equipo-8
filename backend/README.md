# Backend: primera etapa funcional

Python **3.12.14**. Dependencias declaradas en `pyproject.toml`, resolución fija
en `uv.lock`. `requirements.txt` es una exportación de runtime para pip, no se edita a mano.

Desde `backend/`, con [uv](https://docs.astral.sh/uv/getting-started/installation/) instalado:

```powershell
uv sync --locked --inexact
Copy-Item .env.example .env
uv run --locked --no-sync uvicorn app.main:app --reload
```

Swagger: <http://127.0.0.1:8000/docs>. OpenAPI: <http://127.0.0.1:8000/openapi.json>.
Ejecutar con un solo proceso: el repositorio en memoria no se comparte entre workers.

```powershell
uv run --locked --no-sync pytest -q
uv run --locked --no-sync ruff check app tests
uv run --locked --no-sync ruff format --check app tests
```

En la máquina donde Codex preparó el entorno también se puede ejecutar directamente:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
.\.venv\Scripts\python.exe -m pytest -q
```

## Alcance real

- IA **simulada**: reconoce únicamente los cuatro textos sintéticos de `../data/functional/`.
  No llama a Gemini, no interpreta texto arbitrario, no realiza OCR y no calcula un score real.
- Texto desconocido o PDF/imagen: se conserva el documento y devuelve `NEEDS_AUDIT`
  con `AI_UNAVAILABLE`. No se inventan paciente, clasificación ni diagnóstico.
- Por defecto: documentos en disco, bajo `STORAGE_DIR`; estados e historial **en memoria**.
  Al reiniciar se pierde el historial, aunque los archivos siguen en disco.
- `almacenamiento_oci` es `null`; `almacenamiento.proveedor` informa `local` o `neon` según modo.
- `alerta_urgente` indica la decisión; no envía Slack/email. `notificacion_generada` es `null`.
- La ingesta binaria comprueba MIME, firma inicial y tamaño (10 MiB por defecto).
  No es todavía un parser completo de PDF o imágenes.
- Revisión humana en memoria por defecto o persistente al activar PostgreSQL; sin autenticación ni OCI.
  Solo pruebas con datos sintéticos. No exponer esta instancia como servicio clínico.

## Prueba manual de los tres escenarios

Desde `backend/`, con la API activa:

```powershell
$caso = Get-Content ..\data\functional\rutina.json -Raw
Invoke-RestMethod http://127.0.0.1:8000/api/v1/triajes/process-text -Method Post -ContentType application/json -Body $caso
```

Repetir con `urgencia.json` y `ambiguo.json`. Los resultados esperados son,
respectivamente, `PROCESSED/HISTORIA_CLINICA`, `PROCESSED/EMERGENCIA_MEDICA`
y `NEEDS_AUDIT/REVISION_HUMANA`. Los scores son valores fijos de prueba.

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/triajes
Invoke-RestMethod http://127.0.0.1:8000/api/v1/audit/queue
Invoke-RestMethod http://127.0.0.1:8000/api/v1/triajes/DEMO-RUTINA
```

Cada `documento_id` es único por ejecución: reenviar el mismo devuelve `409`.

## Demo de revisión humana

Con la API activa, desde `backend/`:

```powershell
.\.venv\Scripts\python.exe scripts\demo_revision.py
```

El script crea tres casos con IDs únicos, aprueba uno, corrige y aprueba otro y rechaza
el tercero. Consulta las revisiones y comprueba que repetir una revisión devuelve `409`.
Acepta `--base-url http://127.0.0.1:8001` si se inicia la API en otro puerto.

En Swagger, crear primero un caso de `baja_confianza.json` y usar
`POST /api/v1/triajes/{documento_id}/revision`:

```json
{
  "accion": "aprobar",
  "revisor": "auditor-demo",
  "comentario": "Revisado contra el documento sintetico original",
  "destino": "HISTORIA_CLINICA"
}
```

Para un caso ambiguo sin nombre, usar `corregir_aprobar` con `destino: FARMACIA`
y `correcciones: {"nombre_paciente": "Ana Demo", "edad_paciente": 30}`.
Para rechazar: `accion: rechazar`, revisor y comentario; omitir destino y correcciones.
Consultar `GET /api/v1/triajes/{documento_id}/revisiones` para ver el antes/después.

Solo se revisan casos `NEEDS_AUDIT`. Aprobar exige un nombre no vacío, tipo documental
soportado y destino explícito distinto de revisión humana; prioridad urgente exige emergencia.
Edad opcional: entero entre 0 y 130 (validación técnica, no clínica); puede corregirse a `null`.
Estos controles no verifican matrícula, dosis, evidencia ni reglas clínicas completas.
No autorizan uso con pacientes reales. La identidad del revisor es declarada, no autenticada.

## Neon development: persistencia y documentos privados

No crear otro entorno ni instalar desde una segunda lista de dependencias.
Desde `backend/`, sincronizar con `uv sync --locked --inexact`. `--inexact` conserva
herramientas locales como `pip`; un sync exacto puede eliminarlas. Para PyCharm:

```powershell
.\.venv\Scripts\python.exe -m ensurepip --upgrade
```

Seleccionar el intérprete existente `backend\.venv\Scripts\python.exe` (Python 3.12.14).
Neon CLI dejó credenciales de **development** en el `.env.local` de la raíz, ignorado
por Git. El backend lee ese archivo primero y luego `backend/.env`; no copiar secretos
a README, chat ni `.env.example`. `DATABASE_URL_UNPOOLED` sirve para migraciones;
`DATABASE_URL` pooled para la API. No usar credenciales production.

Antes de iniciar, ejecutar desde `backend/`:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

En `backend/.env`, activar explícitamente:

```dotenv
REPOSITORY_MODE=postgres
STORAGE_MODE=neon
NEON_BRANCH=development
STORAGE_BUCKET=mediflow-pruebas
```

Luego, en PyCharm Terminal:

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8002
```

Swagger: <http://127.0.0.1:8002/docs>. `/health` muestra adaptadores configurados;
no es una prueba de conectividad. La prueba real crea casos sintéticos y los conserva:

```powershell
.\.venv\Scripts\python.exe scripts\demo_neon.py --confirm-development
```

El script verifica almacenamiento/hash, duplicado 409, recuperación desde otra
instancia, dos revisores concurrentes (200/409), evento único y score sin incremento.
No borra sus casos ni prueba seguridad clínica. `--migrate` aplica la migración inicial.

### Qué subir y cómo

Usar los textos ficticios existentes de `../data/functional`, nunca documentos reales
ni capturas de pacientes. Para un PDF y una imagen válidos de prueba:

```powershell
.\.venv\Scripts\python.exe scripts\create_synthetic_documents.py
```

En Swagger usar `POST /api/v1/triajes/archivo`: ID nuevo, canal `web` y archivo
`storage/synthetic/demo-synthetic.pdf` o `.png`. La API sube al bucket y registra
su relación en la BD. **No subir manualmente al bucket** si se quiere un triaje:
una subida manual no crea historial. El PNG es un píxel técnico, no un documento clínico.
La IA simulada no lee PDF/imágenes: estos casos devuelven `AI_UNAVAILABLE` y revisión.
No se requieren etiquetas clínicas en el bucket; los casos esperados pertenecen a pruebas.

### Modelo y límites de esta etapa

Tres tablas: `documents` (ID público/interno, original, MIME, tamaño, hash, proveedor,
bucket, clave, estado, fechas), `triages` (extracción original/current versionada,
clasificación/decisión, versión de fila, fechas) y `review_events` (actor declarado,
acción, comentario, antes/después, correcciones, fecha). Timestamps UTC; auditoría
append-only mediante trigger PostgreSQL. Una revisión y su evento comparten transacción.
No hay pacientes maestros ni identidad verificada. No cambiar umbrales clínicos.

La subida tiene reserva `PENDING`, luego `READY` o `FAILED`: **S3 y PostgreSQL no
comparten transacción**. Los pendientes/fallidos no aparecen en el historial público.
Después de un fallo de subida marcado `FAILED`, reenviar ID, contenido y metadatos
idénticos permite reintentar. MIME, canal, nombre original, tamaño, proveedor y bucket
se conservan; cambiarlos devuelve `409` antes de subir o modificar la reserva.
Un documento completo conserva el `409` existente.
Si se interrumpe después de subir pero antes de finalizar, esperar cinco minutos:

```powershell
.\.venv\Scripts\python.exe scripts\reconcile_storage.py ID-DEL-DOCUMENTO
```

Comprueba proveedor/bucket y hash antes de marcar `READY`; vuelve a comprobar la
identidad de la reserva bajo bloqueo después de leer el objeto. Un objeto ilegible,
hash diferente o reserva reemplazada no habilita el documento. El límite de cinco
minutos admite recuperación exactamente al cumplirse, no antes.
Si no se llegó a subir, **detener todos los
servidores/procesos de ingesta**, esperar cinco minutos, liberar reserva y reenviar:

```powershell
.\.venv\Scripts\python.exe scripts\reconcile_storage.py ID-DEL-DOCUMENTO --release-for-retry-after-stopping-server
```

No elimina objetos: un fallo ambiguo puede dejar originales huérfanos; limpieza con
política de retención y autorización queda pendiente. No hay downgrade destructivo.
No exponer API sin autenticación a Internet; esta configuración es solo demo sintética.

Las pruebas deterministas de recuperación usan SQLite y mocks, con reloj controlado
y cambios intercalados durante la lectura. No prueban bloqueos ni carreras reales
entre procesos PostgreSQL/S3; complementan, no reemplazan, la demo externa existente.

## Base de extracción v2: original primero

**Migración 0003 preparada localmente, todavía no aplicada a Neon.** El adaptador
PostgreSQL actualizado requiere esa migración antes de servir solicitudes; no usar
esta versión contra el schema 0002. Aplicación y verificación development se acuerdan
por separado. No se modificaron SDKs, claves ni proveedores de IA.

Orden actual: reservar registro → guardar original → confirmar almacenamiento READY
→ reclamar procesamiento → extraer sin transacción ni bloqueo de repositorio abiertos
→ finalizar con token vigente. Un fallo de extracción ya no pierde el original.
Almacenamiento y procesamiento son estados independientes:

| Procesamiento | Resultado consultable |
|---|---|
| PENDING | Original disponible; extracción aún no iniciada. |
| PROCESSING | Original descargable; resultado pendiente, revisión humana bloqueada. |
| SUCCEEDED | Contrato extraído disponible; decisión técnica existente. |
| FAILED | Original disponible, EXTRACTION_FAILED, revisión y confianza desconocida. |

El código público del error es `EXTRACTION_FAILED`, sin texto crudo de excepciones,
credenciales o respuestas del proveedor. Confianza desconocida es `null`, no cero.
Una aprobación humana conserva ese `null`; debe confirmar prioridad cuando falte.
Las fixtures simuladas existentes conservan sus resultados y respuestas exitosas 201.

Contrato v2 conserva paciente, tipo, prioridad y confianza; agrega profesional/matrícula,
estudio, indicación, diagnóstico y CIE10 sugerido opcionales. Ausente significa `null`,
no una inferencia. Proveniencia: proveedor/modelo/versión de prompt; schema versionado.
Evidencia: campo, página opcional y cita opcional, enlazada al original del triaje.
Una cita no demuestra veracidad clínica ni validación del diagnóstico/código CIE10.
JSON v1 se sigue leyendo como versión 1, sin inventar proveniencia ni evidencia.

La finalización técnica inicial establece extraction_original una sola vez. La migración
mantiene inmutables los originales de filas históricas y de resultados finalizados.
El token y la reserva de cinco minutos admiten reclamación explícita después de una
interrupción; **no hay reintento automático de proveedor ni endpoint de reprocesamiento**.
El trabajador que reclama debe conocer el token anterior; uno obsoleto no puede finalizar.
Una interrupción puede quedar PROCESSING hasta una acción explícita posterior.

Pruebas de memoria/SQLite y SQL generado offline verifican esta base sin red. No prueban
todavía el trigger 0003 ni su concurrencia en PostgreSQL real. La IA continúa simulada:
no OCR, Gemini, Google SDK ni LangGraph en esta etapa.

La corrección admite nombre, edad, tipo y prioridad. No permite editar score ni motivos
originales de auditoría. Una alerta previa se conserva aunque cambie la prioridad.
Las decisiones finales conservan el original y eventos inmutables durante la ejecución;
no generan despacho ni notificaciones. Dos revisiones compiten bajo un bloqueo local:
una se acepta y la segunda devuelve `409`; no hay garantías entre múltiples procesos.

Si el servidor fue iniciado sin `--reload`, reiniciarlo para cargar estos endpoints;
esto elimina el historial y las revisiones en memoria.

## Arquitectura

`domain` contiene decisiones y entidades sin frameworks; `application` contiene
el caso de uso y los puertos; `adapters/inbound/http` traduce solicitudes y respuestas;
`adapters/outbound` implementa simulación, memoria y almacenamiento local;
`infrastructure` configura y conecta los componentes. `app/main.py` es el entrypoint.

El notebook y su exportación `.py` de Colab se conservan en la raíz como referencias
del trabajo de IA. La API no los importa: la exportación contiene sintaxis `!pip`,
dependencias de Colab y ejecución interactiva; todavía no es un módulo Python ejecutable.

## Cambios de dependencias

Después de editar `pyproject.toml`, resolver y verificar:

```powershell
uv lock
uv sync --locked
uv export --locked --no-dev --format requirements-txt --output-file requirements.txt
```

Versionar los tres archivos juntos. `uv sync --locked` instala también el grupo de desarrollo.
