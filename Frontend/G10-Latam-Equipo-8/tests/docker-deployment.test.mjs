import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFile(path.join(frontendRoot, name), "utf8");

function serviceBlock(compose, service) {
  const match = compose.match(
    new RegExp(`^  ${service}:\\n([\\s\\S]*?)(?=^  [\\w-]+:|^volumes:|\\z)`, "m"),
  );
  assert.ok(match, `compose.yaml must define ${service}`);
  return match[1];
}

test("frontend image builds with the production API base and serves the static build with Caddy", async () => {
  const dockerfile = await read("deploy/frontend.Dockerfile");
  assert.match(dockerfile, /FROM\s+node:22-[\w.-]+\s+AS\s+build/i);
  assert.match(dockerfile, /COPY\s+package\.json\s+package-lock\.json/);
  assert.match(dockerfile, /RUN\s+npm\s+ci\b/);
  assert.match(dockerfile, /VITE_API_URL=\/api\/v1\s+npm\s+run\s+build/);
  assert.match(dockerfile, /FROM\s+caddy:2\.\d+(?:\.\d+)?-alpine/i);
  assert.match(dockerfile, /COPY\s+deploy\/Caddyfile\s+\/etc\/caddy\/Caddyfile/);
  assert.match(dockerfile, /COPY\s+--from=build\s+\/app\/dist\s+\/srv/);
});

test("both build contexts exclude credentials, local state, and unrelated checkouts", async () => {
  const frontendIgnore = await read(".dockerignore");
  const backendIgnore = await read("deploy/backend.Dockerfile.dockerignore");
  for (const pattern of ["**/.env", "**/.env.*", "**/.git", "**/.venv", "**/node_modules", "**/storage", "**/*.pem", "**/*.key"]) {
    assert.ok(frontendIgnore.includes(pattern), `frontend context must exclude ${pattern}`);
    assert.ok(backendIgnore.includes(pattern), `backend context must exclude ${pattern}`);
  }
  assert.match(frontendIgnore, /!package\.json/);
  assert.match(frontendIgnore, /!package-lock\.json/);
  assert.match(frontendIgnore, /!src\//);
  assert.match(backendIgnore, /!pyproject\.toml/);
  assert.match(backendIgnore, /!uv\.lock/);
  assert.match(backendIgnore, /!app\//);
  assert.match(frontendIgnore, /backend-oci-storage-current-reference/);
  assert.match(frontendIgnore, /\.docker-verification\.local/);
});

test("backend image is locked, allowlisted, unprivileged, internal, and single-worker", async () => {
  const dockerfile = await read("deploy/backend.Dockerfile");
  const compose = await read("compose.yaml");
  assert.match(dockerfile, /FROM\s+python:3\.12-slim/i);
  assert.match(dockerfile, /COPY\s+pyproject\.toml\s+uv\.lock/);
  assert.match(dockerfile, /uv\s+sync\s+--locked\s+--no-dev\s+--no-install-project/);
  assert.match(dockerfile, /COPY\s+app\/\s+\.\/app\/?/);
  assert.match(dockerfile, /USER\s+10001:10001/);
  const command = dockerfile.match(/^CMD\s+(\[.*\])\s*$/m);
  assert.ok(command, "backend must declare an exec-form command");
  assert.deepEqual(JSON.parse(command[1]), [
    "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1",
  ]);
  assert.doesNotMatch(dockerfile, /--reload/);

  const backend = serviceBlock(compose, "backend");
  assert.match(backend, /context:\s+\.\.\/\.\.\/backend[ \t]*$/m);
  assert.match(backend, /dockerfile:\s+\.\.\/Frontend\/G10-Latam-Equipo-8\/deploy\/backend\.Dockerfile[ \t]*$/m);
  assert.match(backend, /BACKEND_CONFIG_FILE:\?[^}\n]+/);
  assert.match(backend, /STORAGE_DIR:\s*\/var\/lib\/mediflow/);
  assert.match(backend, /\/var\/lib\/mediflow/);
  assert.doesNotMatch(backend, /^    ports:/m, "backend must not publish a host port");
  assert.match(backend, /^    expose:/m, "backend should only expose its internal service port");
  assert.doesNotMatch(compose, /network_mode:\s*host|privileged:\s*true|\/var\/run\/docker\.sock/);
});

test("Caddy preserves API paths, bounds uploads and waits for slow processing", async () => {
  const caddyfile = await read("deploy/Caddyfile");
  assert.match(caddyfile, /\{\$SITE_ADDRESS\}/);
  assert.match(caddyfile, /path\s+\/api\/v1\s+\/api\/v1\/\*/);
  assert.match(caddyfile, /handle\s+@api\s*\{/);
  assert.doesNotMatch(caddyfile, /handle_path|strip_prefix/);
  assert.match(caddyfile, /reverse_proxy\s+backend:8002/);
  assert.match(caddyfile, /max_size\s+12MB/);
  assert.match(caddyfile, /response_header_timeout\s+120s/);
  assert.doesNotMatch(caddyfile, /rate_limit|limit_req/);
});

test("Compose keeps local ports loopback-only and persists Caddy certificates without exposing admin", async () => {
  const compose = await read("compose.yaml");
  const frontend = serviceBlock(compose, "frontend");
  assert.match(frontend, /SITE_ADDRESS:\s*"?\$\{SITE_ADDRESS:-:80\}"?/);
  assert.match(frontend, /127\.0\.0\.1/);
  assert.match(frontend, /caddy-data:\/data/);
  assert.match(frontend, /caddy-config:\/config/);
  assert.match(frontend, /cap_drop:/);
  assert.match(frontend, /read_only:\s*true/);
  assert.doesNotMatch(frontend, /2019/);
  assert.match(compose, /backend-storage:/);
});

test("local configuration and owner guide make simulation, secrets, Caddy TLS, and runtime limits explicit", async () => {
  const localConfig = await read("deploy/backend.local.conf");
  const guide = await read("deploy/README.md");
  const readme = await read("README.md");
  assert.match(localConfig, /AI_MODE=simulated/);
  assert.match(localConfig, /REPOSITORY_MODE=memory/);
  assert.match(localConfig, /STORAGE_MODE=local/);
  assert.match(guide, /9220f500a223436ef045c4bdec4e99ad171cc81f/);
  assert.match(guide, /mediflow-grupo8\.duckdns\.org/);
  assert.match(guide, /compose config --quiet/);
  assert.match(guide, /Gemini|GEMINI_API_KEY/);
  assert.match(guide, /OCI/);
  assert.match(guide, /RAM|memoria/);
  assert.match(guide, /no se validaron|no se verific|no está verificado|no están verificados/i);
  assert.match(readme, /deploy\/README\.md/);
});
