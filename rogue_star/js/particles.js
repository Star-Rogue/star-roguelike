const Particles = {
    particles: [],
    shockwaves: [],
    bigEffects: [],

    reset() {
        this.particles = [];
        this.shockwaves = [];
        this.bigEffects = [];
    },

    add(x, y, color, speed, life) {
        const a = rand(0, Math.PI * 2);
        const s = rand(speed * 0.5, speed);
        this.particles.push({
            x, y,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life, maxLife: life,
            color, size: rand(2, 5)
        });
    },

    addExplosion(x, y, radius, color) {
        for (let i = 0; i < 20; i++) {
            const a = rand(0, Math.PI * 2);
            const s = rand(50, 200);
            this.particles.push({
                x, y,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life: rand(0.3, 0.7), maxLife: 0.7,
                color, size: rand(3, 8)
            });
        }
        this.shockwaves.push({
            x, y, radius: 0, maxRadius: radius,
            life: 0.5, maxLife: 0.5
        });
    },

    addShockwave(x, y, maxRadius, duration, color) {
        this.shockwaves.push({
            x, y, radius: 0, maxRadius, life: duration, maxLife: duration, color
        });
    },

    addBigEffect(x, y, color, text) {
        this.bigEffects.push({ x, y, color, text, life: 1.5, maxLife: 1.5 });
        for (let i = 0; i < 30; i++) {
            const a = rand(0, Math.PI * 2);
            const s = rand(100, 300);
            this.particles.push({
                x, y,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life: rand(0.5, 1.0), maxLife: 1.0,
                color, size: rand(4, 10)
            });
        }
    },

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vx *= 0.98; p.vy *= 0.98;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.life -= dt;
            sw.radius = sw.maxRadius * (1 - sw.life / sw.maxLife);
            if (sw.life <= 0) this.shockwaves.splice(i, 1);
        }
        for (let i = this.bigEffects.length - 1; i >= 0; i--) {
            const be = this.bigEffects[i];
            be.life -= dt;
            if (be.life <= 0) this.bigEffects.splice(i, 1);
        }
    },

    render(ctx) {
        for (const p of this.particles) {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        for (const sw of this.shockwaves) {
            ctx.globalAlpha = sw.life / sw.maxLife * 0.6;
            ctx.strokeStyle = sw.color || '#ff4400';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        for (const be of this.bigEffects) {
            const t = be.life / be.maxLife;
            ctx.globalAlpha = t;
            ctx.fillStyle = be.color;
            ctx.font = `bold ${24 + t * 20}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(be.text, be.x, be.y - t * 40);
        }
        ctx.globalAlpha = 1;
    }
};
