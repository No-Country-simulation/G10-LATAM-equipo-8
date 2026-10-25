# MediFlow: cierre del backend Alura, audio y JEV

## Objetivo
Cerrar el flujo de backend solicitado por Alura con evidencia verificable y límites seguros, e incorporar voz/audio como una fase diferenciadora posterior al núcleo. Evaluar JEV/TypeSafeAI como capacidad opcional y no clínica, sin permitir que tome decisiones de triaje.

## Problema y motivo
Hay capacidades implementadas, pendientes y propuestas mezcladas entre la rúbrica, el plan y el registro de estado. Se necesita una matriz trazable requisito → comportamiento esperado → prueba antes de declarar cumplimiento o ampliar el flujo.

## Alcance autorizado
- Iniciar por reconciliar requisitos de Alura con comportamiento y pruebas existentes; documentar estado y brechas, sin inferir que algo está demostrado si falta evidencia.
- Después, avanzar por fases bajo estas restricciones: revisión humana; datos sintéticos; no usar score de extracción como riesgo clínico; no inventar umbrales clínicos; no afirmar validación clínica.
- Mantener audio como fase explícita del plan. JEV es una evaluación opcional, con puerta de aprobación antes de integración real.
- No clonar frontend, no ejecutar operaciones remotas en Neon, no integrar proveedores ni consumir credenciales sin autorización y alcance específico.
- Preservar cambios preexistentes del usuario en `docs/BACKEND_PRIMERA_ETAPA.md`.

## Fases
1. **Matriz de aceptación Alura (en curso):** requisito, conducta observable, evidencia de implementación, prueba/evidencia existente, estado y brecha.
2. **Flujo condicional seguro:** separar completitud técnica, evidencia verificable y señales de urgencia; definir salidas explícitas y trazables para incompleto, contradictorio, urgente, error de IA y fallo de almacenamiento. Ninguna salida autoriza una decisión médica automática.
3. **Persistencia y objetos:** verificar con datos sintéticos persistencia Neon + OCI, reinicio, auditoría, concurrencia y recuperación del original; cualquier prueba remota requiere autorización operativa concreta.
4. **Integración frontend y controles:** validar desde el navegador contra el contrato acordado; añadir autenticación/autorización antes de proteger revisiones y descargas; definir cancelar/reemplazar con trazabilidad, no borrado físico indiscriminado.
5. **Voz/audio (incluida como diferenciador):** acordar contrato de carga, consentimiento, formatos/límites, transcripción, procedencia/segmentos, retención, fallos y revisión humana; probar con audios sintéticos. Sin diagnóstico, prescripción o enrutamiento clínico automático.
6. **JEV/TypeSafeAI (evaluación opcional):** decidir si aporta valor a alertas operativas o enriquecimiento de revisión; primero diseño/PoC aislado, feature-flagged y advisory/shadow, con procedencia y salida tipada. No reemplaza extracción Gemini, no interpreta audio directamente como parte del MVP, no decide urgencia/destino.
7. **Cierre de demo y documentación:** repetir escenarios rutinario, urgente y ambiguo/incompleto, verificar revisión, descarga y persistencia, consolidar evidencia y límites conocidos.

## Tareas y estado
- [x] T1 — Crear la matriz inicial de aceptación contrastando la rúbrica con código, tests y documentos existentes.
- [ ] T2 — Resolver brechas de flujo seguro a partir de la matriz mediante subtareas pequeñas y verificables.
- [ ] T3 — Verificar persistencia Neon/OCI con fixtures sintéticos y autorización remota cuando aplique.
- [ ] T4 — Validar contrato con el frontend y controles de acceso antes de datos no sintéticos.
- [ ] T5 — Especificar e implementar el alcance acordado de voz/audio.
- [ ] T6 — Evaluar JEV; su integración requiere una decisión explícita y no altera decisiones clínicas.
- [ ] T7 — Ejecutar aceptación E2E y actualizar documentación.

## Decisiones del contrato T2
- **T2.1 aceptada e implementada:** si `patient_name` falta, es nulo, vacío o contiene solo espacios, el documento queda en `NEEDS_AUDIT` para revisión humana. No se rechaza ni se enruta automáticamente; el score/confianza y prioridad no cambian.
- **T2.2 aceptada e implementada:** añadir `asserted_value` opcional por referencia de evidencia; validar que el valor aparezca literalmente en su cita y, si hay valores distintos para el mismo campo, señalar un posible conflicto y requerir revisión humana. Conservar todas las evidencias y valores, sin seleccionar uno ni tratar el conflicto como riesgo clínico. Mantener compatibilidad con extracciones JSON existentes que no tengan la propiedad; no se agregó una migración de columnas de Neon/Postgres.
- **T2.3 aceptada, verificación pendiente:** ante un fallo de almacenamiento, la API responde `503` y no expone ningún triaje. Postgres puede conservar una reserva interna en estado `FAILED`, que no aparece en el listado público. El reintento solo se permite con el mismo ID de documento y bytes/metadatos idénticos; un archivo diferente es una nueva carga y requiere un ID nuevo. La inspección de `ProcessDocument`, `MemoryTriageRepository` y `PostgresTriageRepository` indica que el comportamiento existente cumple el contrato; no se cambia código ni esquema en esta tarea.

## Criterios de aceptación de T1
- Todos los requisitos explícitos del checklist de Alura aparecen en filas separadas o en subfilas legibles.
- Cada fila expresa un comportamiento observable y una prueba concreta, con evidencia de código/tests/documentos cuando exista.
- Los estados distinguen implementado con evidencia, parcial, pendiente y no verificable; no se confunden afirmaciones documentales con pruebas ejecutadas.
- Las incógnitas de política/umbrales quedan identificadas como decisiones pendientes; no se inventan reglas clínicas.
- La matriz mantiene los límites: uso sintético, revisión humana y ausencia de validación clínica acreditada.

## Verificación aplicable
- `git diff --check`
- Lectura de vuelta de la matriz y cotejo puntual contra checklist Alura, tests citados y rutas del backend.
- N/A: pruebas funcionales, porque T1 es documentación de aceptación y no cambia comportamiento ejecutable.

## Ruta y progreso
- T1: ruta delegada directa para lectura de evidencia y creación del artefacto documental; selección motivada por el requisito de leer fuentes antes de redactar y preservar evidencia. El padre hará un spot-check de requisitos/estados.
- T1 terminado: `docs/ALURA_ACCEPTANCE_MATRIX.md` creado, leído de vuelta y cotejado con checklist, módulos y pruebas citadas; el spot-check confirmó campos de medicamentos/dosis ausentes, score no calibrado y ausencia de verificación OCI en vivo.
- Verificación de T1: `git diff --check` sin errores; no se ejecutaron pruebas funcionales ni accesos externos porque el cambio es documental.
- Commit de unidad de trabajo T1: `e7b9360` (`docs(alura): documentar matriz de aceptación`).
- T2 auditoría de solo lectura: condiciones actuales y pruebas existentes quedaron registrados en Engram (`backend/conditional-flow-contract`); no hubo cambios funcionales.
- T2.1: `decide()` aplica la condición de nombre faltante y hay pruebas parametrizadas para nulo/vacío/espacios y nombre presente; matriz actualizada.
- Verificación T2.1: RED observado (3 casos fallaron antes del cambio); GREEN con `backend/.venv/Scripts/pytest.exe -q tests/test_triage_pipeline.py --basetemp C:/Users/dark_/Desktop/G10-LATAM-equipo-8/backend/.pytest-independent-t21 -p no:cacheprovider` (9 passed, repetido por verificador independiente); Ruff check/format y `git diff --check` reportados como pasados. `uv` no está instalado, por eso no se pudo usar la invocación prescrita.
- Evaluación RDD: modo clone-local `off`; `gentle-ai review assess` resultó `unassessable/high` porque el sandbox denegó acceso al índice `.git`. Se hizo revisión estructural del padre y verificación independiente; no se inició RDD.
- Commit de unidad T2.1: `2b44279` (`fix(triaje): enviar nombres faltantes a revisión humana`).
- T2.2 feasibility audit: evidencia actual usa `field/page/quote`; hay múltiples referencias por campo, pero el extractor solo valida literalidad y no compara valores. El padre no implementó comparación semántica especulativa.
- T2.2 implementada: `SourceReference.asserted_value` es opcional; Gemini requiere apoyo literal en la cita, conserva evidencias múltiples y marca `POSSIBLE_EVIDENCE_CONFLICT` solo entre valores distintos del mismo campo, tras normalizar únicamente mayúsculas/minúsculas y espacios. La salida requiere revisión humana y no altera prioridad, confianza, urgencia ni estado técnico. El esquema de extracción pasa a versión 3; JSON anterior sin el campo se decodifica como `None`; no se agrega columna SQL. La respuesta HTTP incluye el valor por referencia.
- Verificación inicial T2.2: RED/GREEN observados; 128 pruebas pasaron con 3 casos HTTP excluidos por entorno Windows/TestClient. Revisión independiente detectó que una cita que sustentaba `asserted_value` podía ocultar que el valor agregado del campo no estaba sustentado.
- Commit de unidad T2.2: `0ab9b5d` (`feat(triaje): marcar posibles conflictos de evidencia`).
- Corrección T2.2: la validación del valor agregado ahora es independiente de la de cada referencia; se añadió la regresión para `patient_name=Invented` frente a cita/afirmación `Demo`. Commit: `a0a02ae` (`fix(triaje): validar valor extraido y evidencia`).
- Verificación final T2.2 en el HEAD corregido: RED confirmado para la regresión antes del fix; GREEN con 129 pruebas y 3 casos HTTP excluidos. La verificación independiente confirmó el caso agregado sin soporte, afirmación no literal, conflicto real y afirmaciones repetidas. Ruff check, format y `git diff --check` pasaron. Los tres casos HTTP de TestClient siguen sin verificar en este entorno; no hubo proveedor externo, documentos reales ni validación clínica.
- **T2.2 cerrada** como detector técnico conservador de posible conflicto y ruta a revisión humana, no como adjudicación clínica.
- Próximo paso: ejecutar/verificar la cobertura enfocada de T2.3 conforme al contrato ya aceptado.
- T2.3: contrato de fallo de almacenamiento aceptado y documentado en `docs/ALURA_ACCEPTANCE_MATRIX.md`; el estado sigue abierto/parcial porque la verificación enfocada no concluyó. Evidencia existente: `backend/tests/test_oci_storage.py::test_api_returns_503_and_keeps_nothing_when_oci_fails` cubre `503`, error saneado y `404` posterior; `backend/tests/test_persistence.py::test_reservation_is_committed_before_storage_and_failure_is_recoverable`, `::test_failed_retry_rejects_changed_metadata_without_storage_or_database_write` y `::test_identical_failed_retry_preserves_original_metadata_and_timestamp` cubren reserva/recuperación y reintento. `backend/tests/test_api.py::test_storage_failure_does_not_register_document` cubre repositorio en memoria, pero propaga la excepción en vez de afirmar respuesta HTTP. Primer intento: un `cmd` run se interrumpió con Ctrl+C tras ~2,5 minutos (salida 1, sin salida de pytest); el inicio inicial desde PowerShell falló por errores de perfil/permisos, y no se pudo inspeccionar/detener un proceso separado. Reintento con Python 3.12.14 y pytest 8.4.2, `-vv -s`, `cmd.exe` desde `backend` y basetemp nuevo `.pytest-t23-storage-repeat`: los tres tests de persistencia terminaron con 8 passed en total (incluye casos parametrizados); `tests/test_api.py::test_storage_failure_does_not_register_document` y `tests/test_oci_storage.py::test_api_returns_503_and_keeps_nothing_when_oci_fails` se atascaron tras imprimir el nombre de prueba y se interrumpieron a los 45 s, sin resultado pass/fail. El motivo del atasco no está determinado. Próximo paso: resolver la ejecución de esos dos tests en un entorno compatible/observable; no declarar T2.3 cerrada. Commit de avance documental: `a6454c6` (`docs(alura): registrar contrato de fallo de almacenamiento`).

## Estrategia de entrega
- `ask-on-risk`; no se crean PRs. El push y cualquier merge quedan fuera de este alcance.
