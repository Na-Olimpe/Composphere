# Frontend Modules

All frontend code lives in `public/`. The page entry point is `index_3d.html`; modules are loaded as native ES6 modules via `<script type="module">`.

---

## Module Map

```
index_3d.html
    └── app_3d.js  (Orchestrator)
            ├── CloudSidebar.js    (Management Panel)
            ├── SunSidebar.js      (Stats Panel)
            ├── WaterConsole.js    (Logs & Terminal)
            ├── SoapBubble.js      (Bubble Class & Shaders)
            ├── Molecules.js       (Grouping & Network FX)
            ├── SettingsPanel.js   (UI Customization)
            └── AudioManager.js    (Sound Effects)
```

---

## `app_3d.js` — Main Application

**Location:** `public/app_3d.js`  
**Role:** Orchestrator. Owns the render loop, WebSocket client, and coordinates all sub-modules.

### WebSocket Handling (Delta Updates)
The app implements the Delta Updates protocol to keep the UI in sync with the backend efficiently:
- `type: full`: Rebuilds the internal `containersCache` and spawns/updates all bubbles.
- `type: delta`: Iteratively applies `add`, `update`, or `remove` actions to the cache.

### Core Functions
- `syncAll(dataList)`: Matches the cache against active `Bubble` instances. Spawns new bubbles, updates data on existing ones, or triggers the "pop" animation for removed ones.
- `resize()`: Handles window scaling and recalculates Three.js camera distance to maintain 1:1 pixel parity.
- `animate()`: The main loop (60 FPS). Updates physics via `Bubble.update()` and renders effects via `MoleculesEngine`.

---

## `SoapBubble.js` — Bubble Logic & Shaders

**Location:** `public/SoapBubble.js`  
**Role:** Contains the `Bubble` class and custom GLSL shaders.

### `class Bubble`
Encapsulates both the physical state (position, velocity) and the Three.js visual representation.
- **Physics**: Implements wall bouncing, elastic bubble-bubble collisions, and molecular attraction forces.
- **Shaders**:
    - `uCpuLoad`: Drives bubble deformation and color intensity.
    - `uRamLoad`: Controls the "liquid level" inside the bubble.
    - `uOpacity`: Used for smooth fade-out during the pop animation.

---

## `Molecules.js` — Project Visuals

**Location:** `public/Molecules.js`  
**Role:** Renders high-level project relationships.
- **Project Groups**: Draws glowing bonds and orbital rings around bubbles sharing a `com.docker.compose.project` label.
- **Network Traffic**: Draws gradient lines between bubbles on the same network and spawns traveling particles to visualize data flow.

---

## `WaterConsole.js` — Interaction Panel

**Location:** `public/WaterConsole.js`  
**Role:** Interactive panel for logs and shell access.
- **Real-time Terminal**: Supports raw interactive terminal sessions using the `terminal` WebSocket action.
- **Log Streaming**: Displays the last 50 lines of Docker logs.

---

## `AudioManager.js` — Sound Engine

**Location:** `public/AudioManager.js`  
**Role:** Manages UI sound effects (blups, pops, drops) with volume control linked to `SettingsPanel`.
