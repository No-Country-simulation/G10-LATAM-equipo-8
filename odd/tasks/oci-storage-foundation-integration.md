# Integrar OCI Object Storage sobre backend foundation

## Objetivo

Rescatar el adaptador OCI de `origin/feature/backend-oci-storage` sobre la versión
actual de MediFlow, preservando la persistencia y el outbox ya incorporados. Validar
el almacenamiento y la recuperación de documentos solo con pruebas sintéticas; no
afirmar una prueba real de OCI sin credenciales y autorización separadas.

## Problema y motivo

El backend actual conserva el almacenamiento detrás de un puerto, pero no incluye
OCI Object Storage. El plan de Alura lo clasifica como requisito obligatorio, mientras
que Slack es una mejora adicional. La rama OCI se creó sobre una versión anterior y
no debe reemplazar el estado actual: se deben conservar el outbox y la migración 0004.

La suite inicial terminó con 190 pruebas aprobadas y tres fallidas: las expectativas de
pruebas de urgencia todavía esperaban despacho automático, contrario a la regla vigente
de mantener la urgencia bajo revisión humana hasta aprobación explícita. Las expectativas
se corrigieron en OCI-T0 y la suite completa quedó verde.

## Alcance

- Alinear las expectativas de pruebas sintéticas de urgencia con el comportamiento
  documentado: `NEEDS_AUDIT`, alerta urgente y sin despacho automático.
- Integrar el estado actual de `feature/backend-foundation` en la rama existente
  `feature/backend-oci-storage`, sin PR y preservando ambas historias.
- Incorporar el adaptador OCI y su configuración, inyección, contrato de respuesta,
  pruebas y documentación a la base actual.
- Evitar que la descarga sirva bytes desde un proveedor o bucket distinto del que
  figura en el registro del documento. Si no se puede resolver el proveedor registrado,
  fallar de forma segura y documentar que cambiar de proveedor no migra objetos.
- Ejecutar validación completa de tests y Ruff en el entorno disponible.

## Fuera de alcance y restricciones

- No realizar push, PR, merge a `develop`/`main` ni eliminar ramas.
- No consultar ni modificar buckets reales; solo pruebas sintéticas locales/mock.
- No cambiar rutas clínicas, scores, umbrales ni reglas de decisión.
- No hacer migración de objetos ni prometer soporte de dataset mixto entre proveedores.
- Preservar `0004_notification_outbox` y el esquema actual de Neon development.
- No incluir secretos en repositorio, salida de pruebas ni documentación.

## Tareas y aceptación

- [x] OCI-T0: Corregir expectativas obsoletas de pruebas de urgencia. La prueba de
  urgencia debe exigir revisión humana, conservar la alerta y no autorizar el destino
  final; el total de la cola debe reflejar todos los casos que requieren auditoría.
  Evidencia: commit `c85b3b2`; suite completa 193 passed y Ruff check/format aprobados.
- [ ] OCI-T1: Integrar `feature/backend-foundation` en la rama de trabajo existente
  `feature/backend-oci-storage`; confirmar que quedan presentes todos los commits locales
  posteriores al remoto y la migración 0004. Resolver cualquier conflicto por significado.
- [ ] OCI-T2: Integrar adaptador OCI compatible con S3, validar configuración explícita,
  inyectarlo detrás del puerto existente y exponer `oci` en el contrato HTTP.
- [ ] OCI-T3: Impedir lecturas cruzadas entre proveedores/buckets y cubrir la descarga
  correcta y el rechazo seguro cuando el proveedor registrado no está disponible.
- [ ] OCI-T4: Documentar variables y procedimiento con credenciales fuera del repositorio,
  límites del modo memoria y estado real de verificación OCI.
- [ ] OCI-T5: Ejecutar suite completa, Ruff check/format y revisión de estado/diff; registrar
  resultados y los commits de cada unidad. Push continúa pendiente de permiso expreso.

## Criterios generales de aceptación

- El comportamiento urgente permanece en `NEEDS_AUDIT`; una señal no equivale a despacho.
- El backend usa un adaptador OCI solo cuando está configurado; los fallos de proveedor
  no filtran secretos ni cambian el resultado de triaje.
- Descargas nunca entregan silenciosamente contenido de un proveedor/bucket equivocado.
- Las pruebas no contactan servicios reales ni contienen datos de pacientes reales.
- La suite completa y Ruff terminan correctamente; cualquier limitación se informa sin
  dar por satisfecha la verificación.

## Ruta, base y entrega

- Ruta: implementación delegada para el cambio multiarquivo; corrección test-only acotada
  mediante edición directa después de confirmar el contrato existente.
- Base inicial verificada: `feature/backend-foundation` en `929b2c0`; la integración debe
  conservar todos los commits locales posteriores a `origin/feature/backend-foundation`.
- Rama OCI recibida: `origin/feature/backend-oci-storage` en `429ba49`.
- Integración autorizada por el usuario: `feature/backend-foundation` →
  `feature/backend-oci-storage`, local y sin PR. No hay autorización de push.
- Pronóstico inicial: aproximadamente 350–450 líneas modificadas, incluidas pruebas y
  documentación; reevaluar antes de superar el presupuesto de entrega.
- RDD: desactivado en el clon; no iniciar revisión nativa.

## Evidencia y próximo paso

- Antes del ajuste, baseline: 190 passed y 3 failed. Las fallas eran expectativas de
  despacho automático ante urgencia, contrarias al dominio y plan vigente.
- OCI-T0 completado: expectativas actualizadas sin cambiar lógica de aplicación;
  suite completa 193 passed; Ruff check y format aprobados.
- OCI-T0 quedó registrado en `c85b3b2`; no se modificó la lógica de aplicación.
- Próximo paso: crear el seguimiento local de la rama OCI existente e integrar la base
  actual autorizada, conservando el remoto sin publicar cambios.
