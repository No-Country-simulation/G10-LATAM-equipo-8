# MediFlow en OCI: estado verificado y ruta hacia `main` + Neon

**El despliegue ARM64 ya funciona con Gemini, historial en memoria y originales en OCI.** El siguiente objetivo es integrar frontend y backend en una única rama Git `main`, desplegar desde un clon completo y persistir el historial en Neon. Ese segundo escenario todavía requiere integración y pruebas: no basta con cambiar las claves.

**Entrega por etapas acordada:** primero publicar el frontend en `feat/dashboard-mvp` y después incorporarlo a `main` sin reemplazar sus archivos existentes. El compañero incorporará el backend cuando esté listo; la configuración Docker integrada se resolverá después en `main`. Hasta completar esas etapas, publicar el frontend no convierte `main` en un stack Docker completo.

Esta guía distingue lo comprobado por el propietario de la propuesta pendiente. No autoriza por sí sola merges, publicaciones, migraciones, borrados ni cambios en la instancia. La demostración sigue siendo pública, sin contraseña y exclusivamente para datos sintéticos.

## 1. Estado actual: no repetir la instalación ni las pruebas completadas

| Componente | Estado observado |
| --- | --- |
| Instancia OCI ARM64 | Docker/Compose instalados; ambas imágenes compiladas y verificadas como `linux/arm64`. |
| Frontend y Caddy | Compilación corregida, configuración Caddy válida y acceso desde teléfono y portátil a `mediflow-grupo8.duckdns.org`. |
| API | Backend privado en `8002`, un worker y proxy conservando `/api/v1`. Solo el frontend publica TCP 80/443. |
| Proveedores activos | `AI_MODE=gemini`, `REPOSITORY_MODE=memory`, `STORAGE_MODE=oci`, confirmados por el propietario. |
| Prueba funcional | Cuatro documentos sintéticos nuevos procesados; cuatro objetos correspondientes en OCI y descarga del original desde MediFlow en el teléfono. |
| Historial y revisiones | Viven en RAM. Reiniciar o reemplazar el backend los pierde; los originales de OCI permanecen. |
| Neon en estos contenedores | **No está verificado ni activado.** Las pruebas anteriores no demuestran persistencia PostgreSQL. |

La instancia ejecuta un paquete exportado, no un checkout Git. La fuente del frontend corregido corresponde a `933364c`; el backend empaquetado está fijado en `9220f500a223436ef045c4bdec4e99ad171cc81f`. La rama del frontend es `feat/dashboard-mvp`; la referencia del backend es `feature/backend-oci-storage`.

El archivo privado `/etc/mediflow/backend.runtime.conf` ya existe: archivo regular, propietario `root`, permisos `0600`, dentro de `/etc/mediflow` con permisos `0700`. No recrearlo, imprimirlo ni ejecutar `source` sobre él. La aceptación funcional procede del propietario; no equivale a una auditoría independiente de cuotas, facturación, modelo exacto o renovación/cadena TLS.

## 2. Qué debe quedar integrado en `main`

Git versiona código y definiciones de despliegue, **no credenciales, bases de datos ni documentos**. Cada servicio tiene una responsabilidad distinta:

| Servicio | Responsabilidad |
| --- | --- |
| Gemini | Extraer información; no sustituye una base de datos. |
| Neon/PostgreSQL | Persistir documentos registrados, triages, revisiones y auditoría del backend. |
| OCI Object Storage | Conservar los bytes de los originales; Neon mantiene las referencias necesarias para recuperarlos. |
| Caddy | Servir el frontend y enviar `/api/v1` al backend por la red privada de Compose. |

`compose.yaml` construye el backend desde el código canónico versionado en `backend/`, relativo a la raíz del repositorio (`context: ../../backend`). Usa `Frontend/G10-Latam-Equipo-8/deploy/backend.Dockerfile`, cuya ruta se resuelve relativa a ese contexto. Su archivo `backend.Dockerfile.dockerignore` permanece junto al Dockerfile y define las exclusiones específicas de ese build.

### Rutas de build integradas

El frontend y su Compose permanecen donde están. El código fuente del backend tiene una única ubicación canónica; el Dockerfile de despliegue se conserva en `deploy/`:

```text
backend/
  app/
  pyproject.toml
  uv.lock
  alembic.ini
  migrations/
Frontend/G10-Latam-Equipo-8/deploy/
  backend.Dockerfile
  backend.Dockerfile.dockerignore
  compose.yaml
  deploy/frontend.Dockerfile
  deploy/Caddyfile
docs/examples/frontend-review/
  .dockerignore
  historial.json
```

`deploy/backend.Dockerfile` y `deploy/backend.Dockerfile.dockerignore` son archivos de infraestructura del backend, aunque no modifican la lógica de la API. Se conservan en `Frontend/G10-Latam-Equipo-8/deploy/`; no hace falta copiarlos a `backend/` porque Compose apunta al Dockerfile desde el contexto canónico.

El bloque de build del backend usa estas rutas:

```yaml
build:
  context: ../../backend
  dockerfile: ../Frontend/G10-Latam-Equipo-8/deploy/backend.Dockerfile
```

Conservar el contexto adicional `reviewfixtures: ../../docs/examples/frontend-review`. Su `.dockerignore` solo permite `historial.json`; el compilador necesita ese fixture canónico sin alterar sus bytes, el import del MVP ni ampliar el contexto a todo el repositorio. Mantener también `VITE_API_URL=/api/v1`, el proxy con prefijo intacto y el backend sin puerto público. Con este mismo origen, no hace falta agregar un origen CORS público para conectar frontend y API.

### Reparto de la integración

| Responsable | Entrega antes de integrar en `main` |
| --- | --- |
| Backend | Publicar su fuente acordada en `feature/backend-oci-storage` e incorporarla a `main` después de la entrega del frontend, cuando esté lista. Revisar Dockerfile, exclusiones, archivos privados de Neon, permisos del usuario `10001` y migraciones. El CORS de `eb9afb4` ya está incluido en `9220f50`; no duplicarlo. |
| Frontend/despliegue | Mantener Caddy, el contexto del fixture y el Compose integrado; el build del backend usa el contexto canónico `../../backend` y el Dockerfile conservado en `deploy/`. |
| Integración del equipo | Verificar el clon completo y confirmar por separado los requisitos de configuración privada y la tarea de migración antes de desplegar; no copiar árboles a ciegas ni forzar el push. |

El contexto de build, el Dockerfile y su archivo de exclusiones quedan separados intencionalmente; verificar esas rutas en el clon completo antes de desplegar. Esto no cambia ninguna rama remota ni resuelve por sí solo la configuración de Neon.

## 3. Neon: requisitos reales del backend actual

### Git `main` no es Neon `main`

El backend inspeccionado solo autoriza una rama de base de datos llamada `development`. Un despliegue desde Git `main` puede usar esa rama de Neon: sus datos sobreviven a reinicios del contenedor y a la suspensión del compute. **Eliminar o restablecer esa rama sí puede perder los datos.** Reservar el entorno elegido para la demo; no compartirlo con pruebas que lo reinicien destructivamente.

No usar Neon `main`/`production` falsificando metadatos o quitando la protección. Admitir otra rama de base de datos requiere un cambio explícito y probado del contrato del backend. Desplegar desde Git `main` tampoco convierte esta demo anónima en un sistema clínico seguro.

### No alcanza con `REPOSITORY_MODE=postgres` y una URL

La configuración privada del backend debe verificarse contra el código que se despliegue. El Compose actual recibe `BACKEND_CONFIG_FILE` como ruta de `env_file`: Compose lee ese archivo e inyecta sus variables al contenedor; no lo monta como archivo. Esta configuración no declara montajes para `.neon` ni `.env.local`, y esta guía no establece que sean necesarios en runtime.

No inferir que `env_file` satisface requisitos de archivos privados ni añadir montajes basándose solo en el nombre de una ruta. Antes del despliegue, confirmar con la versión exacta del backend si requiere archivos privados adicionales y cómo deben suministrarse, sin imprimir sus valores ni incorporarlos al checkout o a la imagen.

### Preparar el esquema es un paso separado

El arranque de la API **no ejecuta las migraciones**. La línea de migraciones inspeccionada llega a `0004`; no se consultó el estado real de la base de datos destino. Hay que revisar el destino y ejecutar la tarea acordada de Alembic (`alembic upgrade head`) antes de servir con PostgreSQL.

La imagen actual solo copia `app/`: no incluye `alembic.ini` ni `migrations/`. El responsable del backend debe entregar un migrador ejecutable y probado, con esos archivos y sus exclusiones coordinadas, sin copiar secretos ni todo el repositorio. Definir y verificar permisos del rol de migración y del rol de la API; no asumir que el mismo rol debe tener permisos DDL en ambos servicios.

Para la API se prevé `DATABASE_URL`; las migraciones aceptan `DATABASE_URL_DIRECT` o su alias `DATABASE_URL_UNPOOLED` y requieren una conexión sin `-pooler`. Las URLs son secretos: obtenerlas para la rama y rol elegidos, conservando TLS, sin reconstruirlas a mano ni publicarlas. Las migraciones actuales no admiten downgrade: volver a una imagen anterior no equivale a revertir el esquema.

## 4. Despliegue futuro desde `main`: solo el propietario

**Esta sección es un procedimiento condicionado para la integración futura, no una orden para reemplazar ahora el servicio que funciona. Detenerse ante el primer error.**

### Condiciones previas al corte

- [ ] `main` contiene frontend, backend rastreado, fixture, Dockerfiles, migraciones y Compose con sus rutas finales; no depende del clon ignorado.
- [ ] Se verificaron ambas imágenes ARM64 y el acceso del usuario `10001` a la configuración privada de Neon, sin incluirla en las imágenes.
- [ ] Se eligió el entorno Neon `development`, se validaron sus roles y se definió una tarea de migración explícita con configuración privada separada cuando corresponda.
- [ ] El propietario decidió qué hacer con los cuatro registros actuales en RAM. **No se migran automáticamente a Neon**; empezar con una base vacía dejaría sus objetos de OCI sin los registros actuales en la interfaz. No borrar, reimportar ni reiniciar para resolverlo sin esa decisión.
- [ ] Se conservaron el paquete y las imágenes anteriores, los volúmenes, el bucket y la configuración privada. Hay un plan de corte y recuperación compatible con el esquema; no se promete un rollback automático de datos.

### Obtener una revisión completa, sin sobrescribir el paquete actual

Cuando el equipo haya integrado y verificado `main`, clonar en una carpeta nueva. Si ya existe, detenerse y revisarla; no borrarla para repetir el comando.

```bash
cd ~ &&
git clone --single-branch --branch main --no-tags https://github.com/No-Country-simulation/G10-LATAM-equipo-8.git mediflow-main &&
cd mediflow-main &&
git rev-parse HEAD
```

Registrar el SHA y usarlo como etiqueta para ambas imágenes. Un push a Git no cambia por sí solo los contenedores de la instancia; aquí no se ha implementado CI/CD.

### Completar las claves fuera de Git

En la instancia actual, editar el archivo existente con el editor del propietario, por ejemplo `sudoedit /etc/mediflow/backend.runtime.conf`, **solo cuando esté preparado el corte**. Conservar las claves de Gemini/OCI ya funcionales y sus permisos; no reemplazarlas por ejemplos de la documentación.

| Grupo | Configuración prevista para el stack integrado |
| --- | --- |
| Modos | `AI_MODE=gemini`, `REPOSITORY_MODE=postgres`, `STORAGE_MODE=oci`. No aplicar todavía al contenedor actual. |
| Neon | `DATABASE_URL`, `NEON_BRANCH=development`; conexión directa y credenciales de migración en el contexto privado de esa tarea. Provisionar además los dos archivos de validación según el layout probado por el backend. |
| Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL` ya verificado en la cuenta; conservar timeout de 60 segundos y cero reintentos salvo cambio explícito. |
| OCI | `OCI_NAMESPACE`, `OCI_REGION`, `OCI_BUCKET`, `OCI_ACCESS_KEY_ID`, `OCI_SECRET_ACCESS_KEY` ya funcionales. Son claves Customer Secret Key para S3 compatible, no claves SSH/PEM. |
| Directorio local escribible | `STORAGE_DIR=/var/lib/mediflow`. Su volumen no sustituye a Neon ni al bucket OCI. |

Nunca poner las claves en `VITE_*`, argumentos de build, comandos, Git, imágenes, chat o capturas. No usar `docker compose config` sin `--quiet`, `docker inspect` completo ni publicar logs sin revisar: pueden revelar datos privados. `docker compose config --quiet` valida Compose, no la conexión a Neon ni la persistencia.

### Construir, migrar y luego aplicar

Desde la raíz del clon nuevo, preparar únicamente parámetros públicos y la ruta del archivo privado. El siguiente bloque presupone que el Compose integrado ya resuelve los montajes y la tarea de migración descritos arriba:

```bash
IMAGE_TAG="$(git rev-parse HEAD)" &&
cd Frontend/G10-Latam-Equipo-8 &&
{
  compose_mediflow() {
    sudo env \
      BACKEND_CONFIG_FILE=/etc/mediflow/backend.runtime.conf \
      IMAGE_TAG="$IMAGE_TAG" \
      SITE_ADDRESS=mediflow-grupo8.duckdns.org \
      WEB_BIND_ADDRESS=0.0.0.0 \
      WEB_HTTP_PORT=80 WEB_HTTPS_PORT=443 \
      docker compose -p mediflow "$@"
  }

  compose_mediflow config --quiet &&
  compose_mediflow build
}
```

`IMAGE_TAG` es compartido: construir ambas imágenes antes de arrancar con una etiqueta nueva. Mantener el proyecto `mediflow` y los volúmenes `mediflow_caddy-data`, `mediflow_caddy-config` y `mediflow_backend-storage`. Así el cambio de carpeta no crea otro stack ni pierde la configuración de Caddy. No usar `down -v`, prune, borrados de bucket ni modificar `/var/lib/docker`.

Después del build, ejecutar **la tarea de migración entregada por el backend** con la rama, permisos y configuración privada acordados. El Compose actual no ofrece esa tarea: no inventar un comando de migración sobre la imagen actual. Confirmar su resultado antes del arranque de la nueva API.

Solo tras completar las condiciones previas y las migraciones:

```bash
compose_mediflow up -d --no-build --pull never
```

Docker/Compose, DNS y puertos 80/443 ya están preparados en esta instancia; no repetir su instalación ni abrir puertos de PostgreSQL o del backend.

## 5. Aceptación del nuevo stack, no repetición del actual

Al desplegar la integración futura, autorizar una prueba sintética acotada: procesar un documento con Gemini, comprobar su registro en el historial y su original en OCI, registrar una revisión y descargar el original. Tras un reinicio controlado de ese nuevo backend, verificar que historial y revisión siguen presentes y que el original continúa recuperable. Comprobar también los casos de revisión/versionado que cubra el contrato del backend.

No ejecutar estas pruebas ahora ni repetir la limpieza de los cuatro documentos actuales. `/health` solo informa del modo seleccionado; por sí solo no prueba conexiones, migraciones ni persistencia. Las pruebas unitarias sobre SQLite y el script histórico que usa almacenamiento Neon tampoco certifican la combinación PostgreSQL + OCI + Gemini.

Las pruebas Node locales comprueban contratos de archivos, no conexiones a proveedores. En esta estación no hay Docker; la validación ARM y funcional del perfil actual fue realizada por el propietario en OCI. No hay garantía de cuota gratuita, facturación, recuperación de datos o renovación TLS por el mero hecho de que un build termine bien.

## Referencias

- [Neon: ramas y separación de entornos](https://neon.com/docs/reference/glossary).
- [Neon: separación entre compute y almacenamiento durable](https://neon.com/docs/concepts/the-object-model).
- [Neon: conexiones por rama y opciones TLS](https://neon.com/docs/cli/connection-string).
- [Docker: contextos y exclusiones específicas del Dockerfile](https://docs.docker.com/build/building/context/).
- [Docker Compose: nombre del proyecto y precedencia](https://docs.docker.com/compose/how-tos/environment-variables/envvars/).
