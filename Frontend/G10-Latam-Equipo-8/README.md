# MediFlow - Frontend (Panel de Administración y Triaje Clínico)

> **Hackathon ONE · Grupo 10** | Agente Autónomo para Triaje, Extracción y Enrutamiento de Documentos Clínicos en Oracle Cloud Infrastructure (OCI).

---

## 🏥 Descripción del Proyecto

**MediFlow Frontend** es la interfaz web para la auditoría y visualización del procesamiento automatizado de documentación médica. Proporciona una experiencia fluida, accesible y responsiva para auditores médicos y personal administrativo en flujos de **Human-in-the-Loop (HITL)**, permitiendo supervisar las clasificaciones generadas por agentes de inteligencia artificial y gestionar casos críticos o ambiguos antes de su enrutamiento final.

---

## 🚀 Características Principales

* **Diseño 100% Responsivo y Adaptativo (Desktop & Mobile):**
  * **Desktop:** Tabla tabular de alta densidad con desplazamiento vertical confinado para análisis rápido de casos clínicos.
  * **Mobile:** Vista adaptativa de tarjetas independientes (*cards*) apiladas ergonómicamente con acciones inmediatas al alcance del pulgar.
* **Navegación Móvil Integrada:** Encabezado con drawer lateral deslizante (*Sheet*) que contiene el menú completo de navegación sin ocupar espacio en pantalla.
* **Ingesta de Documentos Clínicos:** Zona interactiva de arrastre y soltado (*dropzone*) preparada para recibir archivos clínicos en formatos PDF e imágenes.
* **Cola de Revisión de Casos Críticos (HITL):** Módulo central de auditoría humana con acciones rápidas de **Aprobar** y **Rechazar**.
* **Métricas Clave:** Indicadores superiores de volumen total de documentos procesados y alertas críticas pendientes de resolución.

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

### UX/UI V2: especificación y límites

La base confirmada evoluciona con cuatro destinos de menú, carga visible, filtros y revisión en modal alineada al JSON. La edición ampliada de datos extraídos es un objetivo pendiente de soporte backend: hoy solo pueden persistirse nombre, edad, tipo y prioridad. Se omiten borradores y reprocesamiento hasta tener soporte. La [especificación](../../docs/mediflow-frontend-ai-spec.md), secciones 15–16, conserva Canva, shadcn/ui y valores documentados de Tailwind; la migración completa a ReIcon sigue pendiente. El [mock de datos](../../docs/examples/frontend-review/README.md) copia el historial de ejemplo del backend sin conectarlo a la aplicación. No se implementaron estas pantallas ni se hizo una comprobación visual en navegador.

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
