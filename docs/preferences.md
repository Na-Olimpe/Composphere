# 🛠️ User Preferences & UI Settings

This document explains the various configuration options available in the **Preferences Panel**. These settings allow you to customize the visual experience and optimize performance in real-time.

---

## 🌡️ High-load Alerts
**Description**: Enables specialized visual feedback for containers exceeding CPU thresholds (usually >80%).
**Visual Effect**: 
- The bubble starts to "boil" using high-frequency vertex displacement shaders.
- The shell color pulses with a red/warning tint.
- The bubble physically vibrates using a physics-based jitter.
**Usage**: Recommended to keep ON to quickly identify struggling containers in a large cluster.

## 💧 Liquid RAM
**Description**: Renders a dynamic fluid level inside the container bubbles.
**Visual Effect**: 
- A volumetric 3D liquid level appears, representing the current RAM usage percentage.
- The fluid remains horizontally stable regardless of bubble rotation (simulated gravity).
- Shifts to a bright magenta/red color when memory usage is critical (>90%).
**Usage**: Provides an intuitive way to monitor memory distribution without reading text labels.

## 🔊 Sound Effects
**Description**: Toggles the Web Audio API soundscape for system events.
**Visual Effect**: 
- A distinct "Pop!" sound when a container is removed or stopped.
- Bubble/water sounds when new containers are discovered.
- Subtle UI feedback sounds for interaction.
**Usage**: Great for "Command Center" setups or multi-monitor dashboards.

## 🌙 Night Mode
**Description**: Switches the global environment lighting and backdrop.
**Visual Effect**: 
- Background shifts from a bright gradient to a deep navy/midnight palette.
- Bloom intensity and glowing effects (network lines, orbitals) are enhanced.
- Reduces screen glare in dark environments.

## ☀️ Sky Saturation
**Description**: A slider to control the intensity of the background "Soap Ocean".
**Visual Effect**: 
- Adjusts the opacity and color depth of the CSS background gradient.
- At low values, the background becomes dark and monochromatic, emphasizing the bubbles.
**Usage**: Useful for adapting the dashboard to different ambient lighting conditions.

---

### 💾 Persistence
All settings are stored in the browser's `LocalStorage`. They will persist across sessions but are specific to the device and browser being used.
