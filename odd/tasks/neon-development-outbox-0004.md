# Aplicar outbox 0004 en Neon development

## Objetivo y autorización

El usuario autorizó aplicar `0004` en Neon `development` con la sesión y conexión
configuradas y continuar luego hacia Slack. El SQL ya fue probado en una hija aislada.
Esta unidad no implementa Slack ni autoriza merges Git o cambios en producción.

## Destino y alcance

- Proyecto `wandering-voice-40276879`, rama `development`, ID `br-broad-bread-b4sii0lv`.
- Base `mediflow-bd`; usar conexión directa configurada mediante Alembic online.
- Baseline releído antes de empezar: `0003_processing_state`, outbox ausente.
- Aplicar solo la migración existente `0004_notification_outbox`; no reautorizar SQL
  manual, ejecutar downgrades, resetear, borrar ramas ni modificar datos existentes.
- La hija `test/outbox-0004` (`br-noisy-tooth-b4y7bq5u`) se conserva intacta.
- No acceder a producción, otros proyectos, Gemini, Slack, buckets ni credenciales nuevas.
- No editar `.neon`, archivos de entorno, código funcional o migraciones.

## Tarea y aceptación

- [x] D4-T1 — Verificar destino directo, aplicar Alembic online, comprobar esquema y
  fixtures sintéticos reversibles, obtener revisión independiente y registrar evidencia.

### Comprobaciones

- [x] URL efectiva corresponde al endpoint de development y no al pooler.
- [x] Migración online termina en `0004`; esquema coincide con la hija ya probada.
- [x] Default y restricciones se verifican con SQL sintético sin datos persistentes.
- [x] Conteos previos de las tablas existentes se conservan; fixtures finales igual a 0.
- [x] Archivos de configuración sin cambios y sin exposición de secretos.
- [x] Revisión independiente y comprobación del coordinador sin bloqueos.

## Ruta y verificación

- Ruta delegada directa: operación remota, verificación SQL y documentación acotadas.
- TDD no aplica: no cambia código; verificar baseline y estado posterior real.
- Comando objetivo desde `backend/`: `.venv/Scripts/python.exe -m alembic upgrade 0004_notification_outbox`.
- Proveedores de IA/storage solo se aíslan en el entorno del subproceso (simulated/local).
- En fallo ambiguo, consultar revisión/esquema antes de cualquier repetición; no retry ciego.
- Comprobar catálogo, default 0, FK, dos claves únicas y tres checks; insertar únicamente
  fixtures sintéticos en subtransacciones revertidas, sin DELETE, DROP o TRUNCATE.
- No probar concurrencia, ingesta real, alertas o seguridad clínica como parte de esta unidad.
- Documentación: `git diff --check` y lectura estructural. Suite completa Python sigue pendiente.
- Pronóstico: 110 líneas documentales; estrategia `ask-on-risk`, sin PRs.
- Commit local por unidad; sin push, ramas Git nuevas, merges ni borrados.

## Estado y siguiente paso

- Aplicación online, autoverificación y revisión independiente completas, sin bloqueos.
  El coordinador confirmó `0004`, tabla presente y outbox vacío.
- Commit de evidencia: `fa188ed` — `docs(neon): registrar migración online de development`
  (136 líneas documentales añadidas).
- El verificador confirmó catálogo, conteos y cero fixtures mediante SELECTs; los siete
  ensayos históricos y hashes de configuración permanecen reportados por el ejecutor.
- RDD desactivado; evaluación alta/no evaluable por inventario sin seguimiento.
  Verificación ordinaria aplicada: ejecutor, verificador independiente y coordinador.
- Evidencia previa: `odd/tasks/neon-outbox-0004-validation.md`, commits `5803641`, `5895413`.
- Después de verificar development, preparar Fase 3 Slack con worker independiente,
  configuración secreta externa al repositorio, alertas sintéticas mínimas y fallos
  que no cambien la ingesta ni la decisión del triaje.

## Evidencia observada — 2026-10-17 (America/Lima)

| Comprobación | Resultado |
| --- | --- |
| Destino | Metadata MCP de development coincide con el hostname directo efectivo y la base `mediflow-bd`; sin pooler ni cambio de configuración |
| SQL previo | Alembic offline `0003_processing_state:0004_notification_outbox --sql`, salida 0; stdout UTF-8/LF SHA-256 `49e76f6125c56158f8eb51d4fe8da4401089d3ce9963e57eebf90add09d12782`, idéntico al validado en la hija |
| Baseline inmediato | Conexión directa del mismo proceso: base esperada, revisión `0003_processing_state` y tabla outbox ausente antes de lanzar Alembic |
| Aplicación online | Desde `backend/`: `.venv/Scripts/python.exe -m alembic upgrade 0004_notification_outbox`; salida 0, stdout/stderr capturados de 0 bytes |
| Estado posterior | MCP confirma `0004_notification_outbox` y tabla presente; 12 columnas con tipos, longitudes, nulabilidad y default exactos; siete restricciones coinciden con la migración |
| Datos existentes | Conteos antes/después: `documents` 20/20, `triages` 20/20 y `review_events` 6/6; outbox final 0. No se observó deriva de conteos; esto no prueba ausencia de cambios concurrentes |
| Fixtures | Prefijo único `d4v261017_63a7`; dos documentos y dos triajes efímeros, siete aserciones exitosas; conteos finales de fixtures 0/0/0 en documentos/triajes/outbox |
| Configuración | SHA-256 antes/después de `.neon`, `.env.local`, `backend/.env` y `backend/.env.example`: cuatro coincidencias, sin imprimir secretos |

### Aserciones PostgreSQL reversibles

Se insertó una notificación omitiendo `attempt_count` y se comprobó el default real 0.
Cada rechazo esperado verificó tanto SQLSTATE como el nombre exacto de la restricción:

- `23514` / `ck_notification_outbox_attempt_count`: contador negativo.
- `23514` / `ck_notification_outbox_event`: evento inválido.
- `23514` / `ck_notification_outbox_channel`: canal inválido.
- `23503` / `notification_outbox_triage_id_fkey`: triaje inexistente.
- `23505` / `uq_notification_outbox_idempotency`: misma clave con otro triaje válido.
- `23505` / `uq_notification_outbox_triage_event`: mismo triaje/evento con otra clave.

Las seis colisiones se aislaron en bloques de excepción anidados. Solo tras verificar
las siete aserciones se lanzó `P4004`, capturada por el bloque exterior para revertir
todos los fixtures; los errores inesperados se propagan. El mismo bloque comprobó
el rollback y cero fixtures; una consulta posterior independiente confirmó los ceros.
No se ejecutaron DELETE, DROP, TRUNCATE, downgrade ni cambios en datos existentes.

### Incidencias y límites

- El primer preflight directo dentro del sandbox falló con `OperationalError` antes
  de lanzar la migración. No hubo intento de escritura ni error ambiguo de Alembic.
  El contexto elevado autorizado repitió la guarda directa y lanzó una sola migración.
- `AI_MODE=simulated` y `STORAGE_MODE=local` se fijaron únicamente en los procesos
  Python/subprocesos de comprobación y Alembic; no cambió el entorno padre ni archivos.
  Se conservó la validación de hostname de `Settings`.
- A diferencia de la prueba previa en la hija, este resultado sí verifica el runner
  ONLINE de Alembic sobre development. No verifica FastAPI/ingesta completa, datos
  clínicos, concurrencia, worker/reintentos, Slack, despacho ni seguridad clínica.
- La suite completa Python sigue pendiente; no se repitió porque el código no cambió.
  Producción no se consultó; la hija se conservó sin operaciones. No se instalaron
  herramientas ni se hicieron llamadas a IA, almacenamiento o Slack.
