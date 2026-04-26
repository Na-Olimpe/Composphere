# Deployment Guide

---

## Prerequisites

- Docker Engine ≥ 24
- Docker Compose v2 (`docker compose` without hyphen)
- `/var/run/docker.sock` accessible (default on Linux)

---

## Quick Start (Local)

The easiest way to get started is by using the provided installation script:

```bash
git clone https://github.com/Na-Olimpe/Composphere.git
cd Composphere
./install.sh
```

The script will automatically:
- Create your `.env` file.
- Detect your host's Docker GID for permissions.
- Build and start the containers.

Open your browser at `http://localhost:22414` (or the port set in `APP_PORT`).

---

## Environment Variables

File: `.env` (copy from `.env.example`)

| Variable | Default | Description |
|---|---|---|
| `COMPOSE_PROJECT_NAME` | `composphere` | Official Docker Compose project name |
| `APP_PORT` | `22414` | Port for the Web UI (ReactPHP Static Server) |
| `WORKER_PORT` | `22415` | Port for the WebSocket server |
| `DOCKER_GID` | `999` | GID of the host's docker group for socket access |

---

## Services (docker-compose.yml)

### `composphere`
- Serves the static frontend from `./public` via a high-performance ReactPHP HTTP server on port `8080`.
- Runs the async WebSocket + Docker API server on port `8081`.
- Mounts `docker.sock` to stream container metrics and execute commands.
- Image: custom PHP CLI (`php/Dockerfile`)

The service runs entirely asynchronously in a single PHP process, completely eliminating the need for separate containers or built-in development servers.

---

## Docker Build Strategy

The project uses a **Multi-stage build** to ensure the production image is ultra-lightweight and secure.

### Stages:
- **`base`**: Minimal Alpine + PHP 8.3 with `pcntl` and `mbstring`.
- **`builder`**: Temporary stage with `composer` to install dependencies.
- **`production`**: The final image. It runs as a non-root `appuser`, has no build tools, and contains only the necessary source code.

To build manually:
```bash
docker compose build --no-cache
```

---

## Technical Dependencies (Inside Container)

- **PHP 8.3 CLI** (Alpine based)
- **pcntl extension**: Required for Graceful Shutdown (handling SIGTERM/SIGINT).
- **libuv**: System library for high-performance event loop (optional).

---

## Directory Structure

```
├── .github/                ← Funding & GitHub configs
├── docs/                   ← Technical documentation
│   ├── architecture.md     ← System design
│   ├── deployment.md       ← This guide
│   ├── preferences.md      ← UI manual
│   └── ...
├── php/                    ← Dockerfile & container config
├── public/                 ← Frontend (Web interface)
│   ├── styles/             ← CSS modules (Glassmorphism)
│   ├── index.html          ← Main entry point
│   ├── app_3d.js           ← Orchestrator
│   ├── CloudSidebar.js     ← Management panel
│   ├── SunSidebar.js       ← Monitoring panel
│   ├── TerminalManager.js  ← Xterm.js integration
│   ├── WaterConsole.js     ← Logs & feedback
│   ├── SoapBubble.js       ← 3D Physics & Shaders
│   ├── Molecules.js        ← Visual project bonds
│   ├── AudioManager.js     ← Web Audio engine
│   ├── SettingsPanel.js    ← Local preferences
│   └── pic-blue.png        ← Environment map
├── src/                    ← PHP Backend (ReactPHP Web & WebSocket Servers)
│   ├── server.php          ← Server entry point
│   ├── Core/               ← System logic (Docker API)
│   └── vendor/             ← Dependencies
├── .env.example            ← Template for configuration
├── composer.json           ← PHP package manifest
├── install.sh              ← Quick-start setup script
└── docker-compose.yml      ← Service orchestration
```

---

## Security & Non-root (Production)

The production image runs as a non-root user (`appuser`). Since it needs to access the Docker socket, you must ensure the container has permission to read/write `/var/run/docker.sock`.

On many systems, you can achieve this by adding the host's `docker` group GID to the container using the `DOCKER_GID` variable in your `.env`:

```yaml
# docker-compose.yml
services:
  composphere:
    group_add:
      - "${DOCKER_GID:-999}"
```

To find your GID, run: `getent group docker | cut -d: -f3`

---

## Troubleshooting

### WebSocket not connecting
- Ensure the `composphere` container is running: `docker compose ps`
- Check container logs: `docker compose logs composphere`
- Confirm `WORKER_PORT` in `.env` matches your environment (the port is dynamically injected into the frontend, so no hardcoding is needed).

### No containers appear
- Verify `docker.sock` is mounted in the `composphere` container.
- The container must run as a user with permission to read the socket (or socket permissions allow group access).

### Blank page / JS errors
- Open DevTools → Console for errors.
- Make sure `APP_PORT` in `.env` points correctly and the ReactPHP HTTP server is running.
