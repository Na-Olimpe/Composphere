/**
 * 📟 TerminalManager Module
 * Wrapper for Xterm.js to handle interactive docker terminal sessions.
 */
export class TerminalManager {
    constructor(containerId, onData) {
        this.container = document.getElementById(containerId);
        this.onData = onData; // Callback to send data to server
        this.term = null;
        this.fitAddon = null;
        this.activeId = null;
    }

    init() {
        if (this.term) return;

        // Create terminal instance
        this.term = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: "'Consolas', 'Courier New', monospace",
            theme: {
                background: '#0c0c0c',
                foreground: '#00ff00',
                cursor: '#00b4d8'
            },
            allowProposedApi: true
        });

        // Add fit addon to handle resizing
        this.fitAddon = new window.FitAddon.FitAddon();
        this.term.loadAddon(this.fitAddon);

        // Render terminal
        this.term.open(this.container);
        this.fitAddon.fit();

        // Handle user input
        this.term.onData(data => {
            if (this.activeId && this.onData) {
                this.onData(this.activeId, data);
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.fitAddon.fit();
        });
    }

    /**
     * Start/Reset session for a specific container
     */
    openSession(containerId, containerName) {
        this.activeId = containerId;
        this.init();
        
        this.term.reset();
        this.term.write(`\x1b[1;34m🌊 Diving into: ${containerName}\x1b[0m\r\n`);
        this.term.write(`\x1b[32mInteractive terminal ready.\x1b[0m\r\n\r\n`);
        
        // Let the server know we want a terminal session
        this.onData(containerId, '\r'); // Just a trigger to start TTY
    }

    /**
     * Write data coming from the server
     */
    write(data) {
        if (this.term) {
            this.term.write(data);
        }
    }

    fit() {
        if (this.fitAddon) {
            setTimeout(() => this.fitAddon.fit(), 100);
        }
    }
}
