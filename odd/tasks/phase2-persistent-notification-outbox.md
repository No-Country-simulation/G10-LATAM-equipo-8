# Phase 2: outbox persistente de revisión

## Objetivo

Persistir de forma atómica y deduplicada la intención de notificar cuando un triaje
finaliza en `NEEDS_AUDIT`, sin enviar mensajes ni guardar datos clínicos en la outbox.

## Decisión aprobada

- Una intención `REVIEW_REQUIRED` por triaje cuando el resultado final requiere
  revisión humana, incluyendo urgencia, ambigüedad, campos incompletos y error técnico.
- Clave idempotente derivada de `document_id + event_type`; almacenar su hash, no el
  identificador de documento en el contenido del evento.
- Canal previsto: Slack, según el orden del plan. Esta fase solo persiste la intención;
  no requiere webhook ni realiza envíos.
- Estado inicial `PENDING`. La fase no implementa worker, reintentos efectivos ni
  confirmación de entrega; deja metadatos seguros para que la fase de entrega los use.
- Sin payload libre, texto clínico, nombre/edad del paciente ni copia del documento.

## Alcance autorizado

- Extender el modelo SQLAlchemy y añadir una migración Alembic aditiva `0004`.
- Crear la intención de revisión en la misma transacción que finaliza y persiste el
  triaje en PostgreSQL.
- Persistir tipo, canal, estado, clave idempotente, referencia de triaje, contador y
  timestamps de intento/entrega/reintento, más código de error sanitizado.
- Añadir cobertura SQLite sintética de inserción, deduplicación, atomicidad y datos
  persistidos; documentar que no valida despliegue en Neon ni migración PostgreSQL real.
- Mantener el fallback, decisión clínica, contrato HTTP y revisión humana sin cambios.

## Fuera de alcance

- Envío Slack, email/Resend, worker/cron, interfaz HTTP de outbox, login, OCI, Jev y STT.
- Credenciales, llamadas externas, migrar una base remota o afirmar que el modo en
  memoria sobrevive reinicios.
- Cambios de score, umbrales clínicos, autorización automática o despacho.

## Criterios de aceptación

- [x] Un resultado `NEEDS_AUDIT` persiste una sola intención `REVIEW_REQUIRED`.
- [x] El idempotency key es estable por documento/tipo y el índice único impide duplicados.
- [x] Triage y outbox se confirman o revierten juntos en el adaptador PostgreSQL.
- [x] El registro no contiene payload clínico ni texto de excepción; solo metadatos permitidos.
- [x] Los resultados que no requieren revisión no crean intención.
- [x] El modelo ORM funciona con SQLite de pruebas y existe una migración Alembic aditiva; su ejecución PostgreSQL/Neon sigue pendiente.
- [x] Pruebas focalizadas, Ruff y `git diff --check` pasan; suite completa/Neon quedan declarados según lo realmente ejecutado.
- [x] Plan y bitácora distinguen outbox persistente de entrega externa aún no implementada.

## Tareas

- [x] P2-T1 — Implementar el contrato de evento y la persistencia atómica completa,
  con migración, deduplicación, pruebas sintéticas y documentación. Se mantiene como
  una unidad de trabajo para evitar commits intermedios que dejen el flujo incompleto.

### Subpasos de P2-T1

1. [x] Definir el evento y su clave idempotente estable sin guardar el identificador en claro.
2. [x] Añadir modelo y migración aditiva con metadatos mínimos y estados de entrega futuros; la ejecución no se verificó contra PostgreSQL/Neon.
3. [x] Insertar la intención en la misma transacción que finaliza el triaje en `NEEDS_AUDIT`.
4. [x] Probar atomicidad, unicidad, ausencia de payload sensible y casos sin revisión.
5. [x] Actualizar plan, bitácora y evidencia de verificación.

## Verificación y entrega

- Ruta: delegada directa; requiere coordinación de dominio, modelo ORM, migración,
  transacción, pruebas y documentación (más de dos archivos no triviales).
- Pronóstico: aproximadamente 220 líneas autorales; estrategia `ask-on-risk`, con PRs
  deshabilitados por la política del proyecto.
- Rama actual: `feature/backend-foundation`; no crear ni fusionar ramas.
- Usar solo datos sintéticos y el entorno local existente; no leer `.env` ni contactar Neon.
- La autorización de implementación incluye commits de unidad de trabajo, pero no push,
  PR, merge ni eliminación de ramas.
- Verificación enfocada desde `backend/`, según el runner que esté disponible; no declarar
  verificada la migración remota sin ejecutarla en PostgreSQL.

## Estado

- Aprobado por el usuario: disparador `NEEDS_AUDIT`, deduplicación por documento/tipo,
  sin envío hasta la fase siguiente.
- Implementación local: modelo de dominio, tabla SQLAlchemy, migración aditiva `0004`
  e inserción en la misma transacción de finalización. SQLite confirmó deduplicación,
  rollback conjunto, metadatos permitidos y ausencia de intención para rutina.
- TDD: RED observado como `ImportError` de `NotificationOutboxRow` durante colección;
  después de la implementación, 35 pruebas de `test_persistence.py` pasaron.
- Ruff check, Ruff format check y `git diff --check` pasaron. La suite completa se
  inició y se interrumpió sin salida ni resumen; no se declara aprobada. `uv` no está
  disponible, así que se usaron herramientas de `backend/.venv`.
- La migración `0004` no se ejecutó localmente ni en Neon. No se realizaron llamadas
  externas. No se implementó envío, worker ni reintento efectivo; el repositorio en
  memoria tampoco persiste el outbox. Ninguna prueba valida seguridad clínica o despacho.
- La revisión independiente no encontró bloqueos. Señaló como mejoras no bloqueantes
  alinear el default cliente/servidor de `attempt_count` y separar los casos de colisión
  de las dos restricciones únicas. La compatibilidad PostgreSQL/concurrencia sigue sin
  verificarse con SQLite.
- La evaluación nativa reportó riesgo `high` por inventario de archivos no rastreados;
  RDD está desactivado y no se inició ciclo nativo. El coordinador repitió la prueba
  focalizada: 35 pasaron. No hubo push, PR ni merge.
- La suite completa sigue sin resultado; la migración no se ejecutó en PostgreSQL/Neon.
  Ninguna de las dos limitaciones se presentará como verificada.
- Commit de unidad de trabajo: `3925d17` (`feat(notificaciones): persistir intenciones de revisión`).
- Siguiente: decidir cómo y cuándo ejecutar la migración en un PostgreSQL seguro antes
  de declarar persistencia operativa en ese entorno; después, pasar a la fase de envío
  Slack, sin reenviar estados o mensajes clínicos no aprobados.
