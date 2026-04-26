import { SettingsPanel } from './SettingsPanel.js';

import * as THREE from 'three';
import { CloudSidebar } from './CloudSidebar.js';
import { SunSidebar } from './SunSidebar.js';
import { WaterConsole } from './WaterConsole.js';
import { Bubble } from './SoapBubble.js';
import { MoleculesEngine } from './Molecules.js';
import { AudioManager } from './AudioManager.js';

// --- THREE.JS SETUP ---
const appCanvas = document.getElementById('app-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);

const renderer = new THREE.WebGLRenderer({ canvas: appCanvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const geometry = new THREE.SphereGeometry(1, 128, 128);

// --- APP.JS 2D LOGIC ---

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const controls = document.getElementById('controls');

let socket;
try {
    const wsHost = window.location.hostname || 'localhost';
    socket = new WebSocket(`ws://${wsHost}:22415`);
} catch (e) {
    console.warn("Failed to connect websocket", e);
}

// Global instances
const settings = new SettingsPanel();
const cloudSidebar = new CloudSidebar('sidebar', 'cloud-toggle', 'sidebar-list');
const sunSidebar = new SunSidebar('sun-sidebar', 'sun-toggle', 'sun-sidebar-list');
const waterConsole = new WaterConsole('water-console');
const moleculesEngine = new MoleculesEngine(ctx);
const audioManager = new AudioManager(settings);

// Cluster Upsell listener
const clusterToggle = document.getElementById('cluster-toggle');
if (clusterToggle) {
    clusterToggle.addEventListener('click', () => {
        alert("🌐 Composphere Pro Feature\n\nMulti-host synchronization and Cloud management are available in the Pro version. Support the project to unlock cluster features!");
    });
}

// Link audio to console
waterConsole.setAudioManager(audioManager);

// Listen to actions from the sidebar
document.addEventListener('sidebarAction', (e) => {
    if (e.detail.action === 'start') {
        audioManager.playDrop();
    }
    window.send(e.detail.action, e.detail.id);
});

let bubbles = [];

let draggedBubble = null;
let mouseX = 0, mouseY = 0;
let prevMouseX = 0, prevMouseY = 0;
let dragDist = 0;

function resize() {
    const oldW = canvas.width;
    const oldH = canvas.height;
    const newW = window.innerWidth;
    const newH = window.innerHeight;

    // Scale bubble positions to prevent clustering during window resize
    if (oldW > 0 && oldH > 0 && (oldW !== newW || oldH !== newH)) {
        const scaleX = newW / oldW;
        const scaleY = newH / oldH;
        bubbles.forEach(b => {
            b.x *= scaleX;
            b.y *= scaleY;
        });
        // Reset particles to avoid "ghost" elements flying around
        moleculesEngine.particles = [];
    }

    canvas.width = newW;
    canvas.height = newH;

    appCanvas.width = newW;
    appCanvas.height = newH;

    camera.aspect = newW / newH;
    camera.updateProjectionMatrix();

    const fov = THREE.MathUtils.degToRad(camera.fov);
    const distance = newH / (2 * Math.tan(fov / 2));
    camera.position.set(0, 0, distance);

    renderer.setSize(newW, newH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', resize);
resize();

if (socket) {
    socket.onmessage = (e) => {
        let data;
        try {
            data = JSON.parse(e.data);
        } catch (err) { return; }

        if (data.type === 'logs') {
            let b = bubbles.find(x => x.id === data.id);
            let cName = b ? b.name : data.id.substring(0, 8);
            waterConsole.show(data.id, cName, data.logs || '--- No Logs Found ---');
            return;
        }

        if (data.type === 'terminal') {
            waterConsole.writeTerminal(data.data);
            return;
        }

        if (data.type === 'exec') {
            // Deprecated: fallback for old style commands
            waterConsole.writeTerminal(data.output);
            return;
        }

        // --- DELTA UPDATES PROTOCOL ---
        if (data.type === 'full') {
            window.containersCache = data.data;
            syncAll(window.containersCache);
            return;
        }

        if (data.type === 'delta') {
            data.data.forEach(d => {
                if (d.action === 'add') {
                    window.containersCache.push(d.data);
                } else if (d.action === 'update') {
                    let c = window.containersCache.find(x => x.Id === d.data.Id);
                    if (c) Object.assign(c, d.data);
                } else if (d.action === 'remove') {
                    window.containersCache = window.containersCache.filter(x => x.Id !== d.id);
                }
            });
            syncAll(window.containersCache);
            return;
        }

        if (Array.isArray(data)) {
            window.containersCache = data;
            syncAll(data);
            return;
        }
    };
}

window.containersCache = window.containersCache || [];

function syncAll(dataList) {
    const incomingIds = dataList.map(c => c.Id);

    // 1. Identify bubbles to remove
    bubbles.forEach(b => {
        if (!incomingIds.includes(b.id) && !b.isPoping) {
            b.isPoping = true;
        }
    });

    // 2. Update or spawn bubbles
    const env = { canvas, ctx, scene, geometry };
    dataList.forEach(c => {
        let b = bubbles.find(x => x.id === c.Id);
        if (b && b.isPoping) return;

        if (b) {
            if (b.state === 'running' && c.State !== 'running') {
                b.isPoping = true;
                return;
            }
            b.updateData(c);
        } else {
            bubbles.push(new Bubble(c, env));
        }
    });

    cloudSidebar.updateData(dataList);
    sunSidebar.updateData(dataList);
}

const clock = new THREE.Clock();

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsedTime = clock.getElapsedTime();

    // Sync Night Mode (Deep Sea)
    if (settings.nightModeEnabled) {
        document.body.classList.add('night-mode');
    } else {
        document.body.classList.remove('night-mode');
    }

    // 1. First UPDATE physics and positions
    for (let i = bubbles.length - 1; i >= 0; i--) {
        let b = bubbles[i];
        if (b.update(elapsedTime, bubbles, settings)) {
            if (b.isPoping) audioManager.playPop(); // Pop sound
            bubbles.splice(i, 1);
        }
    }

    // 2. DRAW connections and effects
    moleculesEngine.drawMolecules(bubbles, elapsedTime);
    moleculesEngine.drawNetworks(bubbles);

    // 3. DRAW the bubbles and rotate meshes
    bubbles.forEach(b => {
        b.draw();
        if (b.mesh && !b.isPoping) {
            b.mesh.rotation.y += 0.005;
            b.mesh.rotation.z += 0.003;
        }
    });

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

if (!socket || socket.readyState !== WebSocket.OPEN) {
    setTimeout(() => {
        if (bubbles.length === 0) {
            const env = { canvas, ctx, scene, geometry };
            bubbles.push(new Bubble({ Id: '1', Names: ['/pangolin'], State: 'running', cpu_usage: '4.5%', ram_stats: { percent: '12.5%' }, networks: ['backend'], compose_project: 'my-app' }, env));
            bubbles.push(new Bubble({ Id: '2', Names: ['/traefik'], State: 'running', cpu_usage: '12.1%', ram_stats: { percent: '45.0%' }, networks: ['backend', 'frontend'], compose_project: 'infrastructure' }, env));
            bubbles.push(new Bubble({ Id: '3', Names: ['/hello-world-test'], State: 'running', cpu_usage: '2.0%', ram_stats: { percent: '5.2%' }, networks: ['frontend'], compose_project: 'my-app' }, env));
            bubbles.push(new Bubble({ Id: '4', Names: ['/newt'], State: 'exited', cpu_usage: '0.0%', ram_stats: { percent: '0%' }, networks: ['backend'], compose_project: null }, env));
            bubbles.push(new Bubble({ Id: '5', Names: ['/composphere-worker'], State: 'running', cpu_usage: '2.0%', ram_stats: { percent: '85.0%' }, networks: ['frontend'], compose_project: 'composphere' }, env));
            bubbles.push(new Bubble({ Id: '6', Names: ['/gerbil'], State: 'running', cpu_usage: '2.0%', ram_stats: { percent: '30.1%' }, networks: ['frontend'], compose_project: 'infrastructure' }, env));
            bubbles.push(new Bubble({ Id: '7', Names: ['/composphere-app'], State: 'running', cpu_usage: '0.0%', ram_stats: { percent: '65.2%' }, networks: ['frontend'], compose_project: 'composphere' }, env));
        }
    }, 1500);
}

animate();

// --- DRAG AND THROW PHYSICS ---

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    dragDist = 0;

    for (let i = bubbles.length - 1; i >= 0; i--) {
        let b = bubbles[i];
        if (!b.isPoping && Math.hypot(b.x - mouseX, b.y - mouseY) < b.radius) {
            draggedBubble = b;
            b.isDragged = true;
            b.vx = 0; b.vy = 0;
            
            audioManager.playBlup(); // Bubble selection sound

            controls.style.display = 'block';
            controls.style.left = e.clientX + 'px';
            controls.style.top = e.clientY + 'px';
            document.getElementById('c-name').innerText = b.name;
            document.getElementById('btn-container').innerHTML =
                `<div style="font-size: 11px; color: #666; margin-top: 5px;">Click logs! ⚾</div>`;
            return;
        }
    }
    controls.style.display = 'none';
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    prevMouseX = mouseX; prevMouseY = mouseY;
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (draggedBubble) {
        dragDist += Math.abs(mouseX - prevMouseX) + Math.abs(mouseY - prevMouseY);
        draggedBubble.x = mouseX;
        draggedBubble.y = mouseY;
        draggedBubble.vx = (mouseX - prevMouseX) * 0.7;
        draggedBubble.vy = (mouseY - prevMouseY) * 0.7;

        controls.style.left = (e.clientX + 20) + 'px';
        controls.style.top = e.clientY + 'px';
    }
});

window.addEventListener('mouseup', () => {
    if (draggedBubble) {
        if (dragDist < 30) {
            // Handle clean click (no drag) - request logs
            window.send('logs', draggedBubble.id);
        }
        draggedBubble.isDragged = false;
        draggedBubble = null;
        controls.style.display = 'none';
    }
});

window.send = function (action, id) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action, id }));
    } else {
        console.warn(`Cannot send action '${action}' for container '${id}' - no websocket connection.`);
    }
    controls.style.display = 'none';
}

window.sendExecCommand = function (id, cmd) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'exec', id, cmd }));
    }
}

window.sendTerminalInput = function (id, data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'terminal', id, data }));
    }
}
