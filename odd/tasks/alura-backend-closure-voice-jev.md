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
- [ ] T2 — Resolver brechas de flujo seguro a partir de la matriz; el alcance de código se concreta después de revisar T1.
- [ ] T3 — Verificar persistencia Neon/OCI con fixtures sintéticos y autorización remota cuando aplique.
- [ ] T4 — Validar contrato con el frontend y controles de acceso antes de datos no sintéticos.
- [ ] T5 — Especificar e implementar el alcance acordado de voz/audio.
- [ ] T6 — Evaluar JEV; su integración requiere una decisión explícita y no altera decisiones clínicas.
- [ ] T7 — Ejecutar aceptación E2E y actualizar documentación.

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
- Próximo paso: T2, definir y probar las salidas condicionales para incompleto, evidencia contradictoria, urgencia, error del proveedor y fallo de almacenamiento; sin umbrales clínicos inventados.

## Estrategia de entrega
- `ask-on-risk`; no se crean PRs. El push y cualquier merge quedan fuera de este alcance.
