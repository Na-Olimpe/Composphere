# System Architecture

## Overview

Composphere is a real-time Docker container dashboard. It visualizes running containers
as animated 3D soap bubbles using a PHP async backend and a Vanilla JS + Three.js frontend.

## AudioManager.js — Sound Engine

**Location:** `public/AudioManager.js`  
**Role:** Manages UI sound effects (blups, pops, drops) with volume control linked to `SettingsPanel`.

## Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ CloudSidebar │  │  SunSidebar  │  │     WaterConsole      │  │
│  │  (manage)    │  │  (monitor)   │  │   (logs / terminal)   │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                 │                      │              │
│  ┌──────▼─────────────────▼──────────────────────▼───────────┐  │
│  │                        app_3d.js                          │  │
│  │   WebSocket client · Bubble physics · 2D overlay canvas   │  │
│  │   Three.js 3D canvas · Molecule grouping · Particle FX    │  │
│  └──────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────│───────────────────────────────────┘
                              │ HTTP :8080 & WebSocket :8081
┌─────────────────────────────▼───────────────────────────────────┐
│                     COMPOSPHERE (PHP Container)                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      server.php                         │    │
│  │               Bootstrap · Wiring · Loop                 │    │
│  │                                                         │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐ │    │
│  │  │ BubbleServer  │  │ ReactPHP HTTP │  │ EventManager │ │    │
│  │  │  (Ratchet WS) │  │(Static Assets)│  │ (stream evts)│ │    │
│  │  └──────┬────────┘  └───────┬───────┘  └───────┬──────┘ │    │
│  └──────── │ ───────────────── │ ──────────────── │ ───────┘    │
│            │                   │ Unix Socket      │             │
│            │              /var/run/docker.sock                  │
└────────────│────────────────────────────────────────────────────┘
             │
             └─→ Docker API (GET /containers/json)

```

## Data Flow

```
Docker Daemon
    │
    ├── [Every 3 sec] Periodic timer → DockerClient.request(GET /containers/json)
    │       └─→ for each running container → GET /containers/{id}/stats
    │               └─→ calculateCpuPercent() / calculateNetSpeed() / calculateRamStats()
    │                       └─→ cpuCache / netCache / ramCache (in BubbleServer)
    │
    └── [Instant]  EventManager streams /events
            └─→ on('container_event') → broadcastState() triggered immediately
                    └─→ BubbleServer.broadcast(allContainers)
                            └─→ WebSocket → JSON array → app_3d.js
                                    ├─→ Update or create Bubble objects
                                    ├─→ Update CloudSidebar (manage panel)
                                    └─→ Update SunSidebar (stats panel)
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **ReactPHP async loop** | Docker stats API is slow (each call blocks); async allows parallel fetching for all containers without threading |
| **Unified Container** | Frontend static assets and backend WebSocket logic are served by the same ReactPHP event loop on different ports, reducing footprint |
| **Cache-then-update pattern** | `cpuCache` stores last known value; new WebSocket clients get data instantly without waiting for next poll |
| **Dual-canvas rendering** | `#app-canvas` (WebGL/Three.js) is `pointer-events: none`; `#canvas` (2D) handles all mouse events and text overlay |
| **No bundler (Vite/Webpack)** | Three.js is loaded via ES6 importmap from CDN — zero build step, fast iteration |
| **Ratchet over raw sockets** | Handles WebSocket handshake, framing, and multi-client routing automatically |

## Port Map

| Service | Internal | External (`.env`) |
|---|---|---|
| Web UI (ReactPHP Static Server) | `8080` | `APP_PORT` (default `22414`) |
| WebSocket Server | `8081` | `WORKER_PORT` (default `22415`) |
