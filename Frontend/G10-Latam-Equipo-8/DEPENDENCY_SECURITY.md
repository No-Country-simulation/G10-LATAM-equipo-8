# Estado de las dependencias del frontend

Se actualizaron las dependencias dentro de los rangos compatibles del manifiesto,
sin `--force`, sin bajar shadcn a 1.x y sin modificar el comportamiento clínico.
La auditoría resultante informa **0 avisos altos, 0 moderados y 3 bajos**; no es una
auditoría completamente limpia ni una certificación del servicio desplegado.

## Cambios principales

| Paquete | Antes | Después |
|---|---|---|
| Vite | 8.3.0 | 8.3.5 |
| shadcn | 4.21.0 | 4.23.0 |
| Zod | 4.6.5 y una copia 3.25.76 | 4.6.7 |
| undici | 7.29.1 | 7.30.1 |
| source-map-js | 1.2.1 | 1.2.2 |

La nueva versión compatible de shadcn sustituye su dependencia del SDK MCP 1.x;
las antiguas dependencias Express/body-parser y la copia Zod 3 desaparecen del árbol.
El manifiesto del frontend y las dependencias independientes de la raíz no cambian.

## Riesgo residual aceptado

`deepmerge@4.3.1` sigue afectado por
[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4): determinadas
claves de entrada pueden alterar el prototipo del objeto combinado devuelto.
La presencia del paquete no demuestra explotación ni exposición pública.

La auditoría cuenta tres paquetes afectados por esta misma causa: `deepmerge`,
`@shadcn/registry` y `shadcn`. Al realizar la corrección, la última versión publicada
de deepmerge sigue siendo 4.3.1 y no existe un parche nuevo disponible.
El propietario aceptó explícitamente conservar estos avisos bajos documentados
mientras se verifican y guardan las correcciones compatibles.

No se agregó una excepción que oculte avisos, un reemplazo de API ni una bajada
forzada de shadcn. Revisar este pendiente cuando exista una corrección upstream.

## Comprobaciones

Desde este directorio:

```bash
npm audit
NODE_DISABLE_COMPILE_CACHE=1 node --test --test-concurrency=1 tests/*.test.mjs
npm run lint
npm run build
```

`npm audit` devuelve código 1 mientras existan los avisos bajos; no interpretarlo
como cero vulnerabilidades. La prueba `tests/dependency-security.test.mjs` fija
mínimos para las versiones altas previamente reportadas, pero no sustituye una
auditoría actualizada. Las comprobaciones funcionales y visuales tampoco prueban
seguridad clínica ni todas las funciones del generador de componentes de shadcn.
