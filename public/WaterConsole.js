import { TerminalManager } from './TerminalManager.js';

export class WaterConsole {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.titleEl = document.getElementById('console-title-text');
        this.logsEl = document.getElementById('console-logs');
        this.closeBtn = document.querySelector('.close-console');
        this.contentWrap = document.getElementById('console-content');
        this.tabLogs = document.getElementById('tab-logs');
        this.tabTerminal = document.getElementById('tab-terminal');
        
        this.currentContainerId = null;
        this.currentContainerName = '';
        this.showLogs = true;
        this.showTerminal = false;
        this.audioManager = null;

        // Initialize Terminal Manager
        this.terminal = new TerminalManager('terminal-container', (id, data) => {
            if (window.sendTerminalInput) {
                window.sendTerminalInput(id, data);
            }
        });

        this.closeBtn.addEventListener('click', () => this.hide());

        this.tabLogs.addEventListener('click', () => {
            this.showLogs = !this.showLogs;
            if (!this.showLogs && !this.showTerminal) this.showTerminal = true;
            this.updateLayout();
        });

        this.tabTerminal.addEventListener('click', () => {
            this.showTerminal = !this.showTerminal;
            if (!this.showLogs && !this.showTerminal) this.showLogs = true;
            this.updateLayout();
            if (this.showTerminal) {
                this.terminal.openSession(this.currentContainerId, this.currentContainerName);
                this.terminal.fit();
            }
        });
        
        this.updateLayout();
    }

    setAudioManager(am) {
        this.audioManager = am;
    }

    updateLayout() {
        this.tabLogs.classList.toggle('active', this.showLogs);
        this.tabTerminal.classList.toggle('active', this.showTerminal);
        
        this.contentWrap.className = '';
        if (this.showLogs && this.showTerminal) {
            this.contentWrap.classList.add('show-both');
        } else if (this.showLogs) {
            this.contentWrap.classList.add('show-logs-only');
        } else if (this.showTerminal) {
            this.contentWrap.classList.add('show-terminal-only');
        }

        if (this.showTerminal) {
            this.terminal.fit();
        }
    }

    show(containerId, containerName, logsText) {
        this.currentContainerId = containerId;
        this.currentContainerName = containerName;
        this.titleEl.innerText = `🌊 Diving into: ${containerName}`;
        if (logsText !== null) {
            this.logsEl.innerText = logsText;
        }
        this.container.classList.add('open');
        
        if (this.audioManager) {
            this.audioManager.playSplash();
        }

        if (this.showTerminal) {
            this.terminal.openSession(containerId, containerName);
        }

        setTimeout(() => {
            this.logsEl.scrollTop = this.logsEl.scrollHeight;
            if (this.showTerminal) this.terminal.fit();
        }, 600);
    }
    
    writeTerminal(text) {
        this.terminal.write(text);
    }

    hide() {
        this.container.classList.remove('open');
    }
}
