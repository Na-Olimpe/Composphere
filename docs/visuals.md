# 🎨 Visual Design & Rendering

Composphere uses a unique "Soap Ocean" aesthetic. The goal is to represent cold, technical Docker containers as organic, fragile, and living entities.

---

## 🫧 The Bubble Concept

Why soap bubbles?
- **Transparency**: Allows seeing overlapping data and background.
- **Fragility**: Reflects the ephemeral nature of containers (spin up / tear down).
- **Organic Motion**: Breaking the "grid" typical for dashboards.

---

## 🎭 Dual-Canvas System

To achieve high performance with complex text and 3D effects, the project uses a **layered canvas approach**:

1.  **Background (DOM)**: CSS-gradient background.
2.  **Middle Layer (WebGL)**: `Three.js` renders the 3D spheres. This layer is "mouse-blind" (`pointer-events: none`).
3.  **Top Layer (Canvas 2D)**: Responsible for physics calculations (collisions), labels, network particles, and project bonds. This layer handles all mouse interactions.

This decoupling allows us to have thousands of 2D particles and text labels without bogging down the 3D GPU rendering.

---

## 🧪 Shader Magic (GLSL)

The bubbles don't use standard textures. They are rendered using a custom **GLSL Fragment Shader**:

### 1. Thin-Film Interference (Iridescence)
We use a mathematical rainbow palette (Inigo Quilez algorithm). The color shifts based on the angle of view, creating that "oily" soap film look.

### 2. Fresnel Effect
The bubbles are nearly invisible in the center and become opaque/shiny at the edges. This creates the illusion of a hollow glass-like sphere.

### 3. Dynamic Deformation
We use **3D Simplex Noise** to displace vertices in the Vertex Shader. 
- **Idle**: Gentle swaying.
- **High CPU**: The noise frequency and amplitude increase, making the bubble "boil" and shake.

### 4. Internal Liquid (RAM)
A separate inner sphere simulates liquid using a **Clipping Plane**. The "water level" is tied to the container's RAM usage. It includes:
- Animated waves on the surface.
- A glowing "foam" line at the к кромке.
- Color shift to red/magenta when memory is low.

---

## 🧬 Molecular Grouping

Containers belonging to the same `docker-compose` project are visually bound:
- **Bonds**: Triple-layered glowing lines (core, glow, outer atmosphere).
- **Orbitals**: Dashed rings that rotate around each "atom" (container).
- **Attraction**: A force-directed simulation pulls project members together, forming distinct "molecules" on the screen.

---

## 💥 Life & Death: The POP! Animation

The ephemeral nature of containers is celebrated through a physical "popping" event when a container stops or is removed:

1.  **Compression & Expansion**: Just before bursting, the bubble's radius increases by 25%, simulating increased internal pressure.
2.  **Opacity Decay**: The 3D shell and internal liquid rapidly fade to zero alpha.
3.  **Particle Burst (2D Overlay)**: At the moment of the "pop", a system of 20+ particles is generated on the top 2D Canvas layer. These particles inherit the bubble's position and fly outwards with randomized vectors and physics-based decay.
4.  **Shadow & Glow**: Particles use `shadowBlur` and sparkling effects to create a "soap-fluid" look that lingers briefly.

---

## 🎨 UI & Color Palette

The project follows a **Glassmorphism** style:
- **Sidebars**: High transparency (80%) with `backdrop-filter: blur(12px)`.
- **Typography**: Bold, high-contrast sans-serif / monospace for that "control room" feel.
- **Dynamic Branding**: The "Sun" sidebar (stats) and "Cloud" sidebar (actions) use warm/cool color separation.
