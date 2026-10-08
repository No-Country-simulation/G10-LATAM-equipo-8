# Contrato de integración frontend

## Alcance y base
Snapshot 9f6df98, 2026-10-08. Documentar HTTP/OpenAPI vigente y generar nueve
ejemplos sintéticos validados; sin modificar runtime, campos clínicos, CORS/auth,
dependencias, proveedores, credenciales ni nube.

## Ruta y tareas
Ruta delegada: guía y fixtures coordinadas para handoff. Dos tareas documentales;
aproximadamente 250 líneas de guía más JSON generado, sin PR ni push automático.
- [x] F1: contrato completo DTO/estados/endpoints/componentes/errores y pendientes.
- [x] F2: nueve fixtures, validación Pydantic y comprobación semántica de revisión.

## Verificación
RED no aplica a explicación pasiva, no cambia comportamiento. Validar modelos exactos
actuales, nombres/campos/enums y enlaces locales. Revisión de acciones en memoria/local,
sin llamadas IA ni DB. Schema válido no acredita seguridad clínica ni flujo vivo.

## Estado
CodeGraph status vigente y explore usados antes de lecturas puntuales. Guía completa
y nueve fixtures creadas mediante serialización de modelos actuales. Validación
Pydantic 9/9; tres acciones de revisión semánticamente válidas en casos independientes;
secuencia de aprobación conserva ID/status/destino y score null. Enlaces locales existen.
Diff check aprobado. No suite completa necesaria para cambio documental; no se probó
Google/Neon ni seguridad clínica. Fuente funcional permanece snapshot9f6df98.
Commit propuesto pendiente: `docs(api): documentar contrato frontend y ejemplos sinteticos`.
Próximo: inspección del coordinador y commit documental, sin push automático.
