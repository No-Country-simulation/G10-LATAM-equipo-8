# Mock de datos para revisión modal

Dataset sintético del backend, copiado sin cambiar su contrato. Sirve para especificar campos y estados de UI; no es una modal implementada ni una simulación de guardado ampliado.

## Fuente

`/home/frondus/Escritorio/workspace/MediFlow - NoCountry/G10-LATAM-equipo-8-backend-foundation-reference/docs/examples/frontend/historial.json`

[historial.json](historial.json) conserva el sobre `items/total/offset/limit` y todos sus valores. Gemini, modelo y Neon son metadatos del ejemplo: no se realizan conexiones ni llamadas de proveedor.

## Escenarios

| ID | Estado | Qué permite comprobar conceptualmente |
| --- | --- | --- |
| FRONTEND-REVISION-001 | NEEDS_AUDIT / SUCCEEDED | Nombre y edad conocidos, datos opcionales null y motivos de auditoría. Null no implica automáticamente ilegible. |
| FRONTEND-FALLO-001 | NEEDS_AUDIT / FAILED | Error GEMINI_TIMEOUT y ausencia de extracción; no aprobar un formulario vacío. |

La muestra completa tiene 2 documentos, 2 pendientes y 0 alertas urgentes. No aporta un ejemplo positivo de alerta. Derivar estas cantidades del dataset; no fijarlas como contadores de la aplicación.

## Uso en la especificación

1. Leer el sobre y proyectar cada registro en tabla/tarjeta sin agregar propiedades al DTO.
2. Abrir conceptualmente el caso en modal y agrupar los campos según el contrato, con original recibido y propuesta de corrección separados.
3. Distinguir los cuatro campos corregibles actuales del objetivo ampliado pendiente de backend. Un cambio local de ejemplo no es persistencia.
4. Mantener estados, IDs, auditoría y procedencia en solo lectura. Revisor/comentario/destino pertenecen a la decisión, no a los datos extraídos.
5. Respetar los null y no inferir número de campos ilegibles desde audit_reasons.

No hay PDF/imagen adjuntos: ruta_objeto no es una URL y los IDs de ejemplo no se insertaron en el backend local. No fabricar un original ni realizar solicitudes de revisión contra esos IDs para aparentar una prueba de integración.

Ver las secciones 15–16 de la [especificación canónica](../../mediflow-frontend-ai-spec.md). No se modificaron servicios, mocks activos de la aplicación, DTOs, backend o dependencias.
