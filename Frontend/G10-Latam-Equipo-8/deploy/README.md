# Preparación local y despliegue futuro de MediFlow

Esta carpeta prepara una imagen estática del frontend con Caddy como proxy y borde HTTPS automático, y una imagen Python para la API. **No se instalaron contenedores, no se desplegó nada en OCI y no se emitieron certificados.** Caddy reemplaza la propuesta histórica de Nginx para esta preparación local; el README del backend de referencia queda intacto.

## Contexto del ejemplo sintético

El frontend importa el fixture canónico `docs/examples/frontend-review/historial.json`, situado en la raíz del repositorio, fuera de `Frontend/G10-Latam-Equipo-8`. Compose lo entrega al build mediante el contexto adicional `reviewfixtures`; su `.dockerignore` solo permite ese JSON. Se copia al compilador, sin modificar el fixture ni los imports del MVP y sin ampliar el contexto principal a todo el repositorio.

Una transferencia debe conservar tanto `docs/examples/frontend-review/{.dockerignore,historial.json}` como `Frontend/G10-Latam-Equipo-8/`. No basta con exportar únicamente la carpeta del frontend. Ejecuta Compose desde esta última; el contexto del backend continúa bajo `backend-oci-storage-current-reference.local/backend`.

## Comprobación local simulada

Se necesita Docker Engine y un plugin Compose con soporte para `additional_contexts`; no están disponibles en el entorno local donde se prepararon estos archivos. Desde esta carpeta de frontend:

```bash
BACKEND_CONFIG_FILE=./deploy/backend.local.conf docker compose config --quiet
BACKEND_CONFIG_FILE=./deploy/backend.local.conf docker compose up --build
```

La interfaz local queda en `http://127.0.0.1:8080`. El host publica por defecto solo en loopback y Caddy usa `:80`, por lo que esta ruta no emite ni comprueba HTTPS. La compilación inyecta explícitamente `VITE_API_URL=/api/v1`; las llamadas van al backend simulado por DNS interno `backend:8002`, no al mock de frontend ni a `localhost` del contenedor. No se deben copiar datos clínicos: usar únicamente demos sintéticas.

`config --quiet` valida la configuración sin imprimir sus valores. No usar `docker compose config` sin `--quiet` al configurar secretos: Compose puede mostrar el entorno resuelto.

## Fuente del backend fijada

La imagen usa los archivos de la aplicación sin modificar el checkout ni copiar su `.git`, secretos o entorno virtual. El contexto esperado es `backend-oci-storage-current-reference.local/backend`. Desde esta carpeta de frontend, solo si el clon todavía no existe:

```bash
git clone --single-branch --branch feature/backend-oci-storage --no-tags https://github.com/No-Country-simulation/G10-LATAM-equipo-8.git backend-oci-storage-current-reference.local
git -C backend-oci-storage-current-reference.local checkout --detach 9220f500a223436ef045c4bdec4e99ad171cc81f
test "$(git -C backend-oci-storage-current-reference.local rev-parse HEAD)" = 9220f500a223436ef045c4bdec4e99ad171cc81f
```

La URL está verificada contra el remoto del clon existente. Si ya existe, no lo sobrescribas ni descartes cambios: verifica el `HEAD` exacto y que el checkout esté limpio antes de compilar. Dockerfile y reglas de contexto están bajo `deploy/`, fuera de ese checkout inmutable.

## Preparación futura en OCI — solo el propietario

1. Instalar y verificar Docker Engine y Compose v2 para ARM64 mediante el procedimiento oficial de la distribución de la instancia. Esa instalación no se hizo aquí.
2. Mantener `mediflow-grupo8.duckdns.org` apuntando a la instancia y permitir TCP 80/443 en la red de OCI y en el host. Estas operaciones de DNS, firewall y red quedan pendientes del propietario.
3. Crear fuera del repositorio `/etc/mediflow/backend.runtime.conf`, con permisos restrictivos (por ejemplo `chmod 600`). Completar los valores localmente; **nunca** pegarlos en chat, Git, variables `VITE_`, argumentos de build ni capturas de configuración. Para el modo elegido, el archivo de runtime requiere `AI_MODE=gemini`, `GEMINI_API_KEY`, un `GEMINI_MODEL=gemini-3.5-flash-lite` (o el modelo que el propietario verifique en su cuenta), `GEMINI_TIMEOUT_SECONDS=60`, `GEMINI_MAX_RETRIES=0`, `REPOSITORY_MODE=memory`, `STORAGE_MODE=oci`, `OCI_NAMESPACE`, `OCI_REGION`, `OCI_BUCKET`, `OCI_ACCESS_KEY_ID` y `OCI_SECRET_ACCESS_KEY`. `STORAGE_DIR=/var/lib/mediflow` apunta al volumen escribible del backend. La preparación no verifica cuotas ni garantiza que el nivel gratuito aplique.
4. Desde el frontend, exportar los ajustes públicos de escucha y el archivo seguro, sin mostrar su contenido:

   ```bash
   export BACKEND_CONFIG_FILE=/etc/mediflow/backend.runtime.conf
   export SITE_ADDRESS=mediflow-grupo8.duckdns.org
   export WEB_BIND_ADDRESS=0.0.0.0
   export WEB_HTTP_PORT=80
   export WEB_HTTPS_PORT=443
   docker compose config --quiet
   docker compose up -d --build
   ```

   Con dominio y puertos públicos disponibles, Caddy solicitará y renovará certificados automáticamente y los conservará en los volúmenes `caddy-data` y `caddy-config`. La emisión, HTTPS real, ARM, Compose y el proxy no se validaron en este entorno.

## Ciclo de vida y límites

- `docker compose logs --tail=100` permite revisar el servicio sin volcar la configuración del entorno. No publicar registros sin revisarlos.
- Detener con `docker compose down`; no añadir `-v`, porque elimina los volúmenes persistentes.
- Antes de reemplazar una versión ya probada, guardar localmente sus etiquetas y desplegar después con `docker compose up -d --build`:

  ```bash
  docker image tag mediflow/frontend:local mediflow/frontend:rollback
  docker image tag mediflow/backend:local mediflow/backend:rollback
  ```

  Para volver a esas imágenes con el mismo archivo Compose y configuración: `IMAGE_TAG=rollback docker compose up -d`. Una reversión de cambios en Compose también requiere restaurar la revisión de código correspondiente; este procedimiento no se ha ensayado.
- El historial de triages y revisiones continúa en memoria con un solo worker: reiniciar o actualizar el backend lo pierde. Los originales en OCI permanecen allí. El almacenamiento local del ejemplo simulado usa un volumen separado.
- El servicio es anónimo y público, sin contraseña. Limitar la demostración a datos sintéticos; no es una aplicación clínica segura. No se añadieron autenticación, PostgreSQL/Neon, n8n, colas, SSE ni límite de gasto.

Las pruebas Node y la lectura estructural de YAML solo comprueban contratos de archivos. Docker, imágenes, ejecución ARM, `caddy validate`, Compose, certificados HTTPS, tráfico real, OCI y navegador siguen sin prueba de runtime. No se requiere un registro de imágenes para preparar este trabajo; el build ARM nativo o con Buildx queda para una máquina autorizada.
