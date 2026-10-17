# Validación aislada de la migración outbox 0004 en Neon

## Objetivo y autorización

Comprobar la migración existente del outbox en PostgreSQL real sin modificar las
bases compartidas. El usuario autorizó corroborar la rama Neon y proceder con la
propuesta de rama de pruebas aislada. No autoriza merges Git ni cambios en producción.

## Destinos y alcance

- Proyecto: `wandering-voice-40276879`.
- Padre de solo lectura: `development`, ID `br-broad-bread-b4sii0lv`.
- Hija autorizada: `test/outbox-0004`, creada desde el padre anterior.
- ID de la hija creada: `br-noisy-tooth-b4y7bq5u`, no predeterminada.
- Base: `mediflow-bd`. Usar la sesión Neon configurada mediante MCP; CLI metadata
  no disponible por bloqueo de su refresh lock.
- Aplicar únicamente el SQL generado por Alembic para `0003_processing_state` a
  `0004_notification_outbox` y ejecutar comprobaciones sintéticas reversibles en la hija.
- No borrar ramas, resetear entornos, tocar objetos/documentos, enviar alertas,
  modificar secretos, instalar herramientas ni migrar `development` o `production`.

## Evidencia inicial y decisión técnica

- `.neon` está vinculada a `development`, no a `develop`. Las conexiones efectivas
  de la aplicación coinciden con el endpoint de esa rama y la base esperada.
- El padre está en `0003_processing_state`; `notification_outbox` no existe.
- `Settings` restringe las conexiones al endpoint development vinculado. No debilitar
  esa protección ni editar `.neon` o archivos de entorno para dirigirla a la hija.
- Generar SQL mediante el modo offline de Alembic y ejecutarlo transaccionalmente
  solo en la hija. Esto no prueba el runner online ni FastAPI contra esa hija.

## Tarea y aceptación

- [x] N4-T1 — Crear la hija, verificar su padre y baseline, renderizar/aplicar el SQL
  versionado, comprobar catálogo y restricciones con fixtures sintéticos revertidos,
  revalidar el padre intacto y documentar evidencia en un commit.

### Comprobaciones

- [x] Hija identificada por ID explícito, distinta de development/production.
- [x] Alembic `0004`, tabla, tipos, FK, dos restricciones únicas, tres checks y default 0.
- [x] Default omitido funciona; contador negativo, tipo/canal inválidos, FK inexistente
  y colisiones independientes de las dos claves son rechazados.
- [x] Fixtures sintéticos revertidos; ningún dato de prueba persiste.
- [x] Development permanece en `0003` y sin tabla outbox; producción no se consulta.
- [x] Configuración local intacta; evidencia no contiene credenciales ni datos clínicos.

## Ruta, verificación y entrega

- Ruta delegada directa: operaciones de proveedor, generación SQL y comprobaciones
  requieren preparación técnica y verificación acotada independiente.
- TDD no aplica: no cambia código funcional. Se observa baseline y estado posterior
  en la hija; no llamar RED/GREEN a la ejecución de la migración.
- Pronóstico: aproximadamente 120 líneas de documentación; `ask-on-risk`, sin PRs.
- No hay código para normalizar. `git diff --check` y lectura estructural aplican a docs.
- La creación puede consumir cómputo de Neon. Prueba acotada y sin envíos externos.
- Reversión: la hija se conserva aislada; no ejecutar el downgrade destructivo ni
  eliminar la rama sin autorización adicional.
- No hacer push, PR, merge ni crear ramas Git. Commits locales por unidad verificada.

## Estado

- Migración y verificaciones de la hija completas. Commit documental `5803641`:
  `docs(neon): registrar validación aislada del outbox` (146 líneas añadidas).
- Revisión independiente de solo lectura sin bloqueos: confirmó esquema completo,
  revisión de hija/padre y cero fixtures. El coordinador confirmó también las dos
  revisiones y presencia/ausencia de la tabla; no repitió escrituras sintéticas.
- Evaluación nativa alta/no evaluable por inventario sin seguimiento; RDD desactivado.
  Se usaron autoverificación, revisión independiente y comprobación del coordinador.
- La suite completa Python sigue sin resultado; esta tarea no la presenta aprobada.
- Siguiente: solo tras este resultado decidir la migración de desarrollo y el inicio
  de Slack. Un éxito en la hija no significa que development ya esté actualizada.

## Evidencia observada — 2026-10-16 (America/Lima)

| Comprobación | Resultado |
| --- | --- |
| Identidad y baseline | Hija `br-noisy-tooth-b4y7bq5u`, padre `br-broad-bread-b4sii0lv`, no predeterminada; `0003_processing_state`, outbox ausente |
| SQL versionado | Desde `backend/`: `.venv/Scripts/python.exe -m alembic upgrade 0003_processing_state:0004_notification_outbox --sql`; salida 0 |
| Huella del SQL completo | SHA-256 `49e76f6125c56158f8eb51d4fe8da4401089d3ce9963e57eebf90add09d12782` (stdout UTF-8 con LF, incluye BEGIN/COMMIT) |
| Aplicación MCP | `run_sql_transaction`, proyecto/base/ID de hija explícitos; CREATE y UPDATE generados, sin reescritura ni BEGIN/COMMIT externos |
| Guardas de transacción | Bloqueo de `alembic_version`; baseline exacto y tabla ausente antes de CREATE; revisión única `0004_notification_outbox` y tabla presente al finalizar |
| Catálogo PostgreSQL | Coincidencia exacta de 12 columnas: tipos, longitudes, nulabilidad y default; siete restricciones: PK, FK, dos únicas y tres checks |
| Datos sintéticos | Dos documentos y dos triajes efímeros; siete aserciones exitosas; subtransacción revertida y conteo posterior de fixtures igual a 0 |
| Padre posterior | Solo SELECT: `0003_processing_state`, outbox ausente; ninguna consulta a producción |
| Configuración local | Cuatro archivos comparados byte a byte por SHA-256: `.neon`, `.env.local`, `backend/.env`, `backend/.env.example`; todos intactos |

Las siete aserciones verificaron el default real al omitir `attempt_count` y el
rechazo por las siguientes restricciones, comprobando nombre y clase SQLSTATE:

- `ck_notification_outbox_attempt_count`: contador negativo.
- `ck_notification_outbox_event`: evento distinto de `REVIEW_REQUIRED`.
- `ck_notification_outbox_channel`: canal distinto de `SLACK`.
- `notification_outbox_triage_id_fkey`: triaje sintético inexistente.
- `uq_notification_outbox_idempotency`: misma clave, otro triaje válido.
- `uq_notification_outbox_triage_event`: mismo triaje/evento, otra clave.

El bloque `DO` usa excepciones anidadas para cada rechazo esperado y una excepción
controlada `P4004` solo después de las siete aserciones para revertir todos los
fixtures. Los errores inesperados se propagan; no se borraron filas existentes.
El catálogo confirma FK a `triages(id)` y default PostgreSQL `0`.

### Incidencias acotadas y límites

- El primer intento transaccional fue rechazado por comandos múltiples en una entrada
  preparada; se releyó baseline `0003`/tabla ausente antes de separar los dos comandos
  generados en entradas distintas. La siguiente transacción fue exitosa.
- Una consulta de catálogo falló por `ORDER BY` sobre una expresión de UNION; se
  corrigió mediante subconsulta de solo lectura y se obtuvo el catálogo completo.
- Alembic offline recibió `AI_MODE=simulated` y `STORAGE_MODE=local` únicamente en
  el entorno de su subproceso; no abrió conexión de base ni cambió el entorno padre.
  No se debilitó la guarda de hostname de `Settings`.
- La evidencia cubre SQL generado, catálogo y restricciones PostgreSQL, no el runner
  online de Alembic, FastAPI contra la hija, persistencia de extremo a extremo,
  concurrencia, Slack, seguridad clínica ni la suite completa Python.
- La hija permanece aislada en `0004`; no se ejecutaron downgrade, reset, borrado,
  instalaciones, cambios funcionales, push, PR ni merge.
