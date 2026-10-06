# Gemini directo y grafo sin estado

## Alcance autorizado y base
Base e265cb8; rama feature/backend-foundation. Migración 0003 aplicada/verificada en
development por trabajador independiente según handoff del coordinador.
Implementar Google GenAI directo y LangGraph real sin llamadas vivas ni API key.
Original-first existente conserva documentos; ninguna operación Neon/Gemini remota.
Modo local actual permanece simulated; no editar .env ni leer sus secretos.

## Ruta y entrega
Ruta delegada: adaptador/contrato/config/grafo/tests coordinados. Aproximadamente
650 líneas autorales; exception-ok sin PR; commits/revisión pendientes del coordinador.
- [x] G1: schema de adaptador y Gemini directo con límites/errores seguros y mocks.
- [x] G2: grafo stateless extracción→validación→revisión obligatoria de resultados reales.
- [x] G3: configuración explícita/modelo requerido, dependencias locked, guía y demo.
- [x] G4: pruebas RED/GREEN/contrato SDK y suite completa, sin llamadas de proveedor.

## Seguridad y aceptación
Datos sintéticos solamente. Documentos son datos no instrucciones; sin tools ni URLs.
Evidencia en texto debe ser cita literal; binario no verificable exige revisión.
Confidence reportada por modelo no es confiabilidad/calibración; Gemini nunca despacha.
Errores cuota/auth/timeout/blocked/JSON se sanitizan y el original persiste.
Retries solo transitorios acotados, no cambio automático de modelo ni fallbackfixture.

## Estado recuperable
RED observado: dos errores de módulos ausentes. GREEN: 29 enfocadas/173 completas;
Ruff/format47 y diff check pasan. google-genai2.28.0, LangGraph1.2.13 locked con hashes,
sync --inexact preservó pip. Httpx2 elimina advertencia anterior de Starlette.
SDK request schema serializable verificado con clases reales, cliente falso.
Modelo libre gemini-3.8-flash confirmado en documentación oficial de pricing; datos free
tier pueden usarse para mejorar producto, sintéticos solamente. No cuenta/costo verificados.
No API key leída, no llamadas Google/Neon ni activación local de modo gemini.
Docs de API principal ahora prefieren Interactions; generate_content sigue soportado
y SDK instalado acepta response_mime_type/response_json_schema. No se añade estado remoto.
Próximo: coordinador revisión y commits; después usuario agrega clave/modelo a .env,
mantiene simulated hasta autorizar llamada real. Sin ampliación de esquema clínico.
