# Base de ingesta IA: conservar primero el original

## Objetivo y alcance autorizado
Base `9b5097ca260008257cbede56657c720d0c6ae0a3`, rama feature/backend-foundation.
Guardar original y registro antes de invocar extracción; contrato versionado con
proveniencia/evidencia y desconocidos explícitos. Sin Gemini, Google SDK, claves,
LangGraph, reglas clínicas nuevas ni operaciones remotas.

## Ruta y entrega
Ruta delegada: dominio, puertos, dos adaptadores y migración deben avanzar juntos.
Previsión orientativa: 600 líneas autorales; exception-ok en la rama actual, sin PR.
Un incremento funcional coherente con pruebas y guía; commit/revisión del coordinador
pendientes. No confundir rollback de código con rollback de BD.

## Tareas y aceptación
- [x] A1: contrato de extracción v2 compatible con JSON v1, evidencia y proveniencia.
- [x] A2: original READY antes de extracción, estados técnicos y finalización por token;
  fallos sin confianza inventada, original recuperable desde otro repositorio.
- [x] A3: migración aditiva local, API compatible y pruebas deterministas/documentación.

## Verificación
RED→GREEN con SQLite/mocks, orden de llamadas, interrupción y token obsoleto.
Suite completa/Ruff/diff check. SQL de migración offline no acredita triggers reales.
No aplicar migración development hasta autorización y comprobación posteriores.
IA sigue simulada; los campos clínicos opcionales no acreditan identidad ni seguridad.

## Estado recuperable
RED inicial observado: dos errores de colección por contrato extraction ausente.
GREEN enfocado: 24 pruebas locales memoria/SQLite. Suite completa: 114 aprobadas;
Ruff check/format (40 archivos) y diff check aprobados. Advertencia Starlette/HTTPX previa.
Migración 0003 generada offline y probada sin conexión; NO aplicada a development.
Contra BD 0002 el código nuevo requiere aplicar 0003 antes de servir solicitudes.
Lease de cinco minutos con reclamación explícita por token anterior, sin repetición
automática ni nuevo endpoint. Interrupciones conservan original descargable y estado
PROCESSING; tokens obsoletos no finalizan. Errores públicos no almacenan texto upstream.
Campos opcionales/evidencia no son reglas clínicas ni validación de identidad.
Próximo: coordinador revisa candidato normalizado y decide migración development.
Commit propuesto pendiente: `feat(ingesta): conservar originales antes de extraer`.

## Corrección acotada: validación de campos opcionales
Checkpoint confirmado: `325d549b4d173665b7e09ce8c967af48562e78be`; revisión nativa
aprobada/acknowledgement consumido por el coordinador. Lo anterior se conserva como
evidencia histórica, no como commit aún pendiente.
- [x] A4: validar tipos opcionales/evidencia/proveniencia en dominio; salida malformada
  no puede finalizar SUCCEEDED y fallar después al serializar HTTP.
Ruta delegada por código+tests+documentación. Solo SQLite/mocks; sin Gemini, red,
migraciones, instalaciones ni cambios de entorno. RED→GREEN y suite completa.
No imponer nuevas categorías clínicas ni umbrales: reutilizar contratos técnicos existentes.

Evidencia A4: RED 28 fallos/24 aprobadas; GREEN 54 enfocadas/144 totales aprobadas.
Ruff check/format (40 archivos) y diff check aprobados. Fixture Informe genérica se
cambió a tipo soportado sin cambiar la prueba de urgencia/auditoría. Conjunto de tipos
compartido con revisión, sin aliases nuevos; ValueError de corrección se traduce a
InvalidReview existente (422). Strings opcionales vacíos conservados.
Checkpoint confirmado: `e265cb8` (`fix(extraccion): validar tipos antes de finalizar el procesamiento`).
Migración 0003 no aplicada por este trabajador; ninguna operación remota o de proveedor.

Actualización de cierre: migración 0003 fue aplicada/verificada posteriormente en
development por otro trabajador. Ingesta guardada en 325d549; tipos en e265cb8.
Los estados anteriores describen ejecución histórica, no pendientes actuales.
