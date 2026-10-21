# MediFlow Frontend — especificación funcional y UX/UI para IA

> **Estado:** base UX/UI V2 confirmada y ampliada con menú de cuatro destinos, revisión modal y mock de datos. La edición ampliada es objetivo pendiente de soporte backend; no es una implementación.
> **Propósito:** orientar futuras sesiones de frontend con hechos comprobables, composición visual y límites del backend.
> **Seguridad:** usar solo datos sintéticos. La aplicación no es un dispositivo clínico; una prueba de software no acredita seguridad clínica.

**Lectura rápida:** para UX/UI, empezar en la sección 15; las referencias e iconografía están en la 14 y los contratos reales en las secciones 5–6.

## Cómo interpretar este documento

- **Confirmado:** requisito expresado por el usuario o comportamiento normativo de una fuente aprobada.
- **Observado:** existe hoy en el frontend o está descrito por el contrato backend actual.
- **Recomendación:** guía técnica para evaluar; no se convierte en trabajo aprobado automáticamente.
- **Pendiente:** necesita una decisión, evidencia o capacidad de backend antes de implementarse.
- La especificación UX V2 es una guía visual y funcional; no demuestra que sus pantallas o funciones ya existan.
- El backend y su contrato describen capacidades actuales; no inventar respuestas, permisos, rutas ni estados para completar el diseño.

## 1. Restricciones confirmadas por el usuario

> «se respetaran siempre el stack de react + typescript + shadcn ui + tailwindcss y no se usaran valores arbitrarios, solo los que tienen expresamente en la documentacion de tailwindcss»

> «en mi maquina entonces has downgrade a python 3.12, luego me indicas el arranque con entorno aislado, respecto la especificacion de diseño, hay que usar en lo posible shadcn ui con tailwindcss sin valores arbitrarios pero que sea lo mas parecido»

- Mantener React + TypeScript + shadcn/ui + Tailwind CSS; adaptar el diseño al stack instalado, sin migraciones ni dependencias nuevas por iniciativa propia.
- Preferir primitivos existentes de `src/components/ui/` y utilidades Tailwind documentadas. No introducir valores arbitrarios (`[...]`), estilos inline ni workarounds CSS equivalentes para eludir la restricción.
- Buscar la mayor semejanza posible con la UX V2 dentro de esa regla; documentar diferencias en vez de inventar valores exactos.
- Python 3.12 debe vivir en un entorno aislado. El runtime administrado y `backend/.venv` ya se prepararon; mantener el Python del sistema intacto.

## 2. Fuentes de verdad y precedencia

**Entrega local acordada:** el usuario confirma que el LLM trabajará en este mismo repositorio y máquina, con el mismo acceso a archivos. La raíz Git es `/home/frondus/Escritorio/workspace/MediFlow - NoCountry/G10-LATAM-equipo-8`; las rutas relativas de este documento parten de esa raíz, no del paquete frontend. No hace falta un paquete portátil ni nuevas copias de referencias. Las fuentes externas son de consulta, no superficies autorizadas de edición.

1. Contrato HTTP actual del backend: `/home/frondus/Escritorio/workspace/MediFlow - NoCountry/G10-LATAM-equipo-8-backend-foundation-reference/docs/CONTRATO_API_FRONTEND.md`.
2. Código existente y sus tipos: `Frontend/G10-Latam-Equipo-8/src/`.
3. Diseño deseado: las cuatro imágenes Canva de la sección 14 dirigen la composición; `/home/frondus/Descargas/mediflow-v2-especificacion-ux-ui-para-llm.md` complementa el comportamiento. Ninguna referencia visual amplía el contrato HTTP.
4. Contexto de producto: `/home/frondus/Documentos/proyecto-nocrountry-mediflow.md`.
5. Inicio y límites backend: `/home/frondus/Escritorio/workspace/MediFlow - NoCountry/G10-LATAM-equipo-8-backend-foundation-reference/backend/README.md`.

6. JSON de ejemplo del backend: `/home/frondus/Escritorio/workspace/MediFlow - NoCountry/G10-LATAM-equipo-8-backend-foundation-reference/docs/examples/frontend/`. Contiene `historial.json`, `triaje_revision_pendiente.json`, `triaje_extraccion_fallida.json`, `triaje_aprobado.json`, `revisiones.json` y `solicitud_*.json`. El mock local ya preparado y su guía son `docs/examples/frontend-review/historial.json` y `docs/examples/frontend-review/README.md`; conservarlos sin crear otra copia.
7. Guía Impeccable: `/home/frondus/.pi/agent/skills/impeccable/SKILL.md`; guías complementarias en `/home/frondus/.pi/agent/skills/impeccable/reference/`: `shape.md`, `operate.md` y `new-work.md`. Las cuatro rutas de imágenes están completas en la sección 14.

Si hay discrepancia, respetar primero las restricciones explícitas del usuario y el contrato real; la V2 no amplía por sí sola lo que la API soporta. El README backend enlaza el contrato desde `../docs/CONTRATO_API_FRONTEND.md`.

## 3. Alcance del producto y dirección visual

- **Confirmado como objetivo del producto:** recibir documentos, clasificarlos, extraer datos y permitir revisión humana de casos ambiguos o urgentes. El brief también plantea enrutamiento y persistencia OCI.
- **Observado:** el backend actual reporta `almacenamiento_oci: null`; no mostrar OCI como integración activa.
- La V2 propone modo claro, interfaz de trabajo, bandeja en tabla/tarjetas, revisión del original junto a datos, motivos comprensibles y estados separados.
- Se leyeron la referencia Markdown V2 y las cuatro imágenes Canva enumeradas en la sección 14. Su análisis visual fundamenta la sección 15; no equivale a una comparación de la aplicación en navegador ni a fidelidad visual ya implementada.
- La comunicación local por proxy se aplicó como base técnica autorizada; todavía no se seleccionó la primera porción de implementación de UX V2. Ninguna función visual o de revisión de V2 se considera existente solo porque esté especificada.

## 4. Hechos observados en el frontend

- `package.json`: React 19, TypeScript 6, Vite 8 y Tailwind CSS 4; scripts `dev`, `build` y `lint`, sin script `test`.
- `components.json`: shadcn/ui estilo `radix-nova`, variables CSS, alias `@/components/ui` y Lucide.
- Estructura existente: `src/components/dashboard/`, `src/components/ui/`, `src/layout/`, `src/types/`, `src/services/`, `src/hooks/`, `src/mocks/` y `tests/`.
- Primitivos UI comprobados: `Alert`, `Badge`, `Button`, `Card`, `Separator`, `Sheet`, `Spinner` y `Table`. No asumir que `Dialog`, `Tabs`, `Input`, `Select`, `Checkbox`, `Textarea`, `Skeleton` o `Accordion` ya están instalados.
- `src/App.tsx` conmuta las vistas `dashboard` e `history` en memoria; `src/types/navigation.ts` las tipa. No son rutas URL.
- `src/types/triaje.ts` refleja el JSON del backend en `snake_case`, conserva `null` y ya declara estados, prioridades, acciones y DTOs actuales.
- `src/services/triajeService.ts` configura la base mediante `VITE_API_URL`; `src/services/triajeServiceCore.ts` conserva `/api/v1` cuando la base ya termina en ese prefijo y lo agrega a un origen que no lo incluya.
- En desarrollo, si `VITE_API_URL` no está definida, la base es `/api/v1`; Vite reenvía ese prefijo al backend local en `http://127.0.0.1:8002`. Una URL explícita, incluida la cadena vacía, prevalece sobre ese valor por defecto.
- La cadena vacía conserva los mocks para historial, cola y revisión; la carga de archivo sigue requiriendo backend configurado. En producción, si la variable no está definida durante el build, se conserva el comportamiento mock existente. No confundir respuestas simuladas con persistencia o éxito real, ni asumir fallback a mocks ante errores de red.
- `src/hooks/useTriajes.ts` expone el total de la cola de auditoría bajo `criticalAlertsCount`. Auditoría pendiente no significa alerta de urgencia clínica: mantener esta discrepancia semántica visible y no convertirla en regla médica.

## 5. Matriz compacta de integración actual

Rutas verificadas en el contrato backend y servicios actuales. FastAPI escucha localmente en `http://127.0.0.1:8002`. Con una base de origen explícita, el cliente agrega `/api/v1`; la base relativa de desarrollo `/api/v1` ya incluye el prefijo y se conserva tal cual. El proxy de desarrollo de Vite reenvía ese prefijo sin reescritura.

| Capacidad | Endpoint del contrato | Situación en frontend |
|---|---|---|
| Historial paginado | `GET /api/v1/triajes?offset=&limit=&status=&destino=` | `getTriajes`; historial y paginación existentes. |
| Cola de auditoría | `GET /api/v1/audit/queue?offset=&limit=` | `getAuditQueue`; alimenta cola y contador actual. |
| Carga binaria | `POST /api/v1/triajes/archivo` (`multipart/form-data`) | `subirArchivo`; acepta selección PDF/PNG/JPG/JPEG en la UI. |
| Decisión de revisión | `POST /api/v1/triajes/{documento_id}/revision` | `revisarDocumento`; acciones `aprobar`, `corregir_aprobar`, `rechazar`. |
| Ingreso de texto | `POST /api/v1/triajes` (alias `process-text`) | Existe en backend; el servicio actual no lo expone. |
| Detalle | `GET /api/v1/triajes/{documento_id}` | Contrato disponible; no hay método actual en el servicio frontend. |
| Original y revisiones | `GET /api/v1/triajes/{documento_id}/documento`; `GET /api/v1/triajes/{documento_id}/revisiones` | Bytes originales e historial de eventos están en API; faltan métodos/vistas integrados. |

- Archivos aceptados por API: PDF, PNG y JPG/JPEG; límite inicial configurable de 10 MiB; rechazos relevantes `413` y `415`.
- El historial pagina por `offset`/`limit` (20 por defecto, máximo 100); no ofrece búsqueda textual por paciente ni métricas agregadas.
- `201` confirma documento conservado y resultado registrado; puede incluir `processing_status=FAILED`. No presentar cualquier `201` como extracción exitosa.

## 6. Contratos y semántica que no deben alterarse

- `status` (`PROCESSED`, `NEEDS_AUDIT`, `APPROVED`, `REJECTED`) expresa resultado/revisión; `processing_status` (`PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`) expresa procesamiento técnico.
- Prioridad clínica: `Rutina`, `Urgente` o `null`. `null` es desconocido/no disponible, nunca cero, rutina por defecto ni permiso para inferir.
- `alerta_urgente`, `requiere_auditoria_humana` y el nombre del destino son conceptos distintos. Urgencia no equivale a auditoría, y el destino seleccionado no acredita despacho.
- Score de confianza puede ser `null` o autodeclarado por el modelo; no equivale a precisión calibrada ni autorización clínica. El contrato acepta esquema de extracción v1 legado y v2.
- Solo `NEEDS_AUDIT` puede revisarse y solo cuando el procesamiento terminó (`SUCCEEDED` o `FAILED`). Revisor y comentario son requeridos; el revisor es declarado, no autenticado.
- **Discrepancia funcional pendiente:** la API permite corregir/aprobar un caso `FAILED` al completar los campos exigidos y conserva su fallo técnico; la UX V2 prohíbe aprobar sin extracción verificable. No habilitar por inferencia un formulario clínico vacío para suplirla: acordar ese flujo antes de implementarlo. Una decisión humana no significa que la IA se haya recuperado.
- Correcciones admitidas: nombre, edad, tipo documental y prioridad; solo edad acepta `null` explícito. Prioridad urgente exige destino `EMERGENCIA_MEDICA`.
- `destino_principal` es una decisión registrada; `notificacion_generada` siempre es `null`. No existe endpoint que confirme entrega, despacho o notificación.
- La simulación reconoce cuatro textos sintéticos; texto desconocido y archivos PDF/imagen producen `AI_UNAVAILABLE` y revisión, no extracción OCR real. El modo Gemini es opcional y requiere activación explícita; esta especificación no autoriza llamadas.

## 7. Recomendaciones de arquitectura frontend (no nuevo alcance)

- Evolucionar el patrón existente: tipos fieles al contrato en `src/types/triaje.ts`, HTTP/mock en `src/services/`, orquestación de pantalla en `src/hooks/`, composición en `src/components/dashboard/` y layout en `src/layout/`.
- Reutilizar primitivos instalados en `src/components/ui/`; añadir piezas de interfaz solo si la tarea aprobada lo requiere. No sustituir el árbol por una reescritura Clean Architecture ni duplicar cliente/DTOs.
- Mantener al backend como autoridad para estados, validaciones, decisiones terminales, errores y paginación. Refrescar el DTO tras acciones y manejar `409` como conflicto que requiere releer el caso.
- Hacer explícito el modo de demo y su procedencia; no caer silenciosamente en mocks que aparenten éxito de integración. Separar datos sintéticos de respuestas API reales.
- Mantener los DTOs reales intactos y derivar un modelo de presentación/adaptador si la UI necesita nombres legibles; convertir desconocidos sin descartar estados nuevos.
- No agregar rutas, login, persistencia de borradores, reintentos, eventos o dependencias hasta que exista alcance aprobado y soporte contractual.

## 8. Modelo de estado para la interfaz

Presentar cuatro dimensiones independientes, sin simular campos que no devuelve el servidor:

| Dimensión UI | Fuente / significado | Regla de presentación |
|---|---|---|
| Procesamiento | `processing_status` | Carga, procesamiento, completado o fallo técnico. Error no equivale a urgencia. |
| Revisión | `status` | Pendiente, decisión aprobada/rechazada o resultado procesado; no confundir `PROCESSED` con aprobación humana. |
| Prioridad clínica | `clasificacion.nivel_prioridad` y, por separado, `alerta_urgente` | Mostrar valor conocido o “Sin evaluar”; acompañar color con texto/icono. |
| Entrega | No existe confirmación en API | Mostrar destino decidido solo como destino; nunca “enviado/derivado” sin acuse futuro verificable. |

- Separar motivo de auditoría (`audit_reasons`) del código técnico (`processing_error`) y de prioridad clínica.
- En cada carga, revisión y error, diferenciar estado ocupado, resultado confirmado y error; conservar valores ingresados si falla una acción.
- No afirmar persistencia de borrador ni ofrecer reintento de IA: no hay API para esas operaciones.

## 9. Guía visual compatible con la restricción Tailwind

- Reutilizar primero los ocho primitivos comprobados en la sección 4. Los componentes adicionales del diseño se planifican para una tarea autorizada; comprobar antes las APIs y dependencias disponibles, sin instalar paquetes por iniciativa propia.
- Preferir escala y colores documentados de Tailwind. Ejemplos: `w-54` es un ancho de la escala multiplicadora de Tailwind 4; evitar `w-[216px]`, `bg-[#0F766E]` y equivalentes.
- Se pueden conservar nombres semánticos de shadcn (`primary`, `muted`, `destructive`, `border`) si apuntan a colores de paleta documentada. No fijar aquí una paleta final ni replicar hexadecimales personalizados de V2 sin acuerdo.
- Aproximar las superficies claras, jerarquía y énfasis turquesa con valores documentados; registrar el desajuste con V2 en vez de introducir CSS arbitrario.
- No reescribir en bloque `src/components/ui/`; sus selectores generados por shadcn no son autorización para añadir valores visuales arbitrarios.
- Referencias: [Tailwind width](https://tailwindcss.com/docs/width), [colors](https://tailwindcss.com/docs/colors) y [utility-first styling](https://tailwindcss.com/docs/styling-with-utility-classes).

## 10. Límites conocidos y decisiones pendientes

- **Proxy local de desarrollo (observado):** `vite.config.ts` reenvía únicamente `/api/v1` a `http://127.0.0.1:8002`, con `changeOrigin` y sin reescritura. La base por defecto `/api/v1` conserva el prefijo y evita que el navegador llame directamente al origen FastAPI durante `npm run dev`.
- **CORS:** el contrato informa que el backend no tiene middleware CORS. Si se configura un origen absoluto en `VITE_API_URL`, esa llamada directa evita el proxy y puede requerir una política CORS del backend.
- **Vite Preview:** `npm run preview` hereda `server.proxy` por defecto mediante `preview.proxy`. Sirve el build de producción, por lo que la base de API es la definida al compilar; heredar el proxy no convierte automáticamente un build mock en modo API. Referencia: [Vite preview.proxy](https://vite.dev/config/preview-options#preview-proxy).
- **Producción estática:** un despliegue estático no hereda el proxy de Vite. Con `VITE_API_URL` sin definir durante el build, el frontend conserva su comportamiento mock; una base `/api/v1` publicada en el mismo origen requiere que el hosting proporcione un reverse proxy. No presentar la configuración del proxy por sí sola como prueba de tráfico real.
- **Sin métricas:** no inventar endpoint o contadores agregados; el total del historial y el tamaño de cola son cantidades distintas.
- **Sin búsqueda backend:** cualquier filtrado local debe limitarse a datos cargados y no aparentar consulta global.
- **Sin reprocesamiento, autenticación, borradores en servidor, reabrir revisión ni confirmación de despacho.** Requieren decisión y contrato antes de ofrecer acciones.
- El ejemplo V2 `MF-1O28` → `MF-1028` no tiene una corrección equivalente en la API actual: las correcciones admitidas no incluyen identificadores del paciente. Mantenerlo como demostración aislada o acordar ese contrato con backend; no simular su persistencia real.
- **No hay evidencia de fuente verificable para todos los campos:** la API incluye citas/página opcionales; no dibujar resaltados de coordenadas no suministradas.
- El backend por defecto usa archivos locales y estados en memoria; reiniciar el proceso pierde historial en ese modo. No habilitar Postgres, OCI o proveedor IA sin autorización independiente.
- **Entorno preparado:** `uv 0.13.1` está en `~/.local/bin`; Python administrado `3.12.15` en `~/.local/share/uv/python` con `--no-bin`; `backend/.venv` se creó con `uv sync --locked --python 3.12` y contiene 74 paquetes. Los chequeos del padre (`uv pip check` e imports de FastAPI/Uvicorn/Pydantic) pasaron.
- El Python del sistema permanece en `3.14.8`; no se cambió shell config ni los archivos `pyproject.toml`, `uv.lock` o `requirements.txt`. No se copió/editó `.env`; el repositorio backend conserva solo el `package-lock.json` que ya estaba modificado. Para verificar el proxy sí se iniciaron procesos temporales FastAPI/Vite y se probaron endpoints HTTP con datos sintéticos aislados; después se detuvieron y se eliminó su almacenamiento temporal. No se realizó una prueba visual en navegador.
- La compatibilidad exacta de Node debe contrastarse con Vite instalado; el README frontend no sustituye esa comprobación.

## 11. Arranque local aislado (backend simulado y frontend de desarrollo)

1. Desde `backend/` del repositorio backend, inicia FastAPI con el entorno aislado del proyecto y enlázalo solo a loopback:

```bash
AI_MODE=simulated REPOSITORY_MODE=memory STORAGE_MODE=local \
  .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```

2. Desde `Frontend/G10-Latam-Equipo-8/`, con las dependencias ya disponibles, inicia Vite:

```bash
npm run dev
```

En desarrollo, `VITE_API_URL` sin definir selecciona `/api/v1`, que Vite reenvía a `http://127.0.0.1:8002` sin modificar la ruta. Para forzar el uso del proxy sin editar archivos de entorno, ejecuta `VITE_API_URL=/api/v1 npm run dev`. Para conservar explícitamente el modo demo existente, ejecuta `VITE_API_URL="" npm run dev`; historial, cola y revisión usan mocks, pero la carga de archivos sigue requiriendo backend. Un origen absoluto explícito, como `VITE_API_URL=http://127.0.0.1:8002 npm run dev`, evita el proxy y puede requerir CORS.

- No hace falta copiar ni reemplazar `.env` para el arranque simulado: las variables explícitas del proceso seleccionan IA simulada, repositorio en memoria y almacenamiento local.
- El modo simulado es deliberado. Usa un solo proceso y comienza sin `--reload`; cada reinicio pierde el historial en memoria. Swagger: `http://127.0.0.1:8002/docs`; OpenAPI: `http://127.0.0.1:8002/openapi.json`.
- Vite Preview hereda `server.proxy` por defecto, pero un despliegue estático de producción no hereda el proxy de Vite. Preview usa la base de API embebida en el build: si se compiló sin `VITE_API_URL`, se mantiene el modo mock. Si el sitio estático usa la base `/api/v1`, su hosting necesita un reverse proxy de mismo origen.
- La configuración y la prueba HTTP siguiente acreditan el transporte local ensayado, no la extracción real de PDF, el despacho clínico ni la corrección visual de la aplicación.

### Evidencia observada del proxy

| Comprobación | Resultado |
| --- | --- |
| RED antes del cambio | Salida 1: faltaba el proxy y el servicio elegía mocks en desarrollo sin URL. |
| Tests focalizados | 9/9 aprobados; salida 0 en el worker y en el spot check del padre. |
| Suite `node --test tests/*.test.mjs` | 23/23 aprobados; salida 0. |
| Comparación con snapshot previo del working tree | URL absoluta, demo explícita y producción sin URL conservados; solo cambia el default de desarrollo. |
| `npm run build` | Salida 0; TypeScript y build Vite 8.3.4 completados. |
| HTTP Vite → FastAPI aislado | Salida 0: historial/cola JSON 200, carga multipart 201, original PDF idéntico 200 y rechazo confirmado 200. |
| Errores y efectos públicos | 404/409 propagados como JSON; una revisión duplicada no cambia historial, cola ni el único evento de revisión. |
| `npm run lint` antes del ajuste de alcance (resultado histórico) | Salida 1 por `_documento` sin usar en `recovery/mediflow-v2-reconstruction/src/components/dashboard/puedeRevisarseDocumento.ts:17:39`; el overlay se preservó. |
| Verificación independiente del proxy | 9/9 tests aprobados en scratch, salida 0 y stderr vacío; R1/R2/R3/R5 conformes. R4 documental confirmado conforme en una revisión limitada posterior, sin nuevas pruebas de código. |

La prueba HTTP utilizó IA simulada, repositorio en memoria y almacenamiento temporal local. No hubo llamadas a Gemini/Neon/OCI, datos reales ni afirmación de extracción OCR. Los procesos y archivos de prueba se limpiaron. No se ejecutó un navegador.

## 12. Lista inicial de aceptación

- [ ] Stack actual preservado; sin dependencias, reescrituras o cambios de rutas/contratos fuera del alcance aprobado. La migración ReIcon planificada no habilita otros paquetes por iniciativa propia.
- [ ] Vistas y acciones se basan en capacidades reales; mocks se identifican explícitamente y no se presentan como respuestas backend.
- [ ] Historial, auditoría, detalle, procesamiento, prioridad y entrega conservan semánticas separadas; `null` sigue siendo desconocido.
- [ ] No se describe `PROCESSED` como aprobación clínica ni un destino como entrega confirmada.
- [ ] Las solicitudes reales de revisión respetan los casos y campos admitidos por el contrato; errores `409/413/415/422/503` no generan éxito aparente.
- [ ] En el prototipo, los datos documentales sin reglas definidas son editables y opcionales, sin restricciones inventadas ni apariencia de persistencia; las reglas vigentes y los metadatos de solo lectura se conservan.
- [ ] Diseño responsive V2 se aproxima con shadcn y utilidades Tailwind documentadas, sin valores arbitrarios; probar al menos 320, 390, 768, 1024 y 1440 px cuando la implementación se apruebe.
- [ ] Carga, vacío, búsqueda sin resultados, fallo de red y ocupado tienen estados explícitos; no se presenta simulación como extracción real.
- [ ] Los filtros iniciales son Estado de revisión y Tipo de documento; se distingue su alcance real sin aparentar filtrado global no disponible.
- [ ] Cambiar de menú conserva una carga activa y permite consultar su estado en la misma sesión, sin cancelarla, reiniciarla ni duplicar su solicitud.
- [ ] Se usan datos sintéticos y no se configuran llamadas de proveedor, persistencia externa o datos de pacientes.
- [ ] Las limitaciones reales, pruebas realizadas y diferencias visuales se reportan; no afirmar verificaciones que no se ejecutaron.

## 13. Próximas decisiones y trabajo futuro

1. La base UX/UI se amplía con navegación de cuatro destinos, carga visible y revisión modal alineada al JSON. Las secciones 15–16 documentan el objetivo y su mock de datos; no autorizan implementar pantallas, dependencias ni backend.
2. La comunicación HTTP local `/api/v1` mediante Vite ya fue verificada con FastAPI simulado. Comprobar la aplicación en navegador corresponde a una futura implementación de UI; para una URL absoluta directa o un despliegue, acordar CORS o el reverse proxy del hosting según corresponda. El lint finalizó con salida 0 al excluir únicamente `recovery/**`; el overlay recuperado sigue intacto.
3. Conservar el límite UX de no aprobar sin extracción verificable. Cualquier alternativa de captura manual para un `FAILED` requiere una decisión funcional expresa, no una inferencia del diseño.
4. Acordar con backend la edición ampliada de datos extraídos antes de habilitar su persistencia. Borradores y reprocesamiento se omiten hasta tener soporte; búsqueda/alertas globales, autenticación y entrega tampoco se inventan en el frontend.

La dirección visual ya quedó aclarada: reutilizar shadcn/ui y valores documentados de Tailwind, sin valores arbitrarios y buscando la mayor semejanza posible con V2. Seleccionar equivalencias de la escala existente es trabajo técnico, no una nueva autorización para introducir valores personalizados.

## 14. Estado de sesión y siguiente etapa

### Estado operativo actual (volátil; reconfirmar al reanudar)

- El usuario informa que backend y frontend están corriendo ahora mismo en terminales de Visual Studio Code. Es un reporte de sesión, no una comprobación independiente de qué proceso pertenece a qué IDE.
- El padre informó probes HTTP de solo lectura: `http://127.0.0.1:8002/health` respondió `200 application/json` y `http://localhost:5173/` respondió `200 text/html`. `http://127.0.0.1:5173` no fue alcanzable; usar la URL anunciada `localhost` y no concluir por eso que el frontend está caído.
- Los probes confirman alcance HTTP de esas URLs, no propiedad del proceso ni que se hayan iniciado desde VSCode. Reconfirmar el estado al reanudar; no duplicar arranques ni reiniciar los servidores por esta nota. En esta etapa no se iniciaron, detuvieron ni reiniciaron servicios.

### Referencias UX/UI inspeccionadas (interfaz aún no implementada)

- Conjunto local de referencias Canva leído visualmente para este borrador:
  - `/home/frondus/Descargas/MediFlow V2 — Interfaz de revisión documental/1.png`
  - `/home/frondus/Descargas/MediFlow V2 — Interfaz de revisión documental/2.png`
  - `/home/frondus/Descargas/MediFlow V2 — Interfaz de revisión documental/3.png`
  - `/home/frondus/Descargas/MediFlow V2 — Interfaz de revisión documental/4.png`
- La sección 15 describe la composición y las interacciones derivadas de esas imágenes. Conservar React + TypeScript + shadcn/ui y valores documentados de Tailwind, sin valores arbitrarios. Inspeccionar referencias no demuestra coincidencia de píxeles, comportamiento del navegador ni implementación de pantallas.

### Migración completa de iconografía a ReIcon (futura, no realizada)

- La futura tarea deberá inventariar todos los imports y usos de Lucide en la aplicación activa, incluidos los primitivos generados de `src/components/ui/`, y reemplazarlos por equivalentes disponibles de la integración React oficial de ReIcon (`reicon-react`; [documentación React](https://reicon.dev/docs/react), [README oficial](https://raw.githubusercontent.com/dqev/reicon/main/README.md)). Confirmar exports y equivalencias contra la documentación/paquete real al hacer esa tarea; no anticipar nombres de exports ni una versión.
- Preservar nombres accesibles, etiquetas, interacción, tamaño y estados de los controles. Al completar esa migración no deben quedar iconos Lucide en el frontend activo. Mantener intactas las copias históricas de `recovery/`.
- Antes de cambiar generación de shadcn, revisar el esquema y compatibilidad de `components.json`; no inventar ni fijar un valor `iconLibrary` no verificado. Conservar assets de marca/logo como identidad gráfica, sin sustituirlos automáticamente por iconos genéricos.
- Retirar `lucide-react` y actualizar el lockfile solo después de que todos los reemplazos activos funcionen y en una tarea autorizada aparte. Esta etapa no instaló paquetes ni cambió dependencias, iconos, componentes ni configuración de shadcn.

### Impeccable aplicado al borrador UX/UI

Se usó `/home/frondus/.pi/agent/skills/impeccable/SKILL.md` con las guías **Shape** y **Operate**: definir tarea, audiencia, jerarquía, estados y composición antes de escribir UI. Canva es la autoridad visual fijada por el usuario; no se propone otra identidad ni un dashboard genérico. La aplicación de esta guía al documento no es una auditoría de la aplicación ni una comprobación visual en navegador.

### Base técnica observada

- El agente de implementación observó `npm run lint` con salida 0 tras agregar únicamente `recovery/**` a los global ignores existentes; registró 2/2 pruebas focalizadas y 25/25 en la suite completa. El coordinador repitió las dos pruebas focalizadas con salida 0. Mediante la CLI pública de ESLint, el fixture recuperado se ignora y el de `src/` conserva el error `@typescript-eslint/no-unused-vars`.
- La salida 1 de lint descrita como histórica corresponde al estado previo a ese ajuste. No se modificó `recovery/`. Esta iteración UX/UI solo cambia documentación: no repite esos checks ni modifica componentes, iconos, paquetes, lockfiles, backend o servidores.

## 15. Especificación UX/UI V2 basada en Canva

### 15.1. Brief y dirección

- **Audiencia y tarea:** persona que contrasta lo leído por la IA con el original, corrige datos documentales y registra una decisión. Modo **Operate**: claridad por encima de decoración.
- **Recorrido:** menú/listado → abrir el documento en modal → comparar valores originales y propuestos → confirmar una acción admitida → actualizar las colecciones desde la respuesta del servidor.
- **Identidad:** conservar marca, superficies claras, texto oscuro, acento turquesa y composición Canva. No agregar gráficos o métricas ornamentales.
- **Alcance confirmado:** la base aceptada con «confirmo como estructura base» evoluciona con el menú de cuatro destinos y la revisión modal solicitados después. El objetivo incluye editar todos los datos documentales extraídos, con ampliación de contrato pendiente; no permite editar metadatos ni autoriza implementar UI, backend o dependencias en esta iteración documental.

### 15.2. Mapa de referencias

| Referencia | Vista o estado | Composición que se debe preservar |
| --- | --- | --- |
| `1.png` | Bandeja desktop | Navegación lateral, cabecera, título, pestañas y búsqueda; tabla con una acción clara por fila. |
| `2.png` | Revisión desktop | Contexto, aviso, original a la izquierda y datos a la derecha; trasladar esta composición al modal. |
| `3.png`, parte superior | Procesamiento fallido | Estado técnico, explicación, prioridad desconocida y diagnóstico secundario, dentro del modal de consulta. |
| `3.png`, parte inferior | Rechazo | Confirmación con motivo obligatorio; es otro estado, no una sección fija debajo del error. |
| `4.png`, izquierda | Bandeja móvil | Cabecera compacta, búsqueda y tarjetas con datos etiquetados y botón ancho. |
| `4.png`, derecha | Revisión móvil | Modal que puede ocupar la pantalla, con contexto, aviso, pestañas Datos extraídos/Documento original y acciones apiladas. |

Consolidar una cabecera, tipografía y vocabulario de estados entre las variantes. El lienzo no determina medidas CSS ni un viewport probado. La revisión modal reemplaza la apertura como página independiente; no copiar las dos vistas móviles de `4.png` como columnas de una sola pantalla.

### 15.3. Menú, carga, bandejas y filtros

1. **Menú al mismo nivel:** **Cargar documentos**, **Pendientes**, **Todos los documentos** y **Alertas inmediatas**. Destacar solo el contexto activo; no inferir rutas URL o autenticación nuevas.
2. **Procedencia:** conservar MediFlow y el contexto Triaje documental. **Datos ficticios** corresponde a mocks/dataset sintético conocido; `modo_ia=simulado` no acredita por sí solo que cualquier archivo sea ficticio. No inventar funciones de cuenta para el avatar.
3. **Carga:** selección y validación → entrada provisional **Cargando…** → documento real al recibir la respuesta. La entrada provisional es estado local, no un DTO con ID/estado de servidor inventados, y no aumenta sus totales antes de confirmación. Mostrar progreso indeterminado salvo medición real; transferencia y extracción son etapas distintas.
   - **Continuidad confirmada:** cambiar de menú no cancela ni reinicia la carga y no genera otra solicitud. Mantener su estado compartido y consultable desde cualquier destino durante la misma sesión, también al volver a Cargar documentos.
   - **Límite:** esta continuidad cubre navegación interna de la aplicación; no promete recuperar la carga tras recargar/cerrar el navegador ni equivale a guardar un borrador persistido.
4. Si la carga falla, mostrar el error sin fabricar un registro exitoso. Un `201` puede devolver `processing_status=FAILED`: representar ese resultado, no extracción exitosa. Al terminar, mantener el menú que el usuario esté usando y permitir consultar/abrir el resultado, sin navegación automática.
5. **Colecciones:** Pendientes usa la cola de auditoría; Todos usa historial. Alertas usa `decision_enrutamiento.alerta_urgente=true`, no el total de auditoría. La API actual no ofrece filtro global por esa bandera: si se filtran registros cargados, explicitar ese alcance y no aparentar un total global.
6. **Filtros iniciales confirmados:** **Estado de revisión** y **Tipo de documento**. No agregar otros filtros iniciales por inferencia. Estado puede usar el filtro HTTP existente de historial cuando corresponda; no agregar ese parámetro a la cola de auditoría, que no lo admite. Tipo y búsqueda solo cubren datos cargados mientras no haya soporte servidor. Conservar **Paciente o documento**, indicar el alcance local y no inventar parámetros HTTP.
7. **Tabla:** Documento/paciente, Motivo y estado, Prioridad, Recibido, Acción. Usar nombre disponible o **Paciente sin identificar**, tipo y `documento_id`; motivo primero, apoyo después. Formatear `created_at` sin alterar su UTC original.
8. **Acciones:** **Revisar** abre el modal, incluso para inspeccionar un fallo. Los casos terminales se abren en solo lectura. En móvil, tarjetas con Motivo, Apoyo, Estado, Prioridad y Fecha. Totales y paginación pertenecen a cada colección; los números del Canva no se fijan en código.

### 15.4. Modal y formulario alineado al JSON

- **Contenedor:** abrir sobre la colección actual, con contexto, motivo y cierre accesible. En ancho suficiente, original y formulario en dos paneles; en móvil, pestañas. Conservar pestaña, búsqueda y página de la bandeja al cerrar.
- **Estructura:** reflejar los grupos reales `datos_extraidos.paciente`, `datos_extraidos.medico_solicitante`, demás datos extraídos y `clasificacion`, con etiquetas comprensibles. Usar el esquema/DTO además del ejemplo: un objeto nullable no revela todos sus hijos mediante un simple recorrido de valores.
- **Valor y corrección:** conservar lo recibido como original y separar la propuesta del revisor. `null` se muestra como **Sin dato**, no como ilegible/error automáticamente. Los motivos de auditoría no identifican por sí solos qué campo está mal ni cuántos campos deben completarse.
- **Objetivo ampliado:** permitir completar/corregir todos los datos documentales extraídos. Hoy solo persisten nombre, edad, tipo y prioridad; los demás requieren ampliar solicitud, validaciones y registro de correcciones del backend. No enviar el JSON completo como actualización ni presentar cambios locales como guardados. La sección 16 distingue ambos alcances.
- **Permisividad provisional confirmada:** los datos documentales cuyas reglas aún no estén definidas pueden editarse, completarse o quedar vacíos. No añadir obligatoriedad, máscaras, regex ni límites de negocio no acordados. Respetar el tipo base del DTO y todas las reglas ya vigentes; los metadatos siguen en solo lectura. En un prototipo, los cambios sin soporte API son locales y deben identificarse como tales, no como correcciones guardadas por el servidor.
- **Solo lectura:** identificadores de sistema, estados, fechas, almacenamiento, auditoría, confianza y procedencia; `especialidad` sigue reservada. El backend recalcula las decisiones derivadas. Mostrar información técnica aparte, sin convertir rutas internas en enlaces.
- **Original:** consumir los bytes del endpoint, no recrear un PDF como si fuera evidencia. Nombre de archivo/páginas solo con fuente real. **Ver en el documento** localiza únicamente cita/página disponible y soportada; de otro modo, **Ver documento original**. El mock JSON no incluye esos bytes.
- **Confirmación:** revisor y comentario obligatorios; destino final distinto de `REVISION_HUMANA`. Prioridad urgente exige `EMERGENCIA_MEDICA`. El checkbox no sustituye estos datos: cambiar un campo o destino invalida la verificación sin borrar las correcciones.
- **Acción y retorno:** `aprobar` sin correcciones, `corregir_aprobar` con cambios admitidos. Conservar ediciones ante error, impedir duplicados y releer ante `409`. Cerrar tras decisión confirmada y refrescar las colecciones; no deducir contadores mediante decrementos ficticios. Antes de abandonar cambios, ofrecer continuar editando o descartar; no cerrar durante el envío.

### 15.5. Fallo técnico y rechazo

- Sin extracción verificable, mostrar **Revisar procesamiento** y **Sin evaluar** para prioridad `null`, no un formulario clínico vacío con aprobación. La captura manual de un `FAILED` no queda habilitada por el objetivo ampliado: requiere decisión funcional aparte.
- **Diagnóstico técnico** secundario y desplegable, con `processing_error` real. No imponer `GEMINI_TIMEOUT` a todo fallo ni afirmar timeout sin evidencia.
- **Rechazar documento** abre un paso de confirmación, preferentemente dentro del mismo modal para evitar diálogos apilados. Conservar Motivo del rechazo, Escribe el motivo, Cancelar y Confirmar rechazo. Motivo como comentario y revisor declarado son obligatorios. Cancelar vuelve a la revisión sin enviar; confirmar no aplica las correcciones locales ni marca rechazado antes de respuesta válida.

### 15.6. Adaptaciones frente al mock visual

| Elemento Canva | Tratamiento acordado o límite actual |
| --- | --- |
| `MF-1O28` → `MF-1028` | Ejemplo visual, no identificador presente/corregible en el contrato actual. No inventar el campo para simular persistencia. |
| **Aprobar y enviar** | **Aprobar revisión** o **Corregir y aprobar**. Registrar destino no acredita despacho. |
| **Guardar borrador** | Omitir hasta tener soporte. No reemplazarlo por persistencia local implícita. |
| **Reintentar procesamiento** | Omitir hasta tener soporte. No re-subir automáticamente el archivo como sustituto. |
| **1 campo por verificar** | Cantidad solo con correspondencia real a campos; `audit_reasons.length` no prueba ese número. |
| Resaltado en el original | Usar cita/página verificables; no inventar coordenadas. |

Estas adaptaciones no amplían el backend por sí solas. Conservar ediciones mientras se trabaja en el modal no equivale a guardar un borrador persistido.

### 15.7. Equivalencias visuales propuestas

Son puntos de partida con utilidades documentadas, no medidas extraídas ni estilos ya aplicados. Reutilizar tokens semánticos shadcn cuando correspondan a esa paleta, sin hexadecimales propios, clases arbitrarias o estilos inline nuevos.

| Área | Propuesta Tailwind / intención |
| --- | --- |
| Acento y selección | `teal-700` para acción principal; `teal-50` para selección suave. Una misma familia turquesa, no varios verdes sin función. |
| Superficies y texto | Blanco y `slate-50`; bordes `slate-200`; texto principal `slate-900` y secundario `slate-600`. |
| Aviso y fallo | `amber-50` / `amber-700` para verificar datos; `red-50` / `red-700` para fallo/rechazo. Mantener icono y texto, no solo color. |
| Prioridad | **Rutinaria** representa `Rutina` y **Sin evaluar** representa `null`. Preferir tratamiento neutro como en `1.png`/`4.png`; no convertir el amarillo del mock desktop en urgencia. |
| Tipo y jerarquía | Familia `font-sans` existente; `text-sm`/`text-base` para lectura, `text-2xl`/`text-3xl` para títulos y pesos coherentes. No inferir una fuente del bitmap ni importar otra. |
| Espacio y forma | `p-4`, `p-6`, `p-8`, `gap-4`, `gap-6`; `rounded-lg`, borde fino y sombra discreta donde ayude a separar tarjetas. Altura de filas según contenido, no recortar motivos. |
| Shell y controles | `w-64` como base propuesta de sidebar desktop, controles principales con `min-h-11`; ajustar dentro de la escala documentada sin forzar un calco de los píxeles Canva. |
| Iconos | ReIcon con una familia visual consistente, tamaños de escala como `size-4`/`size-5`. Nombres accesibles para controles de solo icono; decorativos ocultos al lector. Ver migración completa en sección 14. |

Reutilizar los ocho primitivos de la sección 4. Planificar las piezas faltantes (pestañas, campos, selectores, checkbox, diálogo y estados de carga) con shadcn/ui antes de asumirlas en código; confirmar dependencias existentes y alcance, sin añadir una biblioteca de diseño paralela.

### 15.8. Adaptación responsive y accesibilidad

- **Por debajo de `lg` (propuesta):** navegación mediante `Sheet`, bandejas en tarjetas y revisión en modal que puede ocupar la pantalla. Alternar Datos extraídos/Documento original sin perder valores; no abrir una segunda página ni dos columnas estrechas.
- **Desde `lg`:** sidebar y tabla; dentro del modal, dos paneles si siguen legibles. Permitir scroll del contenido extenso sin ocultar acciones o campos con barras fijas.
- Acciones móviles apiladas, compatibles con teclado virtual, nombres largos y zoom; sin desplazamiento horizontal de toda la página.
- Labels y foco visibles; modal identificado por documento y motivo. Gestionar foco/Escape: una salida con cambios pide confirmación, y el envío ocupado impide cierres que aparenten cancelarlo. Al cerrar, volver al disparador o a un punto lógico de la bandeja si la fila ya no está.
- Controles con estados normal, hover, foco, activo, deshabilitado, ocupado y error; transiciones funcionales, no decorativas. Cuando se implemente, comprobar 320, 390, 768, 1024 y 1440 px; son criterios futuros, no pruebas realizadas.

### 15.9. Estados materiales del flujo

| Estado | Comportamiento |
| --- | --- |
| Carga local en curso | Una sola operación, con estado consultable al navegar entre menús durante la sesión; entrada Cargando… separada del DTO y sus totales, sin porcentaje de IA inventado. |
| Cargando lista/modal/original | Mantener contexto; no mostrar cero documentos o fallo de extracción antes de recibir respuesta. |
| Bandeja vacía | Distinguir no hay pendientes, no hay documentos y no hay alertas dentro del alcance consultado. |
| Búsqueda/filtro sin coincidencias | Mostrar el alcance real y permitir limpiar; no afirmar ausencia global del paciente. |
| Error de carga, red u original | Conservar contexto/ediciones e identificar qué operación falló; no sustituir por éxito mock o un original falso. |
| Decisión en curso/confirmada | Impedir duplicados; mantener pendiente hasta respuesta y actualizar desde el resultado del servidor. |

La estructura base incorpora ahora el menú y modal solicitados. Los detalles visuales siguen siendo propuestas; implementar y comprobar la aplicación requiere un alcance posterior.

## 16. Mock de datos y alcance de edición

El [mock portable](examples/frontend-review/README.md) usa una copia íntegra de [historial.json](examples/frontend-review/historial.json), procedente de los ejemplos del backend indicados por el usuario. Es un sobre `HistoryResponse`, no un nuevo contrato ni un mock conectado a la aplicación.

| Caso del dataset | Representación esperada |
| --- | --- |
| `FRONTEND-REVISION-001` | `NEEDS_AUDIT` + `SUCCEEDED`; paciente Demo Sintético, edad 30. Mostrar datos y motivos de revisión sin marcar todos los null como errores. |
| `FRONTEND-FALLO-001` | `NEEDS_AUDIT` + `FAILED`, `GEMINI_TIMEOUT`, sin evidencia extraída. Mostrar fallo; no habilitar aprobación desde formulario vacío. |

Totales de esta muestra completa: Todos **2**, Pendientes **2**, Alertas inmediatas **0**. Son resultados del dataset, no constantes de UI; no contiene un caso positivo de alerta. Los valores Gemini/Neon son cadenas de ejemplo, no integraciones activadas.

### Campos del modal: vigente frente a objetivo

| Ruta/grupo real | Persistencia actual | Alcance objetivo |
| --- | --- | --- |
| `datos_extraidos.paciente.nombre` / `edad` | `correcciones.nombre_paciente` / `edad_paciente`; edad entera 0–130 o null explícito | Editable conservando original. |
| `clasificacion.tipo_documento` / `nivel_prioridad` | Mismos nombres dentro de `correcciones` | Editable con catálogo/reglas reales. |
| `datos_extraidos.medico_solicitante.nombre` / `matricula` | No admite corrección hoy; objeto puede ser null | Editable provisional y opcional; persistencia pendiente de soporte backend. |
| `estudio_realizado`, `indicacion`, `diagnostico_principal`, `cie10_sugerido` dentro de `datos_extraidos` | No admite corrección hoy | Editable provisional y opcional, sin restricciones de negocio no acordadas; persistencia pendiente de contrato. |
| `clasificacion.especialidad` / `clasificacion.score_confianza_clasificacion` | Reservada / metadato, no corregible | Solo lectura mientras no exista otra definición contractual. |
| IDs, estados, auditoría, almacenamiento y procedencia | Autoridad del servidor | Solo lectura; no incluirlos en un payload de correcciones arbitrario. |

Revisor, comentario, destino y verificación se presentan en el bloque de decisión, no se añaden a `datos_extraidos`. La ampliación deberá acordar campos admitidos, nulabilidad, validaciones y trazabilidad antes/después; esta especificación no inventa un endpoint ni cambia DTOs o backend.

**Vacíos y borrado:** en los campos sin semántica de corrección definida, dejar vacío el valor propuesto no implica borrar un dato del servidor. No convertirlo automáticamente a cero, null o eliminación ni agregar claves a la solicitud vigente. El borrado explícito de edad ya admitido, sus límites y las demás reglas conocidas se conservan.

El JSON no incluye PDF/imagen original: `ruta_objeto` es una clave interna y esos IDs no prueban que exista un registro en el servidor local. No consultar Gemini/Neon ni fabricar un original para presentar el mock como una revisión verificada. En un futuro prototipo, cualquier edición ampliada solo local debe identificarse como tal, nunca como guardado real.

## Prompt breve para iniciar una futura tarea de IA

```text
Trabajarás en el mismo repositorio y máquina del usuario. La raíz Git es
`/home/frondus/Escritorio/workspace/MediFlow - NoCountry/G10-LATAM-equipo-8`.
Lee completa `docs/mediflow-frontend-ai-spec.md` desde esa raíz antes de actuar.
Las rutas locales de JSON, guías e imágenes están en las secciones 2, 14 y 16;
no hace falta empaquetarlas ni copiarlas a otro entorno. Inspecciona el README y
los archivos existentes de tipos, servicios, hooks, vistas y componentes UI; contrasta
cualquier integración con el contrato backend citado en la especificación. Primero
entrega un PLAN con hechos, archivos que tocarías, endpoints reales, riesgos y preguntas
pendientes. No edites, instales dependencias, inicies servicios ni hagas llamadas al
backend/proveedor hasta que se apruebe el plan y el alcance concreto. Conserva React,
TypeScript, shadcn/ui y Tailwind CSS; no inventes endpoints, scores, extracción, entrega
o estados. Si lo aprobado requiere una capacidad ausente, detente y explica el bloqueo
en vez de simularla. Usa solo datos sintéticos. Para una tarea UX/UI, consulta la sección 14, revalida el estado volátil de servidores, revisa visualmente las cuatro referencias Canva y aplica la skill Impeccable; planifica la migración ReIcon allí descrita sin asumir exports ni configuración de shadcn no verificados.
```
