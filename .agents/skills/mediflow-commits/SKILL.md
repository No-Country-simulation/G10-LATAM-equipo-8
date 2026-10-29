---
name: mediflow-commits
description: Dividir y registrar avances de MediFlow en commits coherentes con Conventional Commits y mensajes en español. Usar al preparar o guardar cambios; no decide merges, ramas ni autorización de push.
---

# Commits de MediFlow

## Unidad de trabajo

Inspeccionar diff y estado antes de preparar archivos. Separar por comportamiento o
responsabilidad, no por número arbitrario de archivos. Un avance puede requerir código,
pruebas y documentación en el mismo commit para ser coherente.

Proponer la división cuando haya varios avances. Evitar commits intermedios que dejen
imports rotos, contratos incompatibles o una app que no arranca. No mezclar cambios
ajenos ni modificar su autoría. Preparar rutas o hunks específicos, no `git add .` por rutina.

## Formato en español

Usar `<tipo>(<ámbito opcional>): <descripción en español>`.

| Tipo | Uso |
|---|---|
| feat | Comportamiento nuevo |
| fix | Corrección de un fallo |
| refactor | Reorganización sin comportamiento nuevo |
| test | Pruebas o fixtures como cambio principal |
| docs | Documentación; usar `docs`, no `doc` |
| chore | Mantenimiento y herramientas |
| build | Dependencias o empaquetado |
| ci | Automatización de verificación existente |

Ejemplos:

- `feat(auditoria): registrar aprobación y rechazo de triajes`
- `fix(auditoria): impedir revisiones de casos ya resueltos`
- `test(api): cubrir conflictos de revisión concurrente`
- `docs(backend): explicar límites de la auditoría en memoria`

Describir el resultado concreto. Usar cuerpo cuando sea necesario explicar motivos,
limitaciones o cambios incompatibles; no afirmar persistencia, clínica validada o despacho
real si el código no los implementa. Para ruptura de contrato, señalarla y describir migración.

## Verificar y registrar

Revisar diff preparado, secretos, archivos del entorno, almacenamiento local y artefactos
accidentales. Excluir credenciales, `.venv/`, `.tools/` y documentos locales; versionar
ejemplos sintéticos y lockfile cuando correspondan. Una búsqueda de patrones no garantiza
por sí sola ausencia de secretos: revisar lo incluido.

Ejecutar pruebas proporcionales al comportamiento cambiado y `git diff --check`.
No repetir pruebas sin cambios o dudas nuevas; no registrar como aprobado un check fallido.
Con autorización para guardar el avance, crear el commit sin ampliar su alcance.
Comprobar estado después y reportar hash, propósito y validación.

No corregir mensajes históricos publicados mediante amend/rebase por estética.
La publicación se rige por la skill Gitflow y la autorización del usuario;
crear commits no concede permiso para merges ni eliminación de ramas.
