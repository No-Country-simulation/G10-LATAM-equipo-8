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
* **Iconografía:** [Lucide React](https://lucide.dev/)
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

> **Nota para pruebas en red local (móviles):**
> Si querés acceder desde un dispositivo móvil en la misma red Wi-Fi, ejecutá:
> ```bash
> npm run dev -- --host
> ```

### 4. Ejecutar el linter
```bash
npm run lint
```
Debe finalizar sin errores (`exit code 0`).
