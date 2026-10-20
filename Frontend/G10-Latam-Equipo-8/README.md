# MediFlow - Frontend (Panel de Administración y Triaje Clínico)

> **Hackathon ONE · Grupo 10** | Agente Autónomo para Triaje, Extracción y Enrutamiento de Documentos Clínicos en Oracle Cloud Infrastructure (OCI).

---

## 🏥 Descripción del Proyecto

**MediFlow Frontend** es la interfaz web para la auditoría y visualización del procesamiento automatizado de documentación médica. Proporciona una experiencia fluida, accesible y responsiva para auditores médicos y personal administrativo en flujos de **Human-in-the-Loop (HITL)**, permitiendo supervisar las clasificaciones generadas por agentes de inteligencia artificial y gestionar casos críticos o ambiguos antes de su enrutamiento final.

---

## 🚀 Características Principales

* **Shell y bandejas:** navegación entre cuatro destinos, colecciones, filtros y paginación integrados; la verificación visual responsive en navegador sigue pendiente.
* **Cuatro destinos en memoria:** Cargar documentos, Pendientes, Todos los documentos y Alertas inmediatas, sin rutas URL nuevas.
* **Carga compartida:** Selector PDF/PNG/JPG/JPEG con estado, errores y resultado consultables al navegar; la API valida límites y confirma los registros.
* **Colecciones conectadas:** Pendientes muestra la cola de auditoría; Alertas inmediatas se limita a `alerta_urgente === true` en el historial cargado, no a un total global.
* **Revisión HITL:** El modal conserva el original y las propuestas locales, con aprobación/corrección y rechazo confirmados mediante los métodos vigentes de la API.
* La comprobación visual responsive en navegador está pendiente; este resumen no afirma validación en viewports reales.

---

## 🛠️ Stack Tecnológico

* **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
* **Empaquetador & Dev Server:** [Vite 8](https://vite.dev/) (con motor Rolldown y Fast Refresh)
* **Estilos & Diseño:** [Tailwind CSS v4](https://tailwindcss.com/)
* **Componentes de UI:** [Shadcn UI](https://ui.shadcn.com/) (primitivos accesibles sobre [Radix UI](https://www.radix-ui.com/))
* **Iconografía actual:** [Lucide React](https://lucide.dev/). Una migración completa a ReIcon está planificada para una etapa futura; ver [`docs/mediflow-frontend-ai-spec.md`](../../docs/mediflow-frontend-ai-spec.md).
* **Calidad de Código:** ESLint 9 (Flat Config con reglas optimizadas para React Refresh)

---

## 📂 Estructura del Proyecto

El proyecto sigue principios de **Clean Architecture** y **Screaming Architecture**, separando responsabilidades por capas:

```text
src/
├── assets/                  # Recursos gráficos y estáticos (logo institucional, etc.)
├── components/
│   ├── dashboard/           # Componentes de negocio específicos del panel
│   │   ├── CriticalCasesQueue.tsx  # Cola de casos críticos (vista dual tabla/tarjeta)
│   │   ├── DashboardFooter.tsx     # Pie de página institucional y enlaces OCI
│   │   ├── DocumentCount.tsx       # Contadores métricos de triaje y alertas
│   │   └── DocumentUpload.tsx      # Dropzone de ingesta de archivos
│   └── ui/                  # Componentes primitivos desacoplados (Shadcn UI)
│       ├── button.tsx
│       ├── card.tsx
│       ├── sheet.tsx
│       └── table.tsx
├── layout/                  # Cascarón estructural de la aplicación
│   ├── DashboardLayout.tsx  # Layout principal con control estricto de viewport
│   ├── Header.tsx           # Encabezado responsive (Desktop + Mobile Sheet)
│   └── Sidebar.tsx          # Barra de navegación lateral con identidad visual
├── types/                   # Contratos de datos e interfaces de dominio (Fase 2)
├── mocks/                   # Datos simulados estructurados para desarrollo aislado (Fase 2)
├── services/                # Servicios HTTP y comunicación con backend API/OCI (Fase 3)
├── App.tsx                  # Ensamblador de vistas y layout raíz
├── index.css                # Configuración global de estilos y tokens Tailwind v4
└── main.tsx                 # Punto de entrada de la aplicación React
```

---

## 🗺️ Roadmap de Implementación (Frontend)

- [x] **Fase 1: Maquetado y Shell Responsivo**
  - [x] Configuración de entorno base (Vite + Tailwind v4 + Shadcn UI).
  - [x] Estructura de `DashboardLayout` con contención de viewport (`h-screen overflow-hidden`) y flexbox sin desbordes (`min-w-0`, `min-h-0`).
  - [x] `Sidebar` con branding y navegación principal.
  - [x] `Header` con variante de escritorio y menú móvil vía `Sheet`.
  - [x] Módulo `DocumentUpload` (dropzone de carga).
  - [x] `CriticalCasesQueue` con comportamiento adaptativo (Tabla en escritorio / Tarjetas en mobile).
  - [x] Integración de `DashboardFooter`.
  - [x] Saneamiento de ESLint Flat Config para componentes de UI.

- [ ] **Fase 2: Contratos de Datos y Mocks Clínicos (Type-Driven Development)**
  - [ ] Modelado de interfaces TypeScript (`src/types/triaje.ts`) siguiendo el contrato oficial del backend.
  - [ ] Creación de datasets simulados (`src/mocks/triajes.ts`) cubriendo los 3 escenarios obligatorios del hackathon:
    1. Caso estándar de rutina aprobado automáticamente.
    2. Caso con prioridad de urgencia médica.
    3. Caso ambiguo/inconsistente derivado a auditoría humana (*Human-in-the-Loop*).
  - [ ] Conexión de componentes a los tipos formales en lugar de datos hardcodeados.

- [ ] **Fase 3: Lógica Interactiva y Estado Human-in-the-Loop (HITL)**
  - [ ] Manejo de estado reactivo para la aprobación y rechazo de casos en la cola crítica.
  - [ ] Simulación de ingesta de archivos en el dropzone con previsualización y validación de formatos (PDF / Imágenes).
  - [ ] Feedback visual interactivo (estados de carga, confirmación y alertas).

- [ ] **Fase 4: Integración con API REST y Despliegue**
  - [ ] Creación del cliente de servicios (`src/services/triajeService.ts`).
  - [ ] Conexión con endpoints de backend (FastAPI / n8n en OCI Compute).
  - [ ] Validación de persistencia de documentos en OCI Object Storage.

### UX/UI V2: shell T3 y límites

T3 implementa el shell responsive con cuatro destinos en memoria: Cargar documentos, Pendientes, Todos los documentos y Alertas inmediatas. Pendientes usa la cola de auditoría; su contador no representa urgencia clínica. Alertas inmediatas solo filtra `alerta_urgente === true` entre los registros cargados de la página de historial e informa ese alcance local. El estado de carga vive en App y permanece consultable al cambiar de destino; el resultado confirmado se separa de errores de actualización de colecciones. PDF, PNG, JPG y JPEG se validan localmente por extensión/MIME cuando está disponible; los límites y rechazos 413/415 siguen bajo autoridad de la API. Un 201 con `processing_status=FAILED` se muestra como fallo técnico registrado, no como extracción exitosa.

La procedencia distingue el modo demo (`Datos ficticios`) del modo API; `modo_ia=simulado` no prueba que un archivo subido sea ficticio. T4 conecta las bandejas con el modal; T5 conserva original, propuestas locales y protecciones del visor, y T6 integra decisiones reales sobre el contrato vigente. La migración completa a ReIcon corresponde a T7. Se conserva la [especificación](../../docs/mediflow-frontend-ai-spec.md), secciones 15–16, y las referencias Canva aprobadas; no se simula un original descargable ni se declara comprobación visual en navegador. El [mock de datos](../../docs/examples/frontend-review/README.md) sigue siendo la muestra portable existente, sin copia adicional del JSON.

### Bandejas, filtros y contexto (T4)

- **Pendientes** consulta la cola de auditoría con `offset` y `limit`, sin añadir un filtro HTTP de estado.
- **Todos los documentos** y **Alertas inmediatas** comparten la página de historial y su filtro de estado de revisión. El historial admite ese filtro HTTP; Alertas selecciona únicamente `alerta_urgente === true` entre los registros recibidos, sin aparentar una consulta o un total global de alertas.
- **Paciente o documento** y **Tipo de documento** filtran solo la página cargada. Las coincidencias locales no sustituyen el total ni la paginación del servidor; una página sin coincidencias puede tener páginas siguientes.
- **Revisar** abre el modal sobre la colección actual para cualquier estado recibido. Cerrar la selección no reinicia destino, búsqueda, tipo, estado ni página. El resultado confirmado de una carga también puede abrirse sin navegación automática.
- Los errores de lectura permiten reintentar la consulta, no la extracción de IA. Una actualización fallida conserva las páginas previas y se informa por separado del documento cuya carga ya fue confirmada.

### Modal de revisión documental (T5–T6, integrado mediante T4)

`src/components/dashboard/DocumentReviewDialog.tsx` exporta `DocumentReviewDialog` con `document`, `onClose`, `onReturnFocus` opcional y `busy` opcional (por defecto `false`). `App` lo monta con `key={document.documento_id}`. Las acciones de las filas conservan un destino de foco; el modal admite además `onReturnFocus` o un elemento lógico marcado con `data-review-dialog-return-focus`.

El modal carga detalle, bytes originales y eventos de revisión de forma independiente mediante el servicio compartido. Mantiene separados sus estados y errores; el JSON demo comunica que no contiene los bytes originales. Solo ofrece vista previa para `application/pdf`, `image/png` e `image/jpeg` recibidos; los demás MIME no se interpretan como HTML/SVG. Se revoca cada URL temporal al cambiar el original o desmontar el visor.

Los valores originales permanecen visibles junto a propuestas distintas. Datos del médico y del estudio se identifican como solo locales; no se guardan ni envían. Solo nombre, edad, tipo documental y prioridad pueden formar correcciones admitidas por la API; los valores locales no se incluyen. Un campo vacío no implica borrado y la edad nula requiere una acción explícita. Revisor declarado, comentario, destino final y verificación son requisitos separados; cambiar una propuesta o un dato de decisión invalida la verificación. La prioridad **Urgente** exige `EMERGENCIA_MEDICA`. `FAILED` muestra **Revisar procesamiento**, prioridad nula como **Sin evaluar** y `processing_error` dentro de un diagnóstico desplegable; no permite aprobar desde un formulario vacío, aunque sí confirmar un rechazo. El rechazo comparte el modal y usa el comentario como motivo, sin aplicar correcciones locales.

Una decisión confirmada cierra el modal y vuelve a consultar las colecciones; un error posterior de actualización se comunica como separado de la decisión ya confirmada. Un `409` vuelve a leer el detalle y bloquea otra acción en ese modal; los errores de red/servidor inciertos tampoco ofrecen reenvío automático. No hay persistencia de borradores ni afirmaciones de despacho. Escape/clic exterior/cierre piden confirmar el descarte si hay cambios y bloquean el cierre durante el envío. La verificación de foco, geometría y comportamiento responsive con interacciones reales de navegador sigue pendiente en T8.

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

La comunicación HTTP por proxy se verificó con FastAPI simulado, memoria y almacenamiento temporal: historial/cola, carga multipart, descarga del original y rechazo, incluyendo errores 404/409 sin duplicar revisiones. Los servidores y datos de prueba se limpiaron. Esto no acredita extracción real de PDF, despacho ni una prueba visual en navegador.

> **Nota para pruebas en red local (móviles):**
> Si querés acceder desde un dispositivo móvil en la misma red Wi-Fi, ejecutá:
> ```bash
> npm run dev -- --host
> ```

### 4. Ejecutar el linter
```bash
npm run lint
```
El agente de implementación observó `npm run lint` con salida 0 después de agregar únicamente `recovery/**` a los global ignores existentes. El comando y las reglas para código activo se conservaron; no se añadieron ignores para `src/` ni `tests/`. Registró 2/2 pruebas focalizadas y 25/25 en la suite completa. El coordinador repitió las dos pruebas focalizadas con salida 0: la CLI pública ignora el fixture recuperado y sigue rechazando la variable sin usar del fixture `src/` con el mismo error.

**Resultado histórico, anterior al ajuste:** `npm run lint` salió con código 1 por `_documento` sin usar en `recovery/mediflow-v2-reconstruction/src/components/dashboard/puedeRevisarseDocumento.ts:17:39`. El overlay no se modificó; ese fallo ya no representa el estado actual del linter. En la verificación previa del proxy, la suite de 23 pruebas y `npm run build` terminaron con salida 0; no se repitió el build en esta etapa de documentación.

**Especificación UX/UI V2:** [`docs/mediflow-frontend-ai-spec.md`](../../docs/mediflow-frontend-ai-spec.md), secciones 15–16, incorpora el menú, revisión modal y alcance ampliado acordados, con un [mock JSON fiel al backend](../../docs/examples/frontend-review/historial.json). Preserva las cuatro referencias Canva, adaptaciones al contrato y equivalencias Tailwind propuestas; se usaron Shape/Operate de Impeccable. Es documentación y datos de ejemplo, no una interfaz ni guardado ampliado ya implementados.
