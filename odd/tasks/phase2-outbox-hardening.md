# Hardening del outbox de Fase 2

## Objetivo

Cerrar dos observaciones no bloqueantes de la revisión de Fase 2 antes de avanzar a
la entrega Slack: alinear el default del modelo ORM con la migración y aislar las
pruebas de cada restricción única.

## Alcance autorizado

- Alinear `attempt_count` en SQLAlchemy con `server_default=0` de la migración.
- Cubrir por separado unicidad de `idempotency_key` y de `(triage_id, event_type)`.
- Mantener el contrato y el comportamiento de notificaciones sin cambios.

## Fuera de alcance

- Cambios de esquema o migraciones nuevas.
- Ejecutar migraciones en Neon/PostgreSQL, enviar alertas o tocar secretos.
- Implementar worker, reintentos, Slack, reglas clínicas o cambios al pipeline.

## Criterios de aceptación

- [x] ORM y migración declaran el mismo default de `attempt_count`.
- [x] Cada restricción única se prueba con una colisión independiente.
- [x] Pruebas focalizadas, Ruff y `git diff --check` pasan.
- [x] La documentación no presenta la migración PostgreSQL/Neon como verificada.

## Tarea

- [ ] H2-T1 — Aplicar ambos hardenings con pruebas RED/GREEN y mantenerlos en un
  solo commit coherente.

## Verificación y entrega

- Ruta: delegada directa; modifica modelo y tests, ambos no triviales.
- Modelo sustituto `gpt-6.1-sol` autorizado para esta tarea.
- Unidad prevista: un commit; estrategia `ask-on-risk`, sin PRs.
- Verificación: suite de persistencia focalizada, Ruff check/format y diff check.
- Datos sintéticos únicamente; no ejecutar migraciones ni contactar servicios externos.
- Rama: `feature/backend-foundation`; sin push, PR, merge ni eliminación de ramas.

## Estado

- Implementación, autoverificación y revisión independiente completas; sin bloqueos.
  El coordinador reprodujo **37 aprobadas en 1.15 s**. El commit queda pendiente.
- RDD permanece desactivado; la evaluación de riesgo fue alta/no evaluable por el
  inventario sin seguimiento. Se aplicó revisión estática independiente, no RDD.
- El outbox principal está en `3925d17`; la Fase 3 Slack queda para después de
  validar la migración `0004` en un PostgreSQL de desarrollo autorizado.

## Evidencia H2-T1

- RED, antes del cambio del modelo: suite focalizada con **1 fallo y 36 pruebas
  aprobadas**. La inserción SQL que omite `attempt_count` falló por
  `NOT NULL constraint failed: notification_outbox.attempt_count`.
- Las dos pruebas independientes de unicidad ya pasaban en RED: una reutiliza
  `(triage_id, event_type)` con otra clave; la otra reutiliza `idempotency_key`
  con un segundo triaje válido. Ambas comprueban las columnas del error esperado.
- GREEN: **37 pruebas aprobadas en 1.29 s**, sin advertencias. El modelo conserva
  `default=0` y agrega `server_default="0"`, igual que la migración `0004`.
- Normalización antes de GREEN: Ruff reformateó los dos archivos Python afectados;
  no se modificó código después de la verificación final.

Comandos desde `backend/`:

```text
.venv/Scripts/python.exe -m pytest -q tests/test_persistence.py --basetemp=C:/Users/dark_/.codex/visualizations/2026/10/01/01a0f5b5-8b44-73a1-a61d-498227320ab6/hardening-sol-pytest
  RED: 1 failed, 36 passed, 1 warning in 3.77s (exit 1).
  GREEN: 37 passed in 1.29s (exit 0).
.venv/Scripts/python.exe -m ruff check app tests
  All checks passed! (exit 0).
.venv/Scripts/python.exe -m ruff format --check app tests
  43 files already formatted (exit 0).
```

Desde la raíz: `git diff --check`, exit 0; solo avisos de conversión LF/CRLF.
La advertencia RED provenía del adaptador implícito de fechas SQLite; el SQL final
envía una fecha ISO explícita y GREEN no presenta esa advertencia.

Límites: pruebas sobre SQLite con tablas creadas desde metadata, no validación de
migraciones PostgreSQL/Neon. Suite completa no ejecutada por el bloqueo previo
informado por el coordinador. No hay frontera runtime nueva: N/A para entrega real;
el único escenario adicional es la inserción local SQL sin default del cliente.
Reversión: modelo, pruebas y este registro forman una sola unidad; sin migraciones.
No se prepararon archivos ni se creó commit, push, PR o merge.
