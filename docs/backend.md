# Backend Modules

All backend code lives in `src/`. The entry point is `server.php`; the core logic is encapsulated in the `src/Core/` classes.

---

## `server.php` — Bootstrap & Wiring

**Location:** `src/server.php`  
**Role:** Application entry point. Instantiates all components, wires them together, and starts the ReactPHP event loop.

### Responsibilities

- Creates the ReactPHP `Loop` and the shared `UnixConnector` (for Docker socket)
- Instantiates `DockerClient`, `EventManager`, `BubbleServer`, and `DockerService`
- Wires `BubbleServer` events (commands, closing connections) to `DockerService` logic
- Sets a **3-second periodic timer** for stats updates via `DockerService::broadcastState()`
- Listens to `EventManager::container_event` for **instant** updates on container lifecycle changes
- Starts the Ratchet WebSocket server on port `8081`

---

## `DockerService.php` — Business Logic Coordinator

**Location:** `src/Core/DockerService.php`  
**Role:** The "brain" of the backend. Orchestrates communication between Docker, the WebSocket hub, and the internal state.

### Key Responsibilities

1. **State Polling & Broadcasting**:
   - Fetches the full container list via `DockerClient`.
   - Enrichment: Adds `compose_project`, `network_list`, and computed metrics.
   - Pushes the final array to `BubbleServer` for broadcasting.
2. **Stats Calculation**:
   - `calculateCpuPercent($stat)`: Computes CPU % from delta between `cpu_stats` and `precpu_stats`.
   - `calculateNetSpeed($stat, $cache, $id)`: Returns KB/s based on byte delta since last poll.
   - `calculateRamStats($stat)`: Returns `['percent', 'usage_mb', 'limit_mb']` from `memory_stats`.
3. **Command Handling**:
   - `handleCommand($action, $id, ...)`: Executes Docker actions (`start`, `stop`, `rm`, `restart`).
   - `logs`: Fetches and cleans container logs for the UI.
   - `terminal`: Manages raw interactive terminal sessions using Docker exec and raw socket streaming.
4. **Session Management**:
   - `closeAllSessions($conn)`: Cleans up active terminal streams when a client disconnects.

---

## `BubbleServer.php` — WebSocket Hub (with Delta Updates)

**Location:** `src/Core/BubbleServer.php`  
**Implements:** `Ratchet\MessageComponentInterface`

### Properties

- `$clients`: `SplObjectStorage` with per-client last known state.
- `$lastState`: Full last broadcast payload (for new clients).
- `$onDockerCommand`: Hook: called when UI sends an action.

### Delta Updates Protocol

Instead of sending the full container list every time, `BubbleServer` calculates the difference between the new state and what each client last received.

- **`type: full`**: Sent on initial connection or major state reset.
- **`type: delta`**: Sent for periodic updates. Contains an array of actions: `add`, `update`, `remove`.

---

## `DockerClient.php` — Docker HTTP Adapter

**Location:** `src/Core/DockerClient.php`

### Purpose
Wraps `react/http` `Browser` to send async HTTP requests to the Docker Engine API via the Unix socket `/var/run/docker.sock`.

### `request(string $method, string $endpoint, string $body = ''): PromiseInterface`
Returns a `Promise` that resolves with the raw response body string. Handles `GET`, `POST`, `DELETE` methods.

### `connectRaw(): PromiseInterface`
Returns a raw ReactPHP socket connection to the Docker daemon. Used for high-performance streaming like interactive terminals.

---

## `EventManager.php` — Docker Events Stream

**Location:** `src/Core/EventManager.php`  
**Extends:** `Evenement\EventEmitter`

### Purpose
Maintains a **persistent streaming connection** to Docker's `/events` endpoint. When Docker fires a lifecycle event, `EventManager` emits a PHP event that triggers an instant broadcast.

### Usage in `server.php`
```php
$events->on('container_event', function ($event) use ($dockerService) {
    $dockerService->broadcastState(); // push fresh state to all clients immediately
});
```

---

### 🚦 Signal Handling

To ensure the server shuts down gracefully, the ReactPHP event loop listens for `SIGTERM` and `SIGINT` signals. When caught, the loop is stopped, allowing the process to exit cleanly.
