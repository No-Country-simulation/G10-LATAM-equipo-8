# Pruebas funcionales de archivos ficticios

Utilice estos tres PDF como entradas sintéticas para recorrer la ingesta, la extracción con Gemini, el almacenamiento del original en OCI y la consulta del resultado. No son datos de personas reales ni evidencia de validación clínica.

## Recorrido rápido

1. Desde `backend/`, inicie la API en el puerto 8002:

   ```powershell
   uv run uvicorn app.main:app --host 127.0.0.1 --port 8002
   ```

2. Confirme `GET http://127.0.0.1:8002/health` y abra Swagger en `http://127.0.0.1:8002/docs`.
3. En `POST /api/v1/triajes/archivo`, cargue un PDF de esta carpeta y complete `documento_id` con un identificador único para esa ejecución y `canal_origen` con `web`. No reutilice el identificador de una carga anterior.
4. La respuesta esperada al aceptar la carga es `201 Created`. Conserve el `documento_id` devuelto y consulte:
   - `GET /api/v1/triajes/{documento_id}` para el detalle y estado de extracción (`SUCCEEDED` o `FAILED`).
   - `GET /api/v1/triajes/{documento_id}/documento` para recuperar el original; con OCI configurado, verifique que el objeto exista allí y que el contenido corresponda al PDF cargado.
5. Para evaluar la durabilidad, reinicie el proceso y consulte nuevamente el detalle y el original. El resultado depende del repositorio configurado: una implementación en memoria no promete conservar datos tras reinicios ni entre procesos.

## Casos incluidos

| Archivo | Qué observar |
|---|---|
| `rutina-001.pdf` | Solicitud administrativa rotulada de rutina. |
| `urgente-001.pdf` | La palabra urgente fue escrita por el remitente ficticio; no es una inferencia clínica. |
| `ambiguo-001.pdf` | Dos etiquetas administrativas contradictorias para revisar. |

## Límites importantes

- Revise por una persona cualquier salida de Gemini antes de tomar decisiones. Gemini es no determinista: no se garantiza una clasificación, un JSON exacto ni una alerta particular para un PDF. Para verificar de forma repetible el grafo de decisiones, utilice las pruebas deterministas del proyecto.
- Para PDF, el adaptador informa `UNVERIFIED_BINARY_EVIDENCE` porque no verifica evidencia para MIME distintos de `text/plain`, aunque el PDF contenga texto extraíble. Ese estado no demuestra que una cita sea falsa; indica que esa verificación de evidencia no se realizó.
- `confidence=1` no equivale a validación clínica, autorización de enrutamiento ni despacho real. Estos documentos y sus identificadores son completamente ficticios.
- OCI y la persistencia dependen de la configuración y del repositorio habilitados en el entorno. No pongas secretos, claves ni credenciales en esta guía ni en datos de prueba.

## Seguridad y alcance

Los PDF son ejemplos administrativos no accionables, marcados como ficticios y no válidos para atención clínica. No uses información real para reproducir estas pruebas. La respuesta de la API y las pruebas funcionales no acreditan seguridad clínica.
