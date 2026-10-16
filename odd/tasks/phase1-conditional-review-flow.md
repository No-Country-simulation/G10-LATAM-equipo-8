# Phase 1: flujo condicional con revisión humana

## Objetivo

Completar la primera fase de MediFlow con rutas condicionales verificables para
documentos sintéticos rutinarios, ambiguos, urgentes y con error, conservando la
revisión humana como autoridad final. No se activan umbrales ni un score clínico.

## Problema y motivo

El checkpoint Gemini ya tiene un grafo LangGraph lineal (`extract → validate →
review_policy`). La confianza reportada se valida como dato, pero no gobierna rutas.
Alura pide bifurcaciones para ambigüedad, urgencia y baja confianza; el equipo aún no
aprobó criterios clínicos ni umbrales. Esta fase debe hacer explícitos los caminos
operativos existentes sin presentar una propuesta como regla clínica aprobada.

## Alcance autorizado

- Añadir bifurcaciones al grafo usando solo señales ya existentes y explícitas del
  dominio: motivos de auditoría, campos requeridos ausentes y prioridad urgente.
- Mantener el fallback técnico existente en el límite de `ProcessDocument`; no convertir
  excepciones en éxito ni duplicar su sanitización dentro del grafo.
- Mantener cualquier señal urgente en `NEEDS_AUDIT`/`REVISION_HUMANA`; solo la revisión
  humana explícita puede autorizar después el destino de emergencia.
- Conservar el resultado rutinario como propuesta y la revisión humana antes de una
  autorización de enrutamiento; una alerta de urgencia nunca equivale a despacho.
- Mantener intacta la persistencia original-first y los códigos de error sanitizados.
- Añadir pruebas locales sintéticas y actualizar el plan/bitácora con el estado observado.

## Fuera de alcance y restricciones

- No crear ni activar umbrales clínicos, pesos, score nuevo o calibración.
- No permitir que confianza declarada por el modelo autorice un destino.
- No enviar alertas Slack/email, no añadir esquema de outbox ni credenciales.
- No implementar login, OCI, Jev/TypeSafe, Doctoc/STT ni despacho real.
- No usar documentos o datos reales; no leer `.env`, claves ni secretos.
- No ejecutar llamadas remotas a Gemini, Neon, OCI, Slack o Resend.
- No modificar el contrato HTTP salvo que la implementación y pruebas existentes exijan
  un cambio mínimo y compatible; cualquier cambio requerido se devuelve al coordinador
  antes de ampliar el alcance.

## Criterios de aceptación

- [x] El grafo contiene rutas condicionales explícitas y cada rama tiene una traza
  verificable para los casos sintéticos rutinario, ambiguo e urgente.
- [x] El error técnico sigue el fallback fail-closed de `ProcessDocument`, conserva el
  original y no expone detalles internos; se cubre en una prueba focalizada.
- [x] Los casos ambiguos/incompletos y los errores terminan en revisión humana.
- [x] Una señal urgente conserva la bandera de alerta y requiere revisión humana; no
  autoriza por sí sola `EMERGENCIA_MEDICA` ni un despacho.
- [x] El caso rutinario no recibe una aprobación humana ni despacho por automatismo.
- [x] No se usa un corte numérico de confianza para enrutar; el valor puede conservarse
  como dato reportado no calibrado.
- [x] Se preserva el archivo original y se mantienen sanitizados los fallos técnicos.
- [x] Las pruebas focalizadas autorizadas pasan; se ejecutan Ruff check/format y `git
  diff --check` de manera proporcional.
- [x] La documentación diferencia lo implementado de lo pendiente y mantiene OCI como
  requisito de Alura todavía no acreditado.

## Tareas

- [x] P1-T1 — Implementar bifurcaciones condicionales del grafo con señales existentes,
  revisión humana obligatoria y sin umbrales nuevos; bloquear destino urgente automático.
- [x] P1-T2 — Cubrir rutas sintéticas, autorización humana y fallback técnico con pruebas
  focalizadas.
- [x] P1-T3 — Actualizar el estado de fase 1 en el plan y la bitácora con los resultados
  realmente verificados.

## Ruta, verificación y entrega

- Ruta: delegada directa; el mapeo previo encontró cambios coordinados en el grafo,
  pruebas y documentación (dos o más archivos no triviales).
- Pronóstico: aproximadamente 150 líneas autorales entre grafo, dominio, pruebas y
  documentación; estrategia `ask-on-risk`, sin crear PRs.
- Evidencia de mapeo: `backend/app/application/triage_pipeline.py:20-70`,
  `backend/app/domain/triaje.py:45-118`, `backend/tests/test_triage_pipeline.py` y
  `backend/tests/test_review_domain.py`; `docs/mediflow-agente-autonomo.md:174-180`.
- Verificación observada desde `backend/` con ejecutables existentes de `.venv` porque
  `uv` no está disponible: `.venv/Scripts/python.exe -m pytest -q
  tests/test_triage_pipeline.py tests/test_review_domain.py` con `--basetemp` en un
  subdirectorio nuevo autorizado de visualizaciones (23 aprobadas);
  `.venv/Scripts/ruff.exe check app tests` (aprobado);
  `.venv/Scripts/ruff.exe format --check app tests` (aprobado, aviso de caché con
  exit code 0). `git diff --check` pasó con advertencias LF/CRLF.
- El usuario autorizó ejecutar pruebas focalizadas locales para esta fase. No equivale
  a repetir la suite completa ni a validar seguridad clínica.
- No push, PR, merge ni eliminación de ramas. La rama de trabajo actual es
  `feature/backend-foundation`; commit de unidad de trabajo se hará después de verificar
  y revisar solo los archivos de este incremento.

## Estado

- Preparación: aceptada por el usuario. Se implementaron las ramas condicionales,
  decisión de dominio segura y pruebas sintéticas de ruta, autorización humana,
  confianza reportada y fallback original-first.
- Verificación final: 23 pruebas focalizadas aprobadas por el trabajador y 23 en el
  spot-check del coordinador; Ruff check, Ruff format check y `git diff --check`
  aprobados. La suite completa no se ejecutó. No se afirma validación clínica,
  persistencia durable del grafo ni despacho real.
- Revisión estática: `gentle-ai review assess` informó riesgo alto/no evaluable porque
  los archivos sin seguimiento no estaban declarados; la revisión estática
  independiente no encontró bloqueos. El commit sigue pendiente; no hubo push, PR ni
  merge.
- La prueba focalizada del fallo técnico verifica explícitamente que el fallback deja
  la decisión en `NEEDS_AUDIT`/`REVISION_HUMANA`, además de conservar el original y
  sanitizar el código de error.
- Pendiente explícito: definir con responsables humanos cualquier criterio clínico o
  umbral antes de activarlo; integración OCI sigue pendiente para completar Alura.
