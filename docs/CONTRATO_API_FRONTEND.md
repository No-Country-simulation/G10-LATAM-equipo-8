# Contrato HTTP para integrar el frontend

Snapshot **9f6df98**, 2026-10-08. Este documento describe el backend actual; no agrega
endpoints, permisos, reglas clínicas ni campos. El frontend consume **HTTP**, no tablas
PostgreSQL, rutas del bucket o JSON crudo de Gemini.

## Ruta rápida

1. Levantar el backend según [README](../backend/README.md), puerto **8002**.
2. Consultar [Swagger](http://127.0.0.1:8002/docs) y
   [OpenAPI](http://127.0.0.1:8002/openapi.json): fuente del contrato en ejecución.
3. Construir carga, historial, detalle/visor y revisión con los DTO descritos abajo.
4. Probar la interfaz con los [ejemplos sintéticos](examples/frontend/), sin datos reales.

Los ejemplos son **mocks de contrato**, no llamadas Gemini ni registros existentes en
Neon. Sus claves/IDs no corresponden a originales descargables; no se debe asumir que
consultarlos en una instancia real devolverá 200. La ruta del objeto no es una URL.

## Endpoints vigentes

Base: `http://127.0.0.1:8002`. No agregar otro `/api` al prefijo siguiente.

| Método y ruta | Entrada | Respuesta satisfactoria |
|---|---|---|
| GET `/health` | Sin cuerpo | 200, configuración de adaptadores; no prueba conectividad. |
| POST `/api/v1/triajes` | JSON `TextRequest` | 201 `TriageResponse`. |
| POST `/api/v1/triajes/process-text` | Alias del anterior | 201 `TriageResponse`. |
| POST `/api/v1/triajes/archivo` | `multipart/form-data` | 201 `TriageResponse`. |
| POST `/api/v1/triajes/process-file` | Alias del anterior | 201 `TriageResponse`. |
| GET `/api/v1/triajes` | Query opcional | 200 `HistoryResponse`. |
| GET `/api/v1/audit/queue` | `offset`, `limit` | 200 historial filtrado a NEEDS_AUDIT. |
| GET `/api/v1/triajes/{documento_id}` | ID público | 200 `TriageResponse`. |
| GET `/api/v1/triajes/{documento_id}/documento` | ID público | 200 bytes originales y MIME; no JSON. |
| POST `/api/v1/triajes/{documento_id}/revision` | JSON `ReviewRequest` | 200 triaje actualizado. |
| GET `/api/v1/triajes/{documento_id}/revisiones` | ID público | 200 array de `ReviewEventResponse`. |

No existen actualmente `/reglas`, reprocesamiento, usuarios/login, websocket, envío a
destinos ni descarga mediante URL firmada en el DTO. No inventar botones para ellos.

### Carga de texto y archivo

`TextRequest`: `documento_id` (1..100 caracteres, `[A-Za-z0-9_-]`), `canal_origen`
(texto no vacío, máximo 100), `documento_texto` (1..100000 caracteres con contenido).
`tipo_archivo` opcional: `TEXTO` por defecto, `JSON`, `PDF` o `IMAGEN`; es metadata de
compatibilidad: este endpoint **siempre recibe texto**, no interpreta un PDF/base64.
Ejemplo: [solicitud_texto.json](examples/frontend/solicitud_texto.json).

Para archivo, `FormData` con exactamente `documento_id`, `canal_origen`, `archivo`:

```javascript
const body = new FormData();
body.append("documento_id", documentId);
body.append("canal_origen", "web");
body.append("archivo", file);
const response = await fetch(`${baseUrl}/api/v1/triajes/archivo`, { method: "POST", body });
```

No fijar manualmente `Content-Type`: el navegador agrega el boundary. Se aceptan
PDF (`application/pdf`), PNG (`image/png`) y JPG/JPEG (`image/jpeg`), máximo 10 MiB
por configuración inicial. La API verifica MIME/firma/tamaño, no antivirus ni parser
documental completo. La API sube y vincula el original; subir manualmente al bucket
no crea un triaje. ID duplicado completo devuelve 409, no actualiza el registro.

### Filtros y paginación

GET historial acepta `status`, `destino`, `offset` (>=0, defecto 0) y `limit`
(1..100, defecto 20). Orden: `created_at` descendente. `total` cuenta resultados
después de filtros y antes del recorte. No hay filtro por fecha/paciente/búsqueda textual.

```text
/api/v1/triajes?status=NEEDS_AUDIT&destino=REVISION_HUMANA&offset=0&limit=20
```

`HistoryResponse`: `items` (array de triajes), `total`, `offset`, `limit` (enteros).
Página vacía es válida. Ejemplo: [historial.json](examples/frontend/historial.json).

## DTO completo: TriageResponse

JSON incluye campos `null` explícitos. **Null es desconocido/no disponible**, no cero,
cadena vacía ni dato para completar automáticamente. Renderizar strings como texto,
nunca HTML arbitrario. No convertir los valores a diagnóstico o consejo clínico.

### Identidad, estado y procesamiento

| Ruta JSON | Tipo | Significado |
|---|---|---|
| `documento_id` | string | ID público; usarlo en rutas, no `ruta_objeto`. |
| `status` | enum | Estado de revisión/decisión, separado del procesamiento. |
| `canal_origen` | string | Canal declarado de ingreso. |
| `created_at` | string fecha-hora | Fecha UTC ISO 8601; no `updated_at` expuesto. |
| `processing_status` | enum | PENDING, PROCESSING, SUCCEEDED o FAILED. |
| `processing_error` | string/null | Código técnico seguro, no excepción cruda. |
| `modo_ia` | enum | `simulado`, `gemini`, `desconocido`. |
| `confianza_tipo` | enum | `fixture`, `autodeclarada_modelo`, `desconocida`. |
| `audit_reasons` | string[] | Motivos; mostrar códigos desconocidos sin romper la UI. |

201 significa **documento conservado y resultado registrado**: puede contener
`processing_status=FAILED`, `status=NEEDS_AUDIT` y error Gemini. No mostrarlo como
análisis clínico exitoso. FAILED con proveedor Gemini conserva `confianza_tipo=
autodeclarada_modelo` incluso si score es null: el indicador depende del proveedor.

### Clasificación y datos extraídos

| Ruta JSON | Tipo/nullabilidad |
|---|---|
| `clasificacion.tipo_documento` | string/null; conjunto soportado o sentinel. |
| `clasificacion.especialidad` | null actualmente, campo reservado. |
| `clasificacion.nivel_prioridad` | `Rutina` / `Urgente` / null. |
| `clasificacion.score_confianza_clasificacion` | number [0,1] / null. |
| `datos_extraidos.paciente.nombre` | string/null. |
| `datos_extraidos.paciente.edad` | integer/null; rango técnico actual 0..130. |
| `datos_extraidos.medico_solicitante` | object/null. Si existe: `nombre` y `matricula` string/null. |
| `datos_extraidos.estudio_realizado` | string/null. |
| `datos_extraidos.indicacion` | string/null. |
| `datos_extraidos.diagnostico_principal` | string/null. |
| `datos_extraidos.cie10_sugerido` | string/null; sugerencia, no código validado. |

Seis tipos: `Informe de Laboratorio`, `Informe de Imagenes`, `Receta Medica`,
`Orden de Procedimiento`, `Epicrisis`, `Certificado Medico`. `No determinado` es
sentinel de simulación; `null` representa ausencia técnica. No usar ninguno de esos
dos últimos como tipo confirmado al aprobar.

Score Gemini es **autodeclarado**, no precisión/calibración ni autorización. En esta
etapa todo resultado real Gemini exige revisión aunque reporte 0.99. Una aprobación
humana **no aumenta** el score ni convierte null en un número.

### Decisión y almacenamiento

| Ruta JSON | Tipo | Interpretación |
|---|---|---|
| `decision_enrutamiento.destino_principal` | enum destino | Decisión registrada, no despacho realizado. |
| `decision_enrutamiento.requiere_auditoria_humana` | boolean | True cuando status es NEEDS_AUDIT. |
| `decision_enrutamiento.justificacion_enrutamiento` | string | Explicación técnica actual. |
| `decision_enrutamiento.alerta_urgente` | boolean | Alerta independiente; no significa autorización/envío. |
| `decision_enrutamiento.notificacion_generada` | null siempre | Ninguna notificación implementada. |
| `almacenamiento.proveedor` | `local` / `neon` | Proveedor del original. |
| `almacenamiento.ruta_objeto` | string | Clave interna, no URL pública ni endpoint frontend. |
| `almacenamiento.status_backup` | `exito` | Original almacenado; no éxito de IA ni segunda copia verificada. |
| `almacenamiento_oci` | null siempre | OCI no implementado. |

Destinos: `HISTORIA_CLINICA`, `EMERGENCIA_MEDICA`, `REVISION_HUMANA`, `FARMACIA`,
`AUDITORIA_AUTORIZACIONES`. No inventar otros ni interpretar sus nombres como envío.

### Proveniencia y evidencia

| Ruta JSON | Tipo/propósito |
|---|---|
| `extraction_schema_version` | integer, actualmente 1 legado / 2 nuevo. |
| `extraction_provenance.provider` | string, p. ej. google-gemini/simulated/unspecified. |
| `extraction_provenance.model` | string/null, modelo configurado; fixture no prueba llamada. |
| `extraction_provenance.prompt_version` | string/null. |
| `extraction_evidence` | array de `{field, page, quote}`. |
| `extraction_evidence[].field` | string interno inglés. |
| `extraction_evidence[].page` | integer >=1 / null; null si página desconocida. |
| `extraction_evidence[].quote` | string/null; afirmación de fuente, no veracidad clínica. |

Mapa de evidencia: `document_type`→tipo_documento, `priority`→nivel_prioridad,
`patient_name`→paciente.nombre, `patient_age`→paciente.edad, `professional_name`→
medico_solicitante.nombre, `professional_registration`→matricula, `study`→estudio_realizado,
`indication`→indicacion, `diagnosis`→diagnostico_principal, `cie10_suggested`→cie10_sugerido.
Para texto hay comprobación literal técnica; PDF/imagen tiene evidencia no verificada.
El frontend no debe pintar una cita como diagnóstico validado ni inventar evidencias.

## Estados y componentes recomendados

| Componente | Comportamiento según contrato vigente |
|---|---|
| Carga | Enviar multipart o texto; bloquear doble envío mientras espera; analizar DTO incluso en 201. |
| Historial | Filtros reales y paginación; no inferir cantidad usando solamente items.length. |
| Detalle | Secciones de datos/evidencia/proveniencia; null visible como «No disponible». |
| Visor | GET documento por ID, Blob con MIME; no pedir credenciales Neon/Gemini al navegador. |
| Estado técnico | Mostrar PENDING/PROCESSING/FAILED por separado del estado humano. |
| Panel de revisión | Acciones solo con NEEDS_AUDIT y procesamiento finalizado (SUCCEEDED o FAILED). |
| Auditoría | Cargar array revisiones; mostrar antes/después y correcciones, no solo fecha. |

`status`: PROCESSED (resultado de fixture sin auditoría, no aprobación clínica),
NEEDS_AUDIT (pendiente), APPROVED (decisión humana registrada), REJECTED (rechazado).
Deshabilitar revisión para PROCESSED/APPROVED/REJECTED y para PENDING/PROCESSING.
El servidor sigue siendo autoridad: UI habilitada no evita un 409 de concurrencia.
Original puede descargarse durante PROCESSING si ya está disponible; no inventar
reprocesamiento/polling de proveedor. Recargar detalle/historial es posible.

## Revisión: solicitudes y restricciones

`ReviewRequest`: `accion` (`aprobar`, `corregir_aprobar`, `rechazar`), `revisor`
(texto no vacío <=100), `comentario` (no vacío <=2000), `destino` opcional/null,
`correcciones` opcional. Identidad de revisor **declarada**, no autenticada.

Solo se corrigen `nombre_paciente`, `edad_paciente`, `tipo_documento`, `nivel_prioridad`.
Omitir campo significa no cambiarlo; **solo edad admite null explícito** para borrar.
Edad es entero estricto, no boolean/string; rango técnico 0..130. Nombre no vacío,
tipo entre seis soportados y prioridad Rutina/Urgente. No corregir score, diagnóstico,
médico, evidencia ni campos arbitrarios: DTO rechaza extras.

| Acción | Botón válido cuando… |
|---|---|
| Aprobar | Paciente con nombre no vacío, tipo confirmado y prioridad conocida; destino final explícito. |
| Corregir y aprobar | Al menos un cambio efectivo permitido, y controles de aprobación cumplidos. |
| Rechazar | Sin destino ni correcciones; revisor y comentario obligatorios. |

Destino de aprobación no puede ser REVISION_HUMANA. Prioridad Urgente exige
EMERGENCIA_MEDICA; alerta urgente permanece independiente. Rechazo conserva alerta
cuando existía. Los controles técnicos no verifican dosis/matrícula/seguridad clínica.

Después de revisar, volver a pedir detalle/revisiones y quitar acciones terminales.
Los motivos/evidencia originales pueden conservarse después de aprobar; no reabrir
un caso por `audit_reasons` únicamente. Usar status y processing_status del servidor.
Solo hay una revisión terminal: segunda revisión devuelve 409; no existe «reabrir».
Caso FAILED puede rechazarse o corregirse/aprobarse al completar campos exigidos;
su `processing_status=FAILED` y error se conservan, aunque `status=APPROVED`.
No ocultar esa trazabilidad ni interpretar aprobación como recuperación de la IA.

### Ejemplos relacionados y auditoría

- [Pendiente](examples/frontend/triaje_revision_pendiente.json) +
  [aprobar](examples/frontend/solicitud_aprobar.json) →
  [aprobado](examples/frontend/triaje_aprobado.json) y
  [revisiones](examples/frontend/revisiones.json), todos para FRONTEND-REVISION-001.
- [Fallo técnico](examples/frontend/triaje_extraccion_fallida.json) +
  [corregir/aprobar](examples/frontend/solicitud_corregir_aprobar.json) o
  [rechazar](examples/frontend/solicitud_rechazar.json): alternativas sobre copias
  independientes del caso FRONTEND-FALLO-001, no aplicar ambas a una revisión terminal.

`ReviewEventResponse[]` NO es `{items: [...]}`. Campos: `review_id`, `document_id`,
`action`, `reviewer`, `comment`, `created_at`, `previous_status`, `new_status`,
`previous_destination`, `new_destination`, `before`, `after`, `corrections`.
Snapshots usan nombres **ingleses**, distintos del DTO principal: `document_type`,
`priority`, `confidence`, `patient_name`, `patient_age`, `audit_reasons`, `schema_version`,
`professional_name`, `professional_registration`, `study`, `indication`, `diagnosis`,
`cie10_suggested`, `evidence`. Los datos opcionales permanecen null y evidence es array.
`corrections[]`: `{field, before, after}`; field interno inglés, valor string/integer/null.
Ejemplo aprobación sin corrección: array corrections vacío y confianza null sin cambio.

## Errores, seguridad y pendientes

| HTTP | Manejo UI |
|---|---|
| 404 | Registro no disponible/no encontrado; no prometer original existente. |
| 409 | ID duplicado o estado/revisión incompatible; recargar antes de volver a actuar. |
| 413 | Archivo demasiado grande; corregir selección. |
| 415 | MIME/firma no soportados; no cambiar extensión para eludir control. |
| 422 | Validación de campos/acción; mostrar mensaje y corregir formulario. |
| 503 | Almacenamiento/original no disponible o integridad fallida; no inventar éxito. |
| 500/red | Error inesperado/interrupción; consultar registro antes de repetir carga/revisión. |

Errores de negocio devuelven `{"detail": "mensaje"}`; validación FastAPI puede
devolver `detail` como array con `loc`, `msg`, `type`. Usar tipo defensivo string/array.
Errores Gemini suelen registrarse dentro de 201/DTO (`processing_error`, `audit_reasons`),
no como 503 automáticamente. Códigos no son umbrales clínicos.

**Todavía no hay auth ni middleware CORS configurados.** Frontend Vite en otro origen
puede ser bloqueado por el navegador; configurar origen/proxy será un cambio separado,
no está resuelto por este documento ni corresponde usar wildcard con datos sensibles.
No exponer esta API como servicio clínico. Downloads sin autorización y revisor declarado
son limitaciones reales, no una política de seguridad aprobada.

Memoria pierde historial al reiniciar y no se comparte entre procesos; PostgreSQL
development persiste registros. `/health` indica adaptadores configurados, no readiness
de Google/Neon. Quedan contratos automatizados frontend/API, CORS/auth, evaluación
clínica, permisos de descarga y pruebas Linux. Ninguna demo acredita seguridad humana.
