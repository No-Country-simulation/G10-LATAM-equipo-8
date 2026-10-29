---
name: mediflow-gitflow
description: Gestionar ramas, integración y publicación de MediFlow con Gitflow simplificado sin PRs. Usar al crear, renombrar, fusionar, publicar o eliminar ramas; la preparación de commits se trata por separado.
---

# Gitflow de MediFlow

Aplicar `AGENTS.md`. Este procedimiento no autoriza por sí solo mutaciones.

## Comprobar el estado

Leer rama actual, cambios locales, upstream y remoto antes de operar. No sobrescribir
trabajo ajeno, descartar cambios ni hacer stash automáticamente para facilitar una operación.
Las ramas existentes de colegas `feat/...` se conservan; no renombrarlas para imponer la convención.

## Ramas de trabajo

Proponer `feature/<area>-<tarea>` y base `develop`. Para continuar una entrega no integrada,
puede convenir partir de su rama: explicar la dependencia y obtener aceptación de esa base.
Crear o renombrar solo con nombre y base aceptados; una solicitud explícita ya los autoriza.
No crear worktrees por rutina. Si se necesitan, respetar la ubicación e índice de CodeGraph.

## Integración sin PRs

No crear PRs, borradores, solicitudes de revisión o automatizaciones que los abran.
Antes de cada merge, informar origen, destino, cambios, verificaciones y conflictos posibles,
y pedir autorización concreta. Si el usuario ya aprobó ese merge específico y no cambió
su alcance, ejecutar sin pedir el mismo permiso nuevamente.

Actualizar referencias cuando proceda y verificar que no haya trabajo local que se
perdería. Preferir merges que conserven los commits de los colegas; usar `--no-ff`
cuando aporte un límite visible de integración. No hacer squash ni rebase de ramas
compartidas sin autorización específica. Un conflicto exige revisión de su significado,
no seleccionar una versión completa solo para que Git termine.

Probar la integración antes de publicarla. No fusionar a `main` una demo como si fuera
una entrega con IA, persistencia y despacho reales. Registrar las limitaciones.

## Publicación y conservación

Un commit local no autoriza push. Con solicitud de publicación, comprobar remoto y rama;
usar el destino aceptado, configurar upstream si falta y verificar sincronización.
No hacer force-push ni publicar todas las ramas. Si hay rechazo, evaluar su causa y
resolverlo sin reescribir el trabajo remoto ni eludir revisiones de aprobación.

Conservar las ramas por defecto, incluso después del merge. Para una eliminación solicitada,
identificar si es local o remota, comprobar trabajo pendiente y obtener autorización
específica; no usar borrado forzado para evitar analizar commits no integrados.

## Cierre

Informar rama, commits/publicación efectuados, estado pendiente y verificaciones.
No afirmar que existe un PR ni presentar enlaces de sugerencia de GitHub como PRs creados.
