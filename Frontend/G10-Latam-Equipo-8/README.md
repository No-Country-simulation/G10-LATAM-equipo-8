# MediFlow - Frontend (Panel de Administración y Triaje Clínico)

> **Hackathon ONE · Grupo 10** | Agente Autónomo para Triaje, Extracción y Enrutamiento de Documentos Clínicos en Oracle Cloud Infrastructure (OCI).

---

## 🏥 Descripción del Proyecto

**MediFlow Frontend** es la interfaz web para la auditoría y visualización del procesamiento automatizado de documentación médica. Proporciona una experiencia fluida, accesible y responsiva para auditores médicos y personal administrativo en flujos de **Human-in-the-Loop (HITL)**, permitiendo supervisar las clasificaciones generadas por agentes de inteligencia artificial y gestionar casos críticos o ambiguos antes de su enrutamiento final.

---

## 🚀 Características Principales

* **Shell y bandejas:** navegación entre cuatro destinos, colecciones, filtros y paginación integrados; el alcance de verificación se detalla en T8.
* **Cuatro destinos en memoria:** Cargar documentos, Pendientes, Todos los documentos y Alertas inmediatas, sin rutas URL nuevas.
* **Carga compartida:** Selector PDF/PNG/JPG/JPEG con estado, errores y resultado consultables al navegar; la API valida límites y confirma los registros.
* **Colecciones conectadas:** Pendientes muestra la cola de auditoría; Alertas inmediatas se limita a documentos con `alerta_urgente === true` y estado distinto de `APPROVED` en el historial cargado, no a un total global.
* **Revisión HITL:** El modal conserva el original y las propuestas locales, con aprobación/corrección y rechazo confirmados mediante los métodos vigentes de la API.
* **Desplazamiento móvil:** tarjetas y encabezado/contenido del modal validados manualmente por el usuario en Brave móvil, Samsung S24. La integración montada de T8 pasó además sus 11 escenarios no táctiles.

---

## 🛠️ Stack Tecnológico

* **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
* **Empaquetador & Dev Server:** [Vite 8](https://vite.dev/) (con motor Rolldown y Fast Refresh)
* **Estilos & Diseño:** [Tailwind CSS v4](https://tailwindcss.com/)
* **Componentes de UI:** [Shadcn UI](https://ui.shadcn.com/) (primitivos accesibles sobre [Radix UI](https://www.radix-ui.com/))
* **Iconografía:** [ReIcon React](https://reicon.dev/docs/react), mediante imports explícitos por icono en `src/components/ui/icons.ts`. La integración usa los subpaths públicos verificados del paquete `reicon-react` y conserva nombres accesibles, tamaños y estados de los controles.
* **Calidad de Código:** ESLint 10 (Flat Config con reglas optimizadas para React Refresh)

Los iconos nuevos se agregan manualmente desde el adaptador local; por ejemplo: `import { ClipboardList } from "@/components/ui/icons"`. `components.json` conserva su valor existente para Lucide: la migración no afirma compatibilidad de ReIcon con el generador de shadcn.

---

## 📂 Estructura del Proyecto

El proyecto sigue principios de **Clean Architecture** y **Screaming Architecture**, separando responsabilidades por capas:

```text
src/
├── assets/                  # Recursos gráficos y estáticos
├── components/
│   ├── dashboard/           # Componentes del flujo documental activo
│   │   ├── DocumentCollectionView.tsx # Bandejas, filtros y tabla/tarjetas
│   │   ├── DocumentReviewDialog.tsx   # Modal y recursos de la revisión
│   │   ├── DocumentOriginalViewer.tsx # Visor del original recibido
│   │   ├── ReviewDocumentFields.tsx   # Valores originales y propuestas
│   │   ├── ReviewDecisionFields.tsx   # Validación de decisiones y rechazo
│   │   └── DocumentUpload.tsx         # Selector de archivos
│   └── ui/                  # Primitivos accesibles y adaptador de iconos
├── hooks/                   # Controladores de carga, colecciones y decisiones
├── layout/
│   ├── DashboardLayout.tsx  # Flujo móvil y contención de escritorio
│   ├── Header.tsx           # Encabezado y navegación móvil vía Sheet
│   └── Sidebar.tsx          # Navegación lateral
├── types/                   # Contratos de triaje y revisión
├── mocks/                   # Adaptador de la muestra sintética portable
├── services/                # Cliente HTTP y modo demo explícito
├── App.tsx                  # Ensamblador de destinos y estado compartido
├── index.css                # Estilos y tokens Tailwind
└── main.tsx                 # Punto de entrada React
```

---

## 📚 Guía técnica del proyecto

Para entender qué hace cada archivo importante, cómo se conectan las capas y qué piezas son heredadas, consultá la [guía técnica de MediFlow](../../docs/mediflow-project-guide.md).

## 🗺️ Estado de implementación V2

| Unidad | Estado |
|---|---|
| T1–T3: base, servicios, navegación y carga compartida | Implementadas y verificadas como unidades de código. |
| T4–T6: bandejas, modal y decisiones | Implementadas; pruebas de lógica, revisiones independientes y los 11 escenarios montados de T8 verificados dentro de sus respectivos alcances. |
| T7: migración a ReIcon | Implementada con `reicon-react@1.2.6`; generador de shadcn sin cambios no verificados. |
| T8: integración y cierre | Base V2 `685722f` verificada: 11/11 escenarios montados no táctiles, checks locales y confirmación manual de los dos gestos móviles. |

El detalle de requisitos, evidencia y commits está en [el seguimiento V2](../../odd/tasks/mediflow-frontend-v2.md). Este estado no acredita despliegue, activación de proveedores ni persistencia en OCI.

### UX/UI V2: shell T3 y límites

T3 implementa el shell responsive con cuatro destinos en memoria: Cargar documentos, Pendientes, Todos los documentos y Alertas inmediatas. Pendientes usa la cola de auditoría; su contador no representa urgencia clínica. Alertas inmediatas solo filtra `alerta_urgente === true` entre los registros cargados de la página de historial e informa ese alcance local. El estado de carga vive en App y permanece consultable al cambiar de destino; el resultado confirmado se separa de errores de actualización de colecciones. PDF, PNG, JPG y JPEG se validan localmente por extensión/MIME cuando está disponible; los límites y rechazos 413/415 siguen bajo autoridad de la API. Un 201 con `processing_status=FAILED` se muestra como fallo técnico registrado, no como extracción exitosa.

La procedencia distingue el modo demo (`Datos ficticios`) del modo API; `modo_ia=simulado` no prueba que un archivo subido sea ficticio. T4 conecta las bandejas con el modal; T5 conserva original, propuestas locales y protecciones del visor, y T6 integra decisiones reales sobre el contrato vigente. T7 migra los iconos del frontend activo a ReIcon mediante el adaptador local y subpaths públicos por icono. Se conserva la [especificación](../../docs/mediflow-frontend-ai-spec.md), secciones 15–16, y las referencias Canva aprobadas; no se simula un original descargable y el alcance real de verificación se distingue en T8. El [mock de datos](../../docs/examples/frontend-review/README.md) sigue siendo la muestra portable existente, sin copia adicional del JSON.

### Bandejas, filtros y contexto (T4)

- **Pendientes** consulta la cola de auditoría con `offset` y `limit`, sin añadir un filtro HTTP de estado.
- El badge de **Todos los documentos**, tanto en escritorio como en el menú móvil, muestra el último total global confirmado de una respuesta sin filtros. Un total desconocido no se representa como cero; un cero confirmado sí se muestra. La paginación conserva el total del historial filtrado y un fallo de la lectura adicional conserva el último total conocido.
- **Todos los documentos** y **Alertas inmediatas** comparten la página de historial y su filtro de estado de revisión. El historial admite ese filtro HTTP; Alertas selecciona únicamente registros con `alerta_urgente === true` y estado distinto de `APPROVED` entre los registros recibidos, sin aparentar una consulta o un total global de alertas.
- **Paciente o documento** y **Tipo de documento** filtran solo la página cargada. La búsqueda de paciente o identificador ignora mayúsculas, minúsculas y tildes, sin cambiar el texto mostrado ni los datos originales. La introducción de Alertas inmediatas usa lenguaje sencillo; el contador y la paginación mantienen explícito el alcance de la página cargada. Las coincidencias locales no sustituyen el total ni la paginación del servidor; una página sin coincidencias puede tener páginas siguientes.
- **Revisar** abre el modal sobre la colección actual para cualquier estado recibido. Cerrar la selección no reinicia destino, búsqueda, tipo, estado ni página. El resultado confirmado de una carga también puede abrirse sin navegación automática.
- Los errores de lectura permiten reintentar la consulta, no la extracción de IA. Una actualización fallida conserva las páginas previas y se informa por separado del documento cuya carga ya fue confirmada.

### Actualización de colecciones y borradores en sesión

Con la carga inicial resuelta, el frontend consulta historial y cola de auditoría mediante los GET existentes cada aproximadamente cinco segundos mientras la pestaña está visible. Los ciclos periódicos esperan a que termine la lectura anterior; la pestaña oculta pausa los temporizadores y volver a mostrarla provoca una única reconciliación. Un error mantiene la última página buena, aparece en el aviso existente y separa los siguientes intentos con espera exponencial limitada a 60 segundos. La actualización manual y las actualizaciones tras carga/revisión conservan su estado de carga y errores habituales, y tienen prioridad sobre una lectura periódica.

Si hay un filtro de estado en el historial, se añade una lectura del historial sin filtro para actualizar el total global; sin ese filtro se reutiliza el total de la respuesta habitual. Esa lectura adicional no sustituye la página filtrada ni convierte su total en global.

### Modal de revisión documental (T5–T6, integrado mediante T4)

`src/components/dashboard/DocumentReviewDialog.tsx` exporta `DocumentReviewDialog` con `document`, `onClose`, `onReturnFocus` opcional y `busy` opcional (por defecto `false`). `App` lo monta con `key={document.documento_id}`. Las acciones de las filas conservan un destino de foco; el modal admite además `onReturnFocus` o un elemento lógico marcado con `data-review-dialog-return-focus`.

El modal carga detalle, bytes originales y eventos de revisión de forma independiente mediante el servicio compartido. Mantiene separados sus estados y errores; el JSON demo comunica que no contiene los bytes originales. Solo ofrece vista previa para `application/pdf`, `image/png` e `image/jpeg` recibidos; los demás MIME no se interpretan como HTML/SVG. Se revoca cada URL temporal al cambiar el original o desmontar el visor. Debajo del visor, **Descargar original** usa esa misma URL temporal validada y el nombre recibido, sin otra consulta ni convertir la clave de almacenamiento en una URL pública. La acción permanece deshabilitada hasta disponer de la vista previa válida; no abre una ventana nueva.

Los valores originales permanecen visibles junto a propuestas distintas. Datos del médico y del estudio se identifican como solo locales; no se guardan ni envían. Solo nombre, edad, tipo documental y prioridad pueden formar correcciones admitidas por la API; los valores locales no se incluyen. Un campo vacío no implica borrado y la edad nula requiere una acción explícita. Revisor declarado, comentario, destino final y verificación son requisitos separados; cambiar una propuesta o un dato de decisión invalida la verificación. La prioridad **Urgente** exige `EMERGENCIA_MEDICA`. `FAILED` muestra **Revisar procesamiento**, prioridad nula como **Sin evaluar** y `processing_error` dentro de un diagnóstico desplegable; no permite aprobar desde un formulario vacío, aunque sí confirmar un rechazo. El rechazo comparte el modal y usa el comentario como motivo, sin aplicar correcciones locales.

Una decisión confirmada cierra el modal y vuelve a consultar las colecciones; un error posterior de actualización se comunica como separado de la decisión ya confirmada. Un `409` vuelve a leer el detalle y bloquea otra acción en ese modal; los errores de red/servidor inciertos tampoco ofrecen reenvío automático. No hay persistencia de borradores ni afirmaciones de despacho. Escape/clic exterior/cierre piden confirmar el descarte si hay cambios y bloquean el cierre durante el envío. T8 verificó el foco, la geometría y los estados montados con respuestas sintéticas. Al cerrar se restaura un disparador visible o un destino lógico de la colección; si la última fila desaparece tras confirmar la revisión, el área principal recibe el foco sin desplazar la página ni quitarle un foco deliberado al usuario.

La sección **Revisiones registradas** dispone de un contenedor padre con el mismo espaciado horizontal móvil y de escritorio que los paneles superiores. Sus estados de carga, error, vacío y eventos se mantienen separados de la edición del documento.

### Desplazamiento y verificación (T8)

- **Móvil, menos de 1024 px:** las tarjetas participan del scroll de la página, sin un contenedor de desplazamiento propio. En el modal, encabezado, motivos, pestañas y contenido comparten un scroller vertical; el pie de cierre queda fuera.
- **Escritorio, desde 1024 px:** el original permanece a la izquierda y los datos a la derecha, con paneles de desplazamiento independientes.

**Evidencia histórica del ajuste visual, anterior a la limpieza manual:** ese candidato pasó **73/73 pruebas**, lint, TypeScript y build. Su verificación visual focalizada pasó **6/6 grupos en Brave**: logo y navegación en 1440/1024/390 px, y textos largos del modal en 320/768/1440 px. Se inspeccionaron ocho capturas con API sintética, 21 GET y ningún POST real. Esos resultados corresponden al candidato anterior, no a la limpieza siguiente. No se observó desborde de página o modal; la tabla intermedia conserva su desplazamiento horizontal interno. Los 11 escenarios siguientes pertenecen a la base V2, no son una nueva ejecución del ajuste visual. Ver [el seguimiento del ajuste y la guía](../../odd/tasks/mediflow-ui-polish-project-guide.md).

**Verificación de pruebas y lint tras la limpieza:** `NODE_DISABLE_COMPILE_CACHE=1 node --test tests/icon-migration.test.mjs` pasó **2/2 pruebas**; `NODE_DISABLE_COMPILE_CACHE=1 node --test tests/*.test.mjs` pasó **66/66 pruebas**; y `NODE_DISABLE_COMPILE_CACHE=1 ./node_modules/.bin/eslint .` terminó correctamente. Estos resultados de Node y ESLint no sustituyen la comprobación de TypeScript ni el build de Vite. No se repitió la verificación en navegador ni se obtuvo aprobación nativa.

| Evidencia histórica de la base V2 (`685722f`) | Alcance |
|---|---|
| 69/69 tests, lint, TypeScript y build correctos | Lógica, preservación y SSR de iconos; no prueban gestos ni geometría montada. El build conserva la advertencia de importación dinámica preexistente. |
| Tarjetas y modal funcionan en Brave móvil, Samsung S24 | Confirmación manual reportada por el usuario; no es una prueba automatizada ni de otros dispositivos. |
| Detector Impeccable: 0 hallazgos | Análisis estático de los cuatro archivos UI modificados, no prueba de interacción. |
| 11/11 escenarios montados de integración | Vite real en Brave aislado, API sintética interceptada antes de navegar: 320/390/768/1024/1440 px, contenido largo, Tab/Shift+Tab/Escape y retorno de foco, carga/error/vacío, prioridad nula/urgente, contexto, decisiones/conflicto 409 y continuidad de carga con actualización fallida. Sin errores de ejecución ni solicitudes API desconocidas. |
| Reflow equivalente al 200% | 720 px CSS con DPR 2; no es zoom real del menú del navegador ni del sistema operativo. |
| Evaluación nativa | No disponible en este entorno; no se afirma aprobación nativa. |

El lote T8 de esa base terminó con salida 0 y limpieza 0; los cuatro archivos UI conservaron las mismas huellas antes y después. Se revisaron las capturas de las cinco anchuras, contenido largo, extracción fallida y carga confirmada con error de actualización. Son **11 escenarios automatizados no táctiles y dos comprobaciones manuales de gestos**, no 13 automatizados.

La muestra portable no aporta bytes originales ni eventos de revisión: la verificación conserva esos estados honestos, sin fabricar evidencia clínica. No acredita bytes originales positivos, mutaciones contra el backend real, persistencia, proveedores ni decisiones clínicas. El seguimiento V2 conserva las limitaciones y el origen de cada comprobación.

### Servicio de detalle, original y revisiones

- `triajeService.provenance` informa `"api"` o `"demo"`; una URL base explícitamente vacía conserva el modo demo y los fallos HTTP no cambian silenciosamente a mocks.
- `getDetalleTriaje(documentId: string): Promise<TriajeDocumento>` consulta el detalle disponible; en demo solo resuelve IDs de la muestra portable.
- `getDocumentoOriginal(documentId: string): Promise<DocumentoOriginal>` devuelve `{ blob, contentType, filename? }` desde los bytes y headers HTTP. En demo rechaza porque la muestra no incluye PDF/imagen.
- `getRevisiones(documentId: string): Promise<ReviewEventResponse[]>` devuelve el array del contrato; el modo demo no inventa eventos y expone una lista vacía para los fixtures conocidos.
- `TriajeServiceError` conserva `status`, `statusText`, `body` y `detail` para que la UI gestione, entre otros, conflictos `409` sin perder el error del backend.

---

## 💻 Guía de Ejecución Local

### Prerrequisitos
* **Node.js**: Versión 20.x o superior recomendada.
* **npm**: Versión 10.x o superior.

### 1. Clonar el repositorio y acceder a la carpeta del frontend
```bash
git clone git@github.com:No-Country-simulation/G10-LATAM-equipo-8.git
cd G10-LATAM-equipo-8/Frontend/G10-Latam-Equipo-8
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el servidor de desarrollo
```bash
npm run dev
```
La aplicación estará disponible de forma local en `http://localhost:5173/`.

### Conectar con el backend local

En otra terminal, desde `backend/` del repositorio del backend y con su entorno `.venv` preparado, iniciá FastAPI en el puerto `8002` en modo simulado:

```bash
AI_MODE=simulated REPOSITORY_MODE=memory STORAGE_MODE=local \
  .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```

Al ejecutar `npm run dev`, Vite reenvía únicamente las solicitudes `/api/v1` a `http://127.0.0.1:8002` y conserva la ruta original. Si `VITE_API_URL` no está definida, el cliente usa `/api/v1` y esta ruta pasa por el proxy local.

- Para forzar el proxy sin editar archivos de entorno, ejecutá `VITE_API_URL=/api/v1 npm run dev`.
- Para optar explícitamente por el modo demo existente, inicia el frontend con `VITE_API_URL="" npm run dev`. Historial, cola y revisión usan sus mocks; la carga de archivos sigue requiriendo un backend configurado.
- Un `VITE_API_URL` con origen absoluto, por ejemplo `VITE_API_URL=http://127.0.0.1:8002 npm run dev`, reemplaza la base relativa y no usa el proxy de Vite. Esa conexión directa puede requerir CORS en el backend.
- Vite Preview (`npm run preview`) hereda `server.proxy` por defecto mediante `preview.proxy`. Sirve el build de producción: esa herencia no cambia la base `VITE_API_URL` definida al compilar ni convierte un build mock en modo API.
- Un despliegue estático de producción no hereda el proxy de Vite. Sin `VITE_API_URL` en el build de producción se conserva el comportamiento mock existente; para una base `/api/v1` en un sitio publicado, el hosting debe proporcionar un reverse proxy de mismo origen.

En una etapa anterior, la comunicación HTTP por proxy se verificó con FastAPI simulado, memoria y almacenamiento temporal: historial/cola, carga multipart, descarga del original y rechazo, incluyendo errores 404/409 sin duplicar revisiones. Los servidores y datos de prueba se limpiaron. Esto no acredita extracción real de PDF, despacho ni una prueba visual en navegador.

> **Nota para pruebas en red local (móviles):**
> Si querés acceder desde un dispositivo móvil en la misma red Wi-Fi, ejecutá:
> ```bash
> npm run dev -- --host
> ```

### 4. Ejecutar el linter
```bash
npm run lint
```
### Registro histórico anterior a V2

El agente de implementación observó `npm run lint` con salida 0 después de agregar únicamente `recovery/**` a los global ignores existentes. El comando y las reglas para código activo se conservaron; no se añadieron ignores para `src/` ni `tests/`. Registró 2/2 pruebas focalizadas y 25/25 en la suite completa. El coordinador repitió las dos pruebas focalizadas con salida 0: la CLI pública ignora el fixture recuperado y sigue rechazando la variable sin usar del fixture `src/` con el mismo error.

**Resultado histórico, anterior al ajuste:** `npm run lint` salió con código 1 por `_documento` sin usar en `recovery/mediflow-v2-reconstruction/src/components/dashboard/puedeRevisarseDocumento.ts:17:39`. El overlay no se modificó; ese fallo ya no representa el estado actual del linter. En la verificación previa del proxy, la suite de 23 pruebas y `npm run build` terminaron con salida 0; no se repitió el build en esta etapa de documentación.

**Especificación UX/UI V2:** [`docs/mediflow-frontend-ai-spec.md`](../../docs/mediflow-frontend-ai-spec.md), secciones 15–16, incorpora el menú, revisión modal y alcance ampliado acordados, con un [mock JSON fiel al backend](../../docs/examples/frontend-review/historial.json). Preserva las cuatro referencias Canva, adaptaciones al contrato y equivalencias Tailwind propuestas; se usaron Shape/Operate de Impeccable. La interfaz implementa el alcance contractual descrito; las propuestas sin soporte API siguen siendo locales y la muestra no contiene originales. La evidencia actual y los pendientes se distinguen en T8.
