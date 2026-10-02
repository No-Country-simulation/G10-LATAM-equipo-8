# MediFlow: instrucciones del proyecto

## Trabajo y seguridad humana

- Proponer objetivo, alcance, contrato y criterios de aceptación antes de implementar
  una nueva funcionalidad. Una vez aceptado el alcance, avanzar sin repetir la misma pregunta.
- Priorizar la seguridad humana y la trazabilidad. Usar únicamente datos sintéticos
  para desarrollo y demos. Las pruebas del software no acreditan seguridad clínica.
- Distinguir capacidades reales de simulación y decisiones aprobadas de propuestas.
  No convertir pesos del score, umbrales o reglas clínicas propuestas en requisitos aceptados.
- Una aprobación humana no aumenta artificialmente el score ni prueba despacho real.
  Separar alerta urgente, revisión y autorización de enrutamiento.
- Mantener estado, decisiones pendientes y evidencias en
  `docs/BACKEND_PRIMERA_ETAPA.md`. Consultar `docs/mediflow-agente-autonomo.md`
  para requisitos del reto y `docs/PLAN_FINAL.md` para el plan; señalar discrepancias.

## Arquitectura y verificación

- Monolito modular hexagonal: dominio sin FastAPI, SQLAlchemy ni SDKs; aplicación
  con casos de uso y puertos; adaptadores para HTTP, IA, repositorio y documentos;
  infraestructura para configuración e inyección de dependencias.
- Mantener IA y persistencia detrás de puertos. Una demo en memoria no equivale a
  persistencia ni a concurrencia entre procesos; documentar reinicios y límites.
- Backend con Python 3.12.14. Dependencias: `backend/pyproject.toml` y `backend/uv.lock`;
  `backend/requirements.txt` es una exportación, no una segunda lista independiente.
- Desde `backend/`: `uv run --locked pytest -q`, `uv run --locked ruff check app tests`
  y `uv run --locked ruff format --check app tests`, según el cambio.
  Con el entorno existente también pueden usarse sus ejecutables de `.venv/Scripts/`.
- Probar comportamiento, errores y transiciones relevantes; informar qué se verificó
  y qué sigue pendiente. No instalar ni configurar proveedores externos sin alcance acordado.

## Git y skills del repositorio

- Flujo: `feature/...` desde `develop`; integración directa a `develop` y después
  entregas probadas a `main`. No crear PRs ni usar automatismos que los creen.
- Antes de cada merge, obtener autorización para la pareja origen/destino y operación.
  Un permiso para commit o push no autoriza merges. No eliminar ramas automáticamente.
- Acordar nombre y base antes de crear o renombrar una rama; respetar una solicitud
  explícita ya dada. Publicar únicamente la rama y remoto autorizados.
- Separar commits por avance coherente y funcional, con mensajes en español;
  no reescribir el historial publicado sin autorización específica.
- Para manejo de ramas, leer `.agents/skills/mediflow-gitflow/SKILL.md`.
- Para planificar, preparar o crear commits, leer
  `.agents/skills/mediflow-commits/SKILL.md`.
- Las skills describen procedimientos; no conceden autorización para acciones externas.

<!-- gentle-ai:codegraph-guidance -->
## CodeGraph

Para preguntas estructurales, arquitectura, flujo, dependencias, referencias e impacto,
usar CodeGraph antes de exploraciones amplias de archivos.

1. Resolver raíz con `git rev-parse --show-toplevel` (o directorio actual si no hay Git)
   y confirmar que es un proyecto real.
2. Comprobar `.codegraph/` antes de búsquedas amplias. Si falta y CodeGraph está disponible,
   inicializar una vez con `gentle-ai codegraph init --cwd <raíz>`, salvo una instrucción
   del usuario que prohíba modificaciones. No inicializar en HOME ni carpetas temporales.
3. Preferir `codegraph_explore` MCP. Si no existe, usar la CLI upstream:
   `status`, `query`, `explore`, `node`, `files`, `callers`, `callees`, `impact`, `affected`.
   No usar `gentle-ai codegraph` como proxy de consultas.
4. Si inicialización o consulta falla, explicar brevemente el fallback a herramientas
   normales. La ausencia del índice por sí sola no justifica omitir la inicialización.
5. Tras editar, preferir auto-sync del watcher. Ejecutar `codegraph sync` solo si el
   watcher está desactivado o las entradas obsoletas no se actualizan normalmente.
6. No ejecutar ni recomendar `uninit`, `install`, `uninstall` o `upgrade` de CodeGraph.
   Reservar `codegraph index` para recuperación explícita de corrupción.

Los worktrees que necesiten CodeGraph van bajo el directorio personal, preferentemente
`<repo-parent>/<repo-name>-worktrees/<nombre>`, nunca en `/tmp`, `/var/tmp` o `/tmp/opencode`.
Cada checkout necesita su propio índice; no copiar, enlazar ni reutilizar el de otro.
<!-- /gentle-ai:codegraph-guidance -->
