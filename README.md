# 🫧 Composphere

> A real-time Docker container dashboard — visualized as living, iridescent soap bubbles.

![PHP](https://img.shields.io/badge/PHP-8.x-8892BF?style=flat-square&logo=php)
![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?style=flat-square&logo=threedotjs)
![ReactPHP](https://img.shields.io/badge/ReactPHP-async-blueviolet?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-required-2496ED?style=flat-square&logo=docker)

![Composphere demo](./docs/media/demo.gif)

## What is this?

Composphere connects to the Docker Engine and renders your running containers as animated 3D soap bubbles in the browser. Each bubble reacts to the container it represents:

- 🌡️ **CPU load** — bubble shakes, deforms, and turns red under pressure
- 🔗 **Networks** — glowing lines connect containers sharing a network
- ⬡ **Docker Compose groups** — containers of the same project orbit each other with molecular bonds

## Quick Start

```bash
git clone https://github.com/Na-Olimpe/Composphere
cd Composphere
./install.sh
```

Open **http://localhost:22414** in your browser.


## 🛠️ Tech Stack

- **Frontend**: Three.js (WebGL), Vanilla Javascript, Xterm.js, Web Audio API.
- **Backend**: PHP 8.2+, ReactPHP (Event Loop, Socket, HTTP), Ratchet (WebSockets).
- **Infrastructure**: Docker Engine API (Unix Socket Hijacking).


## Documentation

Full technical documentation is in [`docs/`](./docs/):

- [Architecture](./docs/architecture.md) — system diagram and data flow
- [Backend modules](./docs/backend.md) — PHP classes
- [Frontend modules](./docs/frontend.md) — JS components
- [User preferences](./docs/preferences.md) — UI settings manual
- [WebSocket protocol](./docs/websocket-protocol.md) — message format
- [Deployment](./docs/deployment.md) — env vars, ports, troubleshooting

## Donate for development future projects:)

[![Patreon](https://img.shields.io/badge/Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://patreon.com/NA_OLIMPE)
