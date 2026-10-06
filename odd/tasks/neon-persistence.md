# Persistencia funcional Neon

## Objetivo y alcance autorizado
Persistir documentos, triajes y revisiones en PostgreSQL y originales privados en
Neon development; conservar API, IA simulada y modo memoria. Sin producción, PR,
merge, autenticación clínica ni datos reales.

## Entrega y ruta
Ruta delegada: múltiples adaptadores, migraciones y pruebas requieren un escritor.
Estrategia exception-ok: commits funcionales en feature/backend-foundation, sin PR.
Previsión: aproximadamente 900 líneas autorales; presupuesto orientativo, no límite.
Commits pendientes de verificación independiente del coordinador.

## Tareas
- [x] N1: esquema y repositorio PostgreSQL, transacciones y pruebas observadas.
- [x] N2: almacenamiento S3 privado, reserva recuperable y pruebas de fallos observadas.
- [x] N3: configuración explícita, demo sintética y guía PyCharm verificadas.
- [x] N4: migración development y prueba real persistencia/revisión/concurrencia observadas.

## Aceptación y verificación
RED/GREEN en pruebas deterministas nuevas; pytest, Ruff y diff check.
Integración externa exclusivamente opt-in development: migración aditiva,
subida/descarga/hash, nueva instancia conserva historial, revisión atómica y 409.
No existe transacción compartida S3/Postgres; estados pendientes y fallidos permiten
reconciliación sin borrado. Identidad de revisor declarada, no autenticada.

## Estado recuperable
Exploración completa. CodeGraph no disponible por acceso denegado, lectura puntual.
N1-N3 implementadas; cierre/commits pendiente del coordinador. RED observado:
test_persistence.py falla por módulo postgres ausente. GREEN: 66 pruebas pasan.
Ruff check/format y diff check pasan. Alembic check: sin cambios de schema pendientes.
Neon development confirmado por CLI: br-broad-bread-b4sii0lv, no primary/default.
Migraciones 0001 y 0002 aplicadas; current=0002_original_integrity (head).
Demo real pasó subida/hash de texto y PDF, nueva instancia recupera triaje,
duplicado 409, revisión concurrente 200/409, evento único y confianza 0.2 conservada.
IDs sintéticos conservados: NEON-DEMO-4f2578d27600 y sufijo -PDF.
Primer intento de demo llegó hasta revisión, pero falló al leer lista como dict;
se corrigió assertion y se repitió; no se borraron sus datos.
backend/.env ahora selecciona postgres/neon/development y bucket mediflow-pruebas.
uv sync eliminó pip local; ensurepip restauró 25.0.1. README usa --inexact y --no-sync.
Pruebas normales aisladas de modos cloud mediante fixture autouse.
Revisor declarado, no autenticado; sin OCR real ni despacho ni seguridad clínica.
Espejo Engram creado; actualización completa pendiente. Próximo: verificación final
independiente y revisión nativa del coordinador, luego commits funcionales sin push.

## Checkpoint solicitado — 2026-10-06

Base anterior conservada: `9e9076f` en `feature/backend-foundation`, previa al
incremento Neon. Nuevo punto de retorno: pendiente de commits locales y revisión
del coordinador; todavía no existe un hash nuevo. Sin push, merge ni cambios remotos.
Restaurada exportación de requirements.txt con hashes desde uv.lock; no se edita a mano.
La preparación del checkpoint no aplica migraciones ni repite demos remotas.
Comprobaciones locales: pytest, Ruff y diff check; resultados finales en handoff.

División coherente propuesta:
1. `chore(neon): registrar herramientas y configuracion del entorno de pruebas`:
   .gitignore, neon.ts, package.json/lock, skills oficiales y skills-lock.json.
2. `feat(persistencia): conservar triajes y auditoria en Neon development`:
   adaptadores, migraciones, contratos, configuración, dependencias con hashes,
   tests y ejemplos reproducibles, README y bitácora; tarea con evidencia.

Volver al código anterior no revierte la base de datos ni elimina objetos. No ejecutar
reset destructivo ni downgrade; preservar cambios y usar modo memory/local si se
necesita la demo anterior. Gemini y grafo siguen fuera de este checkpoint.
