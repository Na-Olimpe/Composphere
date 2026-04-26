export class SunSidebar {
    constructor(sidebarId, toggleId, listId) {
        this.sidebar = document.getElementById(sidebarId);
        this.toggle = document.getElementById(toggleId);
        this.list = document.getElementById(listId);

        // Toggle sidebar visibility
        if (this.toggle) {
            this.toggle.addEventListener('click', () => {
                this.sidebar.classList.toggle('open');
            });
        }
    }

    // Method to update HTML with container statistics
    updateData(containersData) {
        if (!this.list) return;

        let html = '';

        // Sort containers: active first, then calculate cpu load
        const sorted = [...containersData].sort((a, b) => {
            const isRunningA = a.State === 'running';
            const isRunningB = b.State === 'running';
            
            // Running containers to the top
            if (isRunningA && !isRunningB) return -1;
            if (!isRunningA && isRunningB) return 1;

            // Sort by CPU usage for the same status (heaviest at the top)
            const cpuA = parseFloat(a.cpu_usage || "0");
            const cpuB = parseFloat(b.cpu_usage || "0");
            return cpuB - cpuA;
        });

        sorted.forEach(c => {
            const name = c.Names && c.Names[0] ? c.Names[0].replace('/', '') : 'Unknown';
            const isRunning = c.State === 'running';
            const cpu = c.cpu_usage || '0.0%';
            const icon = isRunning ? '☀️' : '🌑';
            
            // Format network speed
            let net = c.net_speed || 0;
            if (net > 1024) {
                net = (net / 1024).toFixed(2) + ' MB/s';
            } else {
                net = net + ' KB/s';
            }

            const isActive = isRunning;
            const rowClass = isActive ? 'sun-row active' : 'sun-row offline';
            const statusText = isActive ? 'Active' : 'Offline';

            let ramPercent = '0%';
            let ramDetail = '0 MB / 0 MB';
            let ramClass = 'ram-normal';
            if (c.ram_stats) {
                const percent = parseFloat(c.ram_stats.percent) || 0;
                ramPercent = `${percent}%`;
                ramDetail = `${c.ram_stats.usage_mb}M / ${c.ram_stats.limit_mb}M`;
                ramClass = percent > 80 ? 'ram-critical' : 'ram-normal';
            }

            html += `
                <div class="list-item ${rowClass}">
                    <div class="item-info-wrapper">
                        <div class="sun-header">
                            <span class="sun-name">${icon} ${name}</span>
                            <span class="sun-status">${statusText}</span>
                        </div>
                        <div class="sun-stats">
                            <div class="sun-stats-row cpu-net">
                                <span>CPU: <span class="cpu-val">${cpu}</span></span>
                                <span>Net: <span class="net-val">${net}</span></span>
                            </div>
                            <div class="sun-stats-row ram">
                                <span>RAM: <strong class="${ramClass}">${ramPercent}</strong></span>
                                <span class="${ramClass}">${ramDetail}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        this.list.innerHTML = html;
    }
}
