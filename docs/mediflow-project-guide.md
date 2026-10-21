# Guía técnica de MediFlow, archivo por archivo

Este repositorio contiene el frontend y documentación del proyecto. El backend que atiende las peticiones es otro servicio: no hay una implementación de backend en esta carpeta.

Los caminos siguientes parten de `Frontend/G10-Latam-Equipo-8/`, salvo la sección final de documentación. Se omiten dependencias, compilados y cachés; las copias locales de recuperación y práctica no forman parte de la aplicación activa.

## La idea en un minuto

```text
index.html → main.tsx → App.tsx
                       ├─ layout: estructura y navegación
                       ├─ components: lo que se ve y se puede tocar
                       └─ hooks + controllers: estado y reglas
                                  ↓
                         triajeService → API o demo explícito
```

- **Componente:** dibuja una parte de la interfaz y comunica acciones.
- **Hook:** conecta datos o controladores con el ciclo de vida de React.
- **Controlador:** mantiene reglas y transiciones de estado fuera del JSX.
- **Servicio:** habla HTTP y entrega respuestas o errores a la aplicación.
- **Tipo:** describe la forma esperada de un dato; no reemplaza la validación del servidor.

Al elegir un archivo, la carga queda en el estado compartido de App. Cambiar de destino no la reinicia. Al abrir una revisión, se consultan detalle, original y eventos por separado. Las propuestas no modifican el original; la decisión se valida y se envía mediante el contrato disponible.

## Entrada y estilos

Ubicación: `src/`.

| Archivo | Para qué sirve |
|---|---|
| [main.tsx](../Frontend/G10-Latam-Equipo-8/src/main.tsx) | Monta React en el HTML y carga los estilos globales. |
| [App.tsx](../Frontend/G10-Latam-Equipo-8/src/App.tsx) | Conecta destinos, colecciones, carga compartida, documento seleccionado y modal de revisión. |
| [index.css](../Frontend/G10-Latam-Equipo-8/src/index.css) | Define Tailwind, la fuente Geist, colores, tokens y estilos base. |
| [assets/mediflow-logo.jpg](../Frontend/G10-Latam-Equipo-8/src/assets/mediflow-logo.jpg) | Es la imagen original de la marca que muestra el lateral. |

## Estructura de la pantalla

Ubicación: `src/layout/`.

| Archivo | Para qué sirve |
|---|---|
| [DashboardLayout.tsx](../Frontend/G10-Latam-Equipo-8/src/layout/DashboardLayout.tsx) | Organiza lateral, encabezado y contenido; ofrece un destino lógico de foco. |
| [Header.tsx](../Frontend/G10-Latam-Equipo-8/src/layout/Header.tsx) | Muestra el encabezado y abre la navegación lateral en móvil. |
| [Sidebar.tsx](../Frontend/G10-Latam-Equipo-8/src/layout/Sidebar.tsx) | Muestra el logo, los cuatro destinos, el destino activo y sus contadores. |
| [DocumentCount.tsx](../Frontend/G10-Latam-Equipo-8/src/layout/DocumentCount.tsx) | Es un diseño heredado de contadores; no forma parte del flujo activo. |

## Pantallas y revisión documental

Ubicación: `src/components/dashboard/`.

| Archivo | Para qué sirve |
|---|---|
| [DocumentCollectionView.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/DocumentCollectionView.tsx) | Dibuja Pendientes, Todos y Alertas con filtros, paginación, tabla o tarjetas. |
| [DocumentUpload.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/DocumentUpload.tsx) | Es el selector de PDF e imágenes que inicia la carga compartida. |
| [UploadStatus.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/UploadStatus.tsx) | Muestra progreso, error o resultado confirmado; separa el fallo de actualización posterior. |
| [DocumentReviewDialog.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/DocumentReviewDialog.tsx) | Coordina el modal: recursos, propuestas, decisiones, cierre, foco y disposición responsive. |
| [DocumentOriginalViewer.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/DocumentOriginalViewer.tsx) | Presenta el original recibido o su error; solo previsualiza MIME permitidos. |
| [ReviewDocumentFields.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/ReviewDocumentFields.tsx) | Muestra cada valor recibido junto a una propuesta distinta; identifica campos solo locales. |
| [ReviewDecisionFields.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/ReviewDecisionFields.tsx) | Presenta revisor, comentario, destino, verificación y confirmación de rechazo. |
| [reviewDraft.ts](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/reviewDraft.ts) | Compara propuestas con el original y construye únicamente correcciones admitidas. |
| [resumenPaginacionHistorial.ts](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/resumenPaginacionHistorial.ts) | Calcula rangos y páginas; sigue activo aunque también lo use una pantalla antigua. |

## Componentes de pantalla heredados

Ubicación: `src/components/dashboard/`.

| Archivo | Para qué sirve |
|---|---|
| [AllDocumentsView.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/AllDocumentsView.tsx) | Es una versión anterior de la vista de historial, no importada por App. |
| [CriticalCasesQueue.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/CriticalCasesQueue.tsx) | Es una cola anterior con su propio flujo; no es la bandeja V2 activa. |
| [DashboardFooter.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/DashboardFooter.tsx) | Es un pie de pantalla anterior que el flujo actual no utiliza. |
| [DocumentCount.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/DocumentCount.tsx) | Es otro contador anterior; no confundirlo con el archivo homónimo de layout. |
| [LoadingState.tsx](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/LoadingState.tsx) | Es una vista de carga antigua que consume Spinner. |
| [crearSolicitudRevision.ts](../Frontend/G10-Latam-Equipo-8/src/components/dashboard/crearSolicitudRevision.ts) | Construye solicitudes del flujo anterior; conserva pruebas, pero no lo llama App V2. |

## Piezas visuales reutilizables

Ubicación: `src/components/ui/`.

| Archivo | Para qué sirve |
|---|---|
| [button.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/button.tsx) | Centraliza apariencia, variantes y comportamiento accesible de los botones. |
| [badge.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/badge.tsx) | Dibuja etiquetas pequeñas para estados y categorías. |
| [card.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/card.tsx) | Proporciona contenedor, encabezado, contenido y pie de las tarjetas. |
| [checkbox.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/checkbox.tsx) | Es la casilla utilizada para confirmar la verificación de una revisión. |
| [dialog.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/dialog.tsx) | Envuelve el modal accesible y su contenido, título y descripción. |
| [input.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/input.tsx) | Es el campo de texto de una línea con estilos compartidos. |
| [native-select.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/native-select.tsx) | Es el selector nativo usado para opciones como tipo, prioridad y destino. |
| [textarea.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/textarea.tsx) | Es el campo de texto de varias líneas. |
| [table.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/table.tsx) | Ofrece las piezas de tabla usadas por las colecciones de escritorio. |
| [tabs.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/tabs.tsx) | Ofrece pestañas y paneles para alternar datos y original en móvil. |
| [sheet.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/sheet.tsx) | Es el panel lateral accesible que usa la navegación móvil. |
| [icons.ts](../Frontend/G10-Latam-Equipo-8/src/components/ui/icons.ts) | Es el adaptador de iconos ReIcon y conserva nombres compatibles con los consumidores. |
| [spinner.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/spinner.tsx) | Es el indicador de carga reutilizable; su consumidor actual es el LoadingState heredado. |
| [alert.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/alert.tsx) | Define piezas reutilizables de aviso; no tiene consumidor activo en App. |
| [separator.tsx](../Frontend/G10-Latam-Equipo-8/src/components/ui/separator.tsx) | Define un separador visual reutilizable; no tiene consumidor activo en App. |

## Estado, peticiones y React

Ubicación: `src/hooks/`.

| Archivo | Para qué sirve |
|---|---|
| [documentCollectionsController.ts](../Frontend/G10-Latam-Equipo-8/src/hooks/documentCollectionsController.ts) | Gestiona páginas, filtros, selección, contadores y respuestas de colecciones. |
| [useDocumentCollections.ts](../Frontend/G10-Latam-Equipo-8/src/hooks/useDocumentCollections.ts) | Conecta ese controlador con el estado y ciclo de vida de React. |
| [documentUploadController.ts](../Frontend/G10-Latam-Equipo-8/src/hooks/documentUploadController.ts) | Valida la selección y mantiene un único envío con su progreso y resultado. |
| [useDocumentUpload.ts](../Frontend/G10-Latam-Equipo-8/src/hooks/useDocumentUpload.ts) | Conecta la carga con React para conservarla aunque cambie la vista. |
| [useDocumentReview.ts](../Frontend/G10-Latam-Equipo-8/src/hooks/useDocumentReview.ts) | Carga detalle, original y revisiones por separado y descarta resultados obsoletos. |
| [documentReviewDecisionController.ts](../Frontend/G10-Latam-Equipo-8/src/hooks/documentReviewDecisionController.ts) | Valida decisiones, evita envíos duplicados y trata conflictos y confirmaciones. |
| [useDocumentReviewDecision.ts](../Frontend/G10-Latam-Equipo-8/src/hooks/useDocumentReviewDecision.ts) | Conecta el controlador de decisiones con el modal y sus callbacks. |
| [useTriajes.ts](../Frontend/G10-Latam-Equipo-8/src/hooks/useTriajes.ts) | Es la orquestación anterior de triajes; no la utiliza la App V2. |

## Comunicación y contratos

Ubicación: `src/`.

| Archivo | Para qué sirve |
|---|---|
| [services/apiConfig.ts](../Frontend/G10-Latam-Equipo-8/src/services/apiConfig.ts) | Determina la base pública de la API sin activar un fallback demo ante errores. |
| [services/triajeService.ts](../Frontend/G10-Latam-Equipo-8/src/services/triajeService.ts) | Conecta el servicio compartido con la API configurada o el demo explícito. |
| [services/triajeServiceCore.ts](../Frontend/G10-Latam-Equipo-8/src/services/triajeServiceCore.ts) | Implementa las operaciones HTTP, respuestas, originales y errores estructurados. |
| [types/triaje.ts](../Frontend/G10-Latam-Equipo-8/src/types/triaje.ts) | Describe en TypeScript el JSON de documentos, estados, revisiones y originales. |
| [types/navigation.ts](../Frontend/G10-Latam-Equipo-8/src/types/navigation.ts) | Define los cuatro destinos válidos y cómo reconocer el destino activo. |
| [lib/utils.ts](../Frontend/G10-Latam-Equipo-8/src/lib/utils.ts) | Centraliza el helper para combinar clases CSS. |

## Datos sintéticos

Ubicación: `src/mocks/`.

| Archivo | Para qué sirve |
|---|---|
| [frontendReview.ts](../Frontend/G10-Latam-Equipo-8/src/mocks/frontendReview.ts) | Importa el historial sintético compartido y deriva los identificadores de sus casos. |
| [triaje.ts](../Frontend/G10-Latam-Equipo-8/src/mocks/triaje.ts) | Emula historia, cola, detalle y revisiones en memoria para el modo demo explícito. |
| [DOC-CLIN-2026-001.json](../Frontend/G10-Latam-Equipo-8/src/mocks/DOC-CLIN-2026-001.json) | Es otra muestra de contrato utilizada por las pruebas, no un documento original. |

## Pruebas automatizadas

Ubicación: `tests/`.

| Archivo | Para qué sirve |
|---|---|
| [doc-fixture.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/doc-fixture.test.mjs) | Comprueba la forma y coherencia de la muestra documental. |
| [document-api.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/document-api.test.mjs) | Prueba detalle, originales, eventos y diferencias entre API y demo. |
| [document-collections.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/document-collections.test.mjs) | Prueba páginas, filtros, respuestas tardías y actualización de colecciones. |
| [document-review-decision.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/document-review-decision.test.mjs) | Prueba validación, aprobación, corrección, rechazo, conflictos y bloqueos. |
| [document-review-resources.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/document-review-resources.test.mjs) | Prueba cargas independientes, MIME seguros y liberación de recursos temporales. |
| [document-review.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/document-review.test.mjs) | Prueba presentación, borradores, edición permitida y construcción de correcciones. |
| [eslint-scope.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/eslint-scope.test.mjs) | Comprueba qué archivos analiza o excluye el lint. |
| [icon-migration.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/icon-migration.test.mjs) | Comprueba ReIcon real, aliases, atributos SVG y el Spinner renderizado. |
| [mock-review.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/mock-review.test.mjs) | Comprueba decisiones del demo y que los rechazos inválidos no muten sus datos. |
| [navigation-upload.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/navigation-upload.test.mjs) | Prueba destinos, continuidad de carga y separación entre confirmación y refresco. |
| [pagination-history.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/pagination-history.test.mjs) | Prueba cálculos de rangos, offsets y páginas. |
| [review-request.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/review-request.test.mjs) | Mantiene pruebas del constructor de solicitudes heredado. |
| [triaje-service.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/triaje-service.test.mjs) | Prueba peticiones, payloads y errores del cliente de triajes. |
| [ui-polish.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/ui-polish.test.mjs) | Prueba logo en HTML, navegación, migración de clases y CSS de Tailwind. |
| [vite-proxy.test.mjs](../Frontend/G10-Latam-Equipo-8/tests/vite-proxy.test.mjs) | Comprueba que el proxy de desarrollo conserve el prefijo de la API. |
| [helpers/document-review-fixture.mjs](../Frontend/G10-Latam-Equipo-8/tests/helpers/document-review-fixture.mjs) | Crea documentos sintéticos reutilizables para otras pruebas. |

## Configuración del frontend

Ubicación: `raíz del frontend`.

| Archivo | Para qué sirve |
|---|---|
| [package.json](../Frontend/G10-Latam-Equipo-8/package.json) | Declara dependencias y comandos dev, build, lint y preview. |
| [package-lock.json](../Frontend/G10-Latam-Equipo-8/package-lock.json) | Fija las versiones exactas del árbol de dependencias para instalaciones reproducibles. |
| [vite.config.ts](../Frontend/G10-Latam-Equipo-8/vite.config.ts) | Configura React, Tailwind, el alias @ y el proxy de la API en desarrollo. |
| [tsconfig.json](../Frontend/G10-Latam-Equipo-8/tsconfig.json) | Une los proyectos TypeScript de la aplicación y de las herramientas. |
| [tsconfig.app.json](../Frontend/G10-Latam-Equipo-8/tsconfig.app.json) | Configura la comprobación estricta del código de la aplicación. |
| [tsconfig.node.json](../Frontend/G10-Latam-Equipo-8/tsconfig.node.json) | Configura la comprobación del código de herramientas, como Vite. |
| [eslint.config.js](../Frontend/G10-Latam-Equipo-8/eslint.config.js) | Configura reglas de calidad y exclusiones de análisis. |
| [components.json](../Frontend/G10-Latam-Equipo-8/components.json) | Configura shadcn; su metadata de Lucide no describe los iconos ReIcon del runtime. |
| [index.html](../Frontend/G10-Latam-Equipo-8/index.html) | Es el HTML inicial: contiene el punto de montaje y carga main.tsx. |
| [.gitignore](../Frontend/G10-Latam-Equipo-8/.gitignore) | Indica qué archivos locales y resultados generados no deben entrar a Git. |
| [PRODUCT.md](../Frontend/G10-Latam-Equipo-8/PRODUCT.md) | Registra usuarios, marca, dirección visual y límites funcionales del producto. |
| [README.md](../Frontend/G10-Latam-Equipo-8/README.md) | Explica instalación, ejecución, capacidades y alcance de verificación del frontend. |

## Recursos públicos

Ubicación: `public/`.

| Archivo | Para qué sirve |
|---|---|
| [favicon.svg](../Frontend/G10-Latam-Equipo-8/public/favicon.svg) | Es el icono de la pestaña, enlazado desde index.html. |
| [icons.svg](../Frontend/G10-Latam-Equipo-8/public/icons.svg) | Es un sprite SVG disponible, sin referencias activas encontradas en la aplicación. |

## Documentación y seguimiento en la raíz del repositorio

Estos caminos ya son relativos a la raíz del repositorio, no a la del frontend.

| Archivo | Para qué sirve |
|---|---|
| [README.md](../README.md) | Es la portada del repositorio; actualmente contiene solo el título. |
| [docs/mediflow-frontend-ai-spec.md](mediflow-frontend-ai-spec.md) | Especificación y contexto histórico de V2; no es prueba de funcionamiento actual. |
| [docs/mediflow-project-guide.md](mediflow-project-guide.md) | Esta guía: mapa técnico para entender qué tocar y por qué. |
| [docs/mediflow-agente-autonomo.md](mediflow-agente-autonomo.md) | Visión y propuestas del proyecto completo; no acredita que esos servicios estén activos. |
| [docs/plan-equipo.md](plan-equipo.md) | Plan de trabajo y coordinación del equipo, no configuración ejecutable. |
| [docs/examples/frontend-review/README.md](examples/frontend-review/README.md) | Explica la muestra documental y sus limitaciones. |
| [docs/examples/frontend-review/historial.json](examples/frontend-review/historial.json) | Historial sintético compartido que importa el adaptador demo. |
| [odd/tasks/mediflow-frontend-v2.md](../odd/tasks/mediflow-frontend-v2.md) | Solicitud, tareas, decisiones, evidencia y commits de V2. |
| [odd/tasks/mediflow-ui-polish-project-guide.md](../odd/tasks/mediflow-ui-polish-project-guide.md) | Seguimiento del logo, clases, esta guía y la publicación solicitada. |

`odd/` sirve para retomar trabajo, no se carga en la aplicación. Las notas locales `mediflow-local-recovery.md` y `mediflow-v2-reconstruction.md` registran recuperación/comparación; no son módulos del producto y no se modificaron para esta guía.

## Qué conviene no confundir

1. **Estado de revisión, procesamiento técnico y prioridad clínica son cosas distintas.** Pendientes de auditoría no equivale a urgencias.
2. **Registrar no equivale a extraer correctamente.** Un 201 puede confirmar un documento cuyo procesamiento terminó en FAILED.
3. **Propuesta local no equivale a guardado.** Solo nombre, edad, tipo y prioridad forman correcciones admitidas; otros campos se identifican como locales.
4. **Confirmación no equivale a refresco correcto.** Un fallo posterior al recargar la lista no convierte una decisión confirmada en fallida.
5. **Demo no es fallback de red.** El error de la API no hace que aparezcan datos ficticios silenciosamente.
6. **Contrato no es promesa clínica ni de infraestructura.** No se afirma autenticación, despacho, persistencia OCI o validación clínica activa.
7. **SSR no es una captura real.** Las pruebas de HTML y controladores no demuestran por sí solas el tamaño visual, los gestos o el foco en un navegador.

Hay archivos heredados que se conservaron para no mezclar esta mejora con una limpieza de código. Para saber qué ejecuta la aplicación, seguí los imports desde App, no solo el nombre de una carpeta.

## Por dónde empezar a leer

1. `src/main.tsx` y `src/App.tsx`: entrada y composición.
2. `src/types/triaje.ts`: datos que circulan.
3. `src/services/triajeServiceCore.ts`: cómo se habla con la API.
4. Los controladores de `src/hooks/`: reglas y asincronía.
5. `DocumentCollectionView.tsx` y `DocumentReviewDialog.tsx`: cómo esas reglas se presentan.
6. El test de la misma funcionalidad: ejemplos de lo permitido y lo rechazado.

La especificación y los tipos dentro de este repositorio son enlaces disponibles para esta lectura; cualquier contrato adicional del backend debe consultarse en su repositorio correspondiente. Los valores privados de `.env` no se abrieron ni forman parte de esta guía.
