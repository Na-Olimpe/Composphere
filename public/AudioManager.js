/**
 * 🎵 AudioManager Module
 * Uses Web Audio API to synthesize procedural soap bubble sounds.
 * No external files required!
 */
export class AudioManager {
    constructor(settings) {
        this.settings = settings;
        this.ctx = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    /**
     * Synthesizes a "Blup" sound (Underwater bubble)
     */
    playBlup() {
        if (!this.settings.soundsEnabled) return;
        this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // Frequency sweep for the bubble effect
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    /**
     * Synthesizes a "Crystal Pop" sound (Bubble popping)
     */
    playPop() {
        if (!this.settings.soundsEnabled) return;
        this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    /**
     * Synthesizes a "Splash" sound (Opening console)
     */
    playSplash() {
        if (!this.settings.soundsEnabled) return;
        this.init();

        const noise = this.ctx.createBufferSource();
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }

    /**
     * Synthesizes a "Water Drop" sound (Starting a container)
     */
    playDrop() {
        if (!this.settings.soundsEnabled) return;
        this.init();

        const now = this.ctx.currentTime;

        // --- 1. DROP BODY (The 'Plink') ---
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(800, now);
        osc1.frequency.exponentialRampToValueAtTime(1600, now + 0.08); // Sharp pitch upward

        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);

        // --- 2. METALLIC BOUNCE (The 'Tink') ---
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle'; // Triangle provides more overtones (metallic)
        osc2.frequency.setValueAtTime(3200, now); // Very high-pitched beep

        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.05, now + 0.005);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);
    }
}
