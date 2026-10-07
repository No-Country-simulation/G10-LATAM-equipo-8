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

## Portabilidad Python: documentación y pin de familia
Checkpoint actual: `18ff4db`; integración Gemini guardada por el coordinador.
- [x] G5: pin Python 3.12 por familia, instrucciones Linux/Windows y activación Gemini
  consistentes con settings/demo actuales. Sin recrear entorno, sincronizar dependencias,
  leer claves o realizar llamadas vivas. Verificar actual Windows 3.12.14 y rango pyproject.
Ruta delegada, cambio acotado config/docs; RED no aplica: no cambia comportamiento.

Verificado: pin 3.12, pyproject >=3.12,<3.13; intérprete Windows sigue 3.12.14.
uv lock --check --offline con intérprete existente aprobó (78 paquetes, no cambio lock).
3 pruebas enfocadas de settings Gemini aprobadas; diff check aprobado. Dependencias
sin cambios; no suite completa/Linux repetida, evidencia previa173 Windows preservada.
Comandos demo comprobados contra script; --confirm-provider-call es el flag real.
Portabilidad guardada en `c7efbb7`; estado anterior de revisión era histórico.

## Preparación de publicación y archivos locales
Base actual `c7efbb7`; funcionalidad ya guardada y revisada por el coordinador.
- [x] G6: excluir ocho skills oficiales descargadas sin ocultar skills propias;
  preparar IaC/config pendientes sin secretos, actualizar guía/bitácora y verificar suite.
Solo config/docs; sin cambios funcionales, instalación ni llamadas de proveedor.
Commit/push los realiza el coordinador, no este trabajador. RED no aplica a higiene documental.

Prueba manual nueva informada: usuario reportó éxito de PDF vía API. Prueba directa
independiente gemini-3.5-flash-lite/PDF sintético: 4.34 s. No equiparar ambos alcances.
Puertos de comandos actuales alineados a 8002; historical localhost se conserva en
bitácora. No .codex/config.toml local presente; no exclusión innecesaria añadida.
Verificado de nuevo: 173 pruebas locales, Ruff check/format47 y uv lock --check --offline
(78 paquetes) aprobados. Auditoría de81 rutas indexadas y6 commits pendientes: cero
coincidencias de credenciales locales, cero flags de tokens/keys; manifiesto/lock NPM
sin URLs de credencial o registry ajeno. Ocho directorios oficiales ignorados/conservados;
skills propias y .env.example no ignoradas. Cinco rutas config preparadas; docs sin stage.
Próximo: coordinador verifica/prepara docs y commits separados, luego push autorizado.
