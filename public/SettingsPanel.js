/**
 * 🛠️ SettingsPanel Module
 * Handles UI preferences, local storage, and real-time visual adjustments.
 */
export class SettingsPanel {
    constructor() {
        this.toggleBtn = document.getElementById('settings-toggle');
        this.panel = document.getElementById('settings-panel');
        this.alertToggle = document.getElementById('alert-toggle');
        this.liquidToggle = document.getElementById('liquid-toggle');
        this.skySlider = document.getElementById('sky-brightness');

        // Load persisted values
        this.alertsEnabled = localStorage.getItem('cp_alerts') !== 'false';
        this.liquidEnabled = localStorage.getItem('cp_liquid') === 'true'; // OFF by default
        this.soundsEnabled = localStorage.getItem('cp_sounds') === 'true'; // OFF by default
        this.nightModeEnabled = localStorage.getItem('cp_night') === 'true'; // OFF by default
        this.skySaturation = parseFloat(localStorage.getItem('cp_sky')) || 30;

        this.init();
    }

    init() {
        if (!this.toggleBtn) return;
        
        // Toggle panel visibility
        this.toggleBtn.addEventListener('click', () => {
            this.panel.classList.toggle('open');
        });

        // High-load alerts toggle logic
        this.alertToggle.checked = this.alertsEnabled;
        this.alertToggle.addEventListener('change', (e) => {
            this.alertsEnabled = e.target.checked;
            localStorage.setItem('cp_alerts', this.alertsEnabled);
        });

        // Liquid RAM toggle logic
        if (this.liquidToggle) {
            this.liquidToggle.checked = this.liquidEnabled;
            this.liquidToggle.addEventListener('change', (e) => {
                this.liquidEnabled = e.target.checked;
                localStorage.setItem('cp_liquid', this.liquidEnabled);
            });
        }

        // Sounds toggle logic
        this.soundToggle = document.getElementById('sound-toggle');
        if (this.soundToggle) {
            this.soundToggle.checked = this.soundsEnabled;
            this.soundToggle.addEventListener('change', (e) => {
                this.soundsEnabled = e.target.checked;
                localStorage.setItem('cp_sounds', this.soundsEnabled);
            });
        }

        // Night Mode toggle logic
        this.nightToggle = document.getElementById('night-toggle');
        if (this.nightToggle) {
            this.nightToggle.checked = this.nightModeEnabled;
            this.nightToggle.addEventListener('change', (e) => {
                this.nightModeEnabled = e.target.checked;
                localStorage.setItem('cp_night', this.nightModeEnabled);
            });
        }

        // Sky brightness slider logic
        this.skySlider.value = this.skySaturation;
        this.skySlider.addEventListener('input', (e) => {
            this.skySaturation = e.target.value;
            this.applySkySettings();
            localStorage.setItem('cp_sky', this.skySaturation);
        });

        // Initial apply
        this.applySkySettings();
        
        // Close when clicking outside
        window.addEventListener('mousedown', (e) => {
            if (this.panel.classList.contains('open') && 
                !this.panel.contains(e.target) && 
                !this.toggleBtn.contains(e.target)) {
                this.panel.classList.remove('open');
            }
        });
    }

    applySkySettings() {
        // Apply non-linear formula (power 0.6) 
        // to make brightness increase faster at the beginning of the slider.
        const val = this.skySaturation;
        const nwAlpha = Math.pow(val / 100, 0.6).toFixed(2);
        const seAlpha = (val / 300).toFixed(2);
        document.documentElement.style.setProperty('--sky-alpha-nw', nwAlpha);
        document.documentElement.style.setProperty('--sky-alpha-se', seAlpha);
        document.documentElement.style.setProperty('--sky-val', val);
        localStorage.setItem('cp_sky', val);
    }
}
