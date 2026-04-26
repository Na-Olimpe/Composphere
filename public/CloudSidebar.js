export class CloudSidebar {
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

        // Delegate click events for all buttons in the list
        if (this.list) {
            this.list.addEventListener('click', (e) => {
                const target = e.target;
                
                // Ignore clicks if they are not action buttons
                if (!target.classList.contains('btn-action')) return;

                const action = target.dataset.action;
                const id = target.dataset.id;
                const name = target.dataset.name;

                if (action === 'rm') {
                    if (confirm(`🧨 Are you absolutely sure you want to POP and remove [${name}]? This action cannot be undone.`)) {
                        this.dispatchAction(action, id);
                    }
                } else {
                    this.dispatchAction(action, id);
                }
            });
        }
    }

    // Notify the main application (app_3d.js) about the user action
    dispatchAction(action, id) {
        const event = new CustomEvent('sidebarAction', { detail: { action, id } });
        document.dispatchEvent(event);
    }

    // Update HTML content from incoming data
    updateData(containersData) {
        if (!this.list) return;

        let sidebarHtml = '';

        containersData.forEach(c => {
            let name = c.Names && c.Names[0] ? c.Names[0].replace('/', '') : 'Unknown';
            const isRunning = c.State === 'running';
            const isSelf = c.Labels && c.Labels['composphere.core'] === 'true';
            
            // Visual rebranding for internal services
            if (isSelf) {
                name = 'Composphere';
            }
            
            let actionButtons = '';
            if (isSelf) {
                actionButtons = `
                    <button class="btn-action btn-restart" data-action="restart" data-id="${c.Id}">RESTART</button>
                `;
            } else {
                const controlBtn = isRunning 
                    ? `<button class="btn-action btn-stop" data-action="stop" data-id="${c.Id}">STOP</button>`
                    : `<button class="btn-action btn-start" data-action="start" data-id="${c.Id}">START</button>`;
                
                actionButtons = `
                    ${controlBtn}
                    <button class="btn-action btn-rm" data-action="rm" data-id="${c.Id}" data-name="${name}">RM</button>
                `;
            }

            sidebarHtml += `
                <div class="list-item ${isSelf ? 'item-self' : ''}">
                    <div class="item-info">
                        <span class="item-name">${isSelf ? '🛡️' : '🫧'} ${name}</span>
                        <span class="item-status">
                            <span class="status-dot ${isRunning ? 'running' : 'exited'}"></span>
                            ${c.State} (${c.cpu_usage || '0%'})
                        </span>
                    </div>
                    <div class="item-actions">
                        ${actionButtons}
                    </div>
                </div>
            `;
        });

        this.list.innerHTML = sidebarHtml;
    }
}
