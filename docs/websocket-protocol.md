# WebSocket Protocol

Communication between the frontend (`app_3d.js`) and the backend (`BubbleServer`) uses a single WebSocket connection at `ws://localhost:8081`.

---

## Server → Client (Broadcast)

The server uses a **Delta Updates** protocol to minimize bandwidth. Instead of sending the full state every time, it sends only what changed.

### Message Types

#### 1. `type: full`
Sent immediately upon connection. Contains the complete list of all containers.

```jsonc
{
  "type": "full",
  "data": [
    {
      "Id": "a3f2c...",
      "Names": ["/my-app"],
      "State": "running",
      "cpu_usage": "4.2%",
      "net_speed": 1.03,
      "ram_stats": { "percent": 43.1, "usage_mb": 441.6, "limit_mb": 1024.0 },
      "compose_project": "my-stack",
      "network_list": ["bridge"]
    }
    // ... other containers
  ]
}
```

#### 2. `type: delta`
Sent periodically (every 3s) or on events. Contains a list of incremental actions.

```json
{
  "type": "delta",
  "data": [
    { "action": "update", "data": { "Id": "a3f2c...", "cpu_usage": "5.1%" } },
    { "action": "add",    "data": { "Id": "b1e9d...", "Names": ["/new-pod"], ... } },
    { "action": "remove", "id": "c2d8a..." }
  ]
}
```

---

## Client → Server (Actions)

The browser sends a JSON object to trigger Docker actions or request data.

### Lifecycle Actions
```json
{ "action": "start",   "id": "a3f2c..." }
{ "action": "stop",    "id": "a3f2c..." }
{ "action": "restart", "id": "a3f2c..." }
{ "action": "rm",      "id": "a3f2c..." }
```

### Logging & Terminal
| Action | Description | Response Type |
|---|---|---|
| `logs` | Fetch last 50 lines of logs | `type: logs` |
| `terminal` | Send raw input to interactive shell | `type: terminal` |

**Example Terminal Input:**
```json
{ "action": "terminal", "id": "a3f2c...", "data": "ls -la\n" }
```

---

## Response Types

### Logs
```json
{ "type": "logs", "id": "a3f2c...", "logs": "..." }
```

### Terminal Output
```json
{ "type": "terminal", "id": "a3f2c...", "data": "total 12\ndrwxr-xr-x ..." }
```

---

## Message Routing on the Frontend

```js
socket.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    switch(msg.type) {
        case 'full':     syncAll(msg.data); break;
        case 'delta':    applyDelta(msg.data); break;
        case 'logs':     waterConsole.show(msg.id, msg.logs); break;
        case 'terminal': waterConsole.writeTerminal(msg.data); break;
    }
};
```
