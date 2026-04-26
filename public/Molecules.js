export class Particle {
    constructor(startX, startY, targetX, targetY, speedMultiplier) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;

        let baseSpeed = 0.015;
        this.progressSpeed = baseSpeed + (speedMultiplier * 0.002);
        this.progressSpeed = Math.min(this.progressSpeed, 0.08);
        this.progress = 0;
        this.size = Math.random() * 2 + 1;
    }

    update(startX, startY, targetX, targetY) {
        this.targetX = targetX;
        this.targetY = targetY;
        this.x = startX;
        this.y = startY;
        this.progress += this.progressSpeed;
        return this.progress >= 1;
    }

    draw(ctx) {
        let currentX = this.x + (this.targetX - this.x) * this.progress;
        let currentY = this.y + (this.targetY - this.y) * this.progress;
        ctx.beginPath();
        ctx.fillStyle = `rgba(100, 180, 255, ${2.1 - (this.progress * 0.5)})`;
        ctx.arc(currentX, currentY, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

export class MoleculesEngine {
    constructor(ctx) {
        this.ctx = ctx;
        this.particles = [];
    }

    drawNetworks(bubbles) {
        bubbles.forEach((b1, i) => {
            bubbles.forEach((b2, j) => {
                if (i >= j || b1.isPoping || b2.isPoping) return;

                let isSignificantNet = false;
                if (b1.networks && b2.networks) {
                    isSignificantNet = b1.networks.some(net =>
                        b2.networks.includes(net) && net !== 'bridge' && net !== 'host'
                    );
                }

                if (isSignificantNet) {
                    let grad = this.ctx.createLinearGradient(b1.x, b1.y, b2.x, b2.y);
                    grad.addColorStop(0, 'rgba(100, 180, 255, 0.15)');
                    grad.addColorStop(0.5, 'rgba(100, 180, 255, 0.02)');
                    grad.addColorStop(1, 'rgba(100, 180, 255, 0.25)');
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = grad;
                    this.ctx.lineWidth = 9.0;
                    this.ctx.moveTo(b1.x, b1.y);
                    this.ctx.lineTo(b2.x, b2.y);
                    this.ctx.stroke();

                    let combinedSpeed = b1.netSpeed + b2.netSpeed;
                    if (Math.random() < 0.02 + (combinedSpeed * 0.05)) {
                        this.particles.push({ p: new Particle(b1.x, b1.y, b2.x, b2.y, combinedSpeed), source: b1, target: b2 });
                        this.particles.push({ p: new Particle(b2.x, b2.y, b1.x, b1.y, combinedSpeed), source: b2, target: b1 });
                    }
                }
            });
        });

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let pObj = this.particles[i];
            let isDone = pObj.p.update(pObj.source.x, pObj.source.y, pObj.target.x, pObj.target.y);
            pObj.p.draw(this.ctx);
            if (isDone) this.particles.splice(i, 1);
        }
    }

    getGroupHue(projectName) {
        let hash = 0;
        for (let i = 0; i < projectName.length; i++) {
            hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return ((hash % 360) + 360) % 360;
    }

    drawMolecules(bubbles, elapsedTime) {
        const groups = {};
        bubbles.forEach(b => {
            if (!b.composeProject || b.isPoping) return;
            if (!groups[b.composeProject]) groups[b.composeProject] = [];
            groups[b.composeProject].push(b);
        });

        Object.entries(groups).forEach(([project, members]) => {
            if (members.length < 1) return;
            const hue = this.getGroupHue(project);

            // Draw bonds
            for (let i = 0; i < members.length; i++) {
                for (let j = i + 1; j < members.length; j++) {
                    const b1 = members[i];
                    const b2 = members[j];

                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.moveTo(b1.x, b1.y);
                    this.ctx.lineTo(b2.x, b2.y);
                    this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.12)`;
                    this.ctx.lineWidth = 14;
                    this.ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
                    this.ctx.shadowBlur = 24;
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.moveTo(b1.x, b1.y);
                    this.ctx.lineTo(b2.x, b2.y);
                    this.ctx.strokeStyle = `hsla(${hue}, 90%, 75%, 0.4)`;
                    this.ctx.lineWidth = 5;
                    this.ctx.shadowBlur = 14;
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.moveTo(b1.x, b1.y);
                    this.ctx.lineTo(b2.x, b2.y);
                    this.ctx.strokeStyle = `hsla(${hue}, 100%, 92%, 0.75)`;
                    this.ctx.lineWidth = 1.5;
                    this.ctx.shadowBlur = 6;
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }

            // Rings removed as they didn't match the dynamic bubble deformation


            // Draw label
            const cx = members.reduce((s, b) => s + b.x, 0) / members.length;
            const minY = Math.min(...members.map(b => b.y - b.radius));
            this.ctx.save();
            this.ctx.font = 'bold 11px monospace';
            this.ctx.textAlign = 'center';

            const labelText = `⬡ ${project}`;
            const textMetrics = this.ctx.measureText(labelText);
            const padX = 8;
            const padY = 4;
            const badgeW = textMetrics.width + padX * 2;
            const badgeH = 18;
            const badgeX = cx - badgeW / 2;
            const badgeY = minY - 26;

            this.ctx.shadowColor = `hsl(${hue}, 80%, 50%)`;
            this.ctx.shadowBlur = 12;
            this.ctx.fillStyle = `hsla(${hue}, 70%, 30%, 0.82)`;
            this.ctx.beginPath();
            this.ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
            this.ctx.fill();

            this.ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.7)`;
            this.ctx.lineWidth = 1;
            this.ctx.shadowBlur = 0;
            this.ctx.stroke();

            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            this.ctx.fillText(labelText, cx, badgeY + badgeH - padY - 1);
            this.ctx.restore();
        });
    }
}
