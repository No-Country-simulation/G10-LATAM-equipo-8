# Backend: primera etapa funcional

Python **3.12.14**. Dependencias declaradas en `pyproject.toml`, resolución fija
en `uv.lock`. `requirements.txt` es una exportación de runtime para pip, no se edita a mano.

Desde `backend/`, con [uv](https://docs.astral.sh/uv/getting-started/installation/) instalado:

```powershell
uv sync --locked
Copy-Item .env.example .env
uv run --locked uvicorn app.main:app --reload
```

Swagger: <http://127.0.0.1:8000/docs>. OpenAPI: <http://127.0.0.1:8000/openapi.json>.
Ejecutar con un solo proceso: el repositorio en memoria no se comparte entre workers.

```powershell
uv run --locked pytest -q
uv run --locked ruff check app tests
uv run --locked ruff format --check app tests
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
- Documentos en disco, bajo `STORAGE_DIR`; estados e historial **en memoria**.
  Al reiniciar se pierde el historial, aunque los archivos siguen en disco.
- `almacenamiento_oci` es `null`; `almacenamiento.proveedor` informa `local`.
- `alerta_urgente` indica la decisión; no envía Slack/email. `notificacion_generada` es `null`.
- La ingesta binaria comprueba MIME, firma inicial y tamaño (10 MiB por defecto).
  No es todavía un parser completo de PDF o imágenes.
- Revisión humana implementada en memoria; sin autenticación, base de datos ni integración OCI.
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
