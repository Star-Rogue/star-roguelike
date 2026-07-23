class Boss {
    constructor() {
        const BC = CONFIG.BOSS;
        this.x = G.canvas.width / 2;
        this.y = -100;
        this.entering = true;
        this.radius = BC.radius;
        this.speed = BC.speed;
        this.phase = 1;
        this.maxHp = BC.phase1Hp;
        this.hp = this.maxHp;
        this.contactDamage = BC.contactDamage;
        this.xpValue = 200;
        this.invuln = false;
        this.invulnTimer = 0;
        this.hitFlash = 0;
        this.dead = false;
        this.deathTimer = 0;
        this.wobble = 0;

        // Phase timers
        this.phaseTimer = 0;
        this.summonTimer = 0;
        this.chargeTimer = 0;
        this.eggTimer = 0;
        this.eggs = [];

        // Phase 3 specific
        this.phase3Enraged = false;
        this.phase3Broken = false;
        this.enrageFinished = false;
        this.enrageTimer = 0;
        this.shockwavePhase = 0;
        this.shockwaveTimer = 0;
        this.shockwaveMissiles = [];
        this.vulnerabilityTimer = 0;

        // Charge warning / attack
        this.charging = false;
        this.chargeWarningTimer = 0;
        this.chargeTarget = { x: 0, y: 0 };
        this.chargeDir = { x: 0, y: 0 };
        this.chargeSpeed = 0;

        // Animations
        this.animPhase = 0;
        this.bodySegments = [];
        for (let i = 0; i < 8; i++) {
            this.bodySegments.push({ x: this.x, y: this.y + i * 10, r: this.radius * (1 - i * 0.1) });
        }
    }

    takeDamage(dmg) {
        if (this.hp <= 0 || this.invuln) return 0;
        // Phase 3 enrage damage reduction
        if (this.phase3Enraged && !this.phase3Broken) dmg *= (1 - CONFIG.BOSS.enrageDr);
        if (this.phase3Broken) dmg *= CONFIG.BOSS.vulnerabilityMultiplier;
        const actual = Math.min(dmg, this.hp);
        this.hp -= actual;
        this.hitFlash = 0.08;

        // Check for enrage break
        if (this.phase === 3 && this.phase3Enraged && !this.phase3Broken) {
            const damageDealt = this.maxHp - this.hp;
            if (damageDealt / this.maxHp >= CONFIG.BOSS.enrageBreakPercent) {
                this.phase3Broken = true;
                this.phase3Enraged = false;
                this.enrageFinished = true;
                this.vulnerabilityTimer = CONFIG.BOSS.vulnerabilityDuration;
                G.fx.addBigEffect(this.x, this.y, '#ffff00', 'ENRAGE BROKEN!');
            }
        }

        return actual;
    }

    update(dt) {
        if (this.hp <= 0) {
            this.deathTimer += dt;
            if (this.deathTimer > 1.5) this.dead = true;
            return;
        }

        this.hitFlash = Math.max(0, this.hitFlash - dt);
        this.wobble += dt * 2;
        this.phaseTimer += dt;
        this.vulnerabilityTimer = Math.max(0, this.vulnerabilityTimer - dt);

        // Invulnerability timer
        if (this.invulnTimer > 0) {
            this.invulnTimer -= dt;
            if (this.invulnTimer <= 0) this.invuln = false;
        }

        if (this.entering) {
            this.y += this.speed * dt;
            if (this.y >= 80) { this.y = 80; this.entering = false; }
            return;
        }

        // Phase 3 enrage
        if (this.phase === 3 && this.phase3Enraged && !this.phase3Broken) {
            this.enrageTimer += dt;
            if (this.enrageTimer >= CONFIG.BOSS.enrageMaxTime) {
                this._executeShockwaves(dt);
                return;
            }
            this._moveTowardPlayer(dt, 0.3);
            return;
        }

        if (this.charging) {
            this._updateCharge(dt);
            return;
        }

        if (this.enrageFinished && this.phase === 3) {
            this._moveTowardPlayer(dt, 0.6);
            this.chargeTimer += dt;
            this.summonTimer += dt;
            if (this.summonTimer >= CONFIG.BOSS.summonInterval * 0.7) {
                this.summonTimer -= CONFIG.BOSS.summonInterval * 0.7;
                EnemySystem.spawnAt(this.x, this.y, 4, 0.1);
            }
            if (this.chargeTimer >= CONFIG.BOSS.chargeInterval * 0.7) {
                this.chargeTimer -= CONFIG.BOSS.chargeInterval * 0.7;
                this._startCharge(CONFIG.BOSS.chargeDamagePercent);
            }
            return;
        }

        // Phase-specific behaviors
        if (this.phase === 1) this._updatePhase1(dt);
        else if (this.phase === 2) this._updatePhase2(dt);
        else if (this.phase === 3) this._updatePhase3(dt);

        // General movement: slowly follow player
        this._moveTowardPlayer(dt, 0.5);
    }

    _moveTowardPlayer(dt, factor) {
        const p = G.player;
        const dx = p.x - this.x, dy = p.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d > 0) {
            this.x += dx / d * this.speed * factor * dt;
            this.y += dy / d * this.speed * factor * dt;
        }
        // Clamp to screen
        const W = G.canvas.width, H = G.canvas.height;
        this.x = clamp(this.x, this.radius, W - this.radius);
        this.y = clamp(this.y, this.radius, H - this.radius);
    }

    _updatePhase1(dt) {
        const BC = CONFIG.BOSS;
        this.summonTimer += dt;
        this.chargeTimer += dt;

        // Summon minions
        if (this.summonTimer >= BC.summonInterval) {
            this.summonTimer -= BC.summonInterval;
            const spawns = [];
            for (let i = 0; i < BC.summonCount; i++) {
                const a = (i / BC.summonCount) * Math.PI * 2;
                const sx = this.x + Math.cos(a) * (this.radius + 50);
                const sy = this.y + Math.sin(a) * (this.radius + 50);
                spawns.push({ x: sx, y: sy });
            }
            // Spawn with 10% of boss stats
            for (const s of spawns) {
                const e = new Enemy(s.x, s.y, 0);
                e.maxHp = BC.phase1Hp * 0.1 / BC.summonCount; // split among spawns
                e.hp = e.maxHp;
                G.enemies.push(e);
            }
        }

        // Charge attack
        if (this.chargeTimer >= BC.chargeInterval) {
            this.chargeTimer -= BC.chargeInterval;
            this._startCharge(BC.chargeDamagePercent);
        }
    }

    _updatePhase2(dt) {
        const BC = CONFIG.BOSS;
        this.summonTimer += dt;
        this.chargeTimer += dt;
        this.eggTimer += dt;

        if (this.summonTimer >= BC.summonInterval) {
            this.summonTimer -= BC.summonInterval;
            EnemySystem.spawnAt(this.x, this.y, BC.summonCount, 0.1);
        }

        if (this.chargeTimer >= BC.chargeInterval) {
            this.chargeTimer -= BC.chargeInterval;
            this._startCharge(BC.chargeDamagePercent);
        }

        if (this.eggTimer >= BC.eggInterval) {
            this.eggTimer -= BC.eggInterval;
            this._spawnEggs();
        }

        // Update eggs
        for (let i = this.eggs.length - 1; i >= 0; i--) {
            const egg = this.eggs[i];
            egg.timer -= dt;
            if (egg.hp <= 0) { this.eggs.splice(i, 1); continue; }
            if (egg.timer <= 0) {
                // Explode
                for (const e of G.enemies) {
                    if (Math.hypot(e.x - egg.x, e.y - egg.y) < BC.eggExplosionRadius + e.radius) {
                        e.takeDamage(BC.eggExplosionDamage);
                    }
                }
                const p = G.player;
                if (Math.hypot(p.x - egg.x, p.y - egg.y) < BC.eggExplosionRadius + p.radius) {
                    p.takeDamage(BC.eggExplosionDamage);
                }
                G.fx.addExplosion(egg.x, egg.y, BC.eggExplosionRadius, '#ff4400');
                this.eggs.splice(i, 1);
            }
        }
    }

    _updatePhase3(dt) {
        if (!this.phase3Enraged && !this.phase3Broken && !this.enrageFinished && this.phaseTimer > 3) {
            this._startEnrage();
        }
    }

    _startCharge(dmgPercent) {
        this.charging = true;
        this.chargeWarningTimer = CONFIG.BOSS.chargeWarningTime;
        const p = G.player;
        this.chargeTarget = { x: p.x, y: p.y };
        this.chargeDir = { x: p.x - this.x, y: p.y - this.y };
        const d = Math.hypot(this.chargeDir.x, this.chargeDir.y);
        this.chargeDir.x /= d; this.chargeDir.y /= d;
        this.chargeSpeed = 600;
    }

    _updateCharge(dt) {
        this.chargeWarningTimer -= dt;
        if (this.chargeWarningTimer > 0) return;

        // Charge
        this.x += this.chargeDir.x * this.chargeSpeed * dt;
        this.y += this.chargeDir.y * this.chargeSpeed * dt;

        const W = G.canvas.width, H = G.canvas.height;
        if (this.x < -50 || this.x > W + 50 || this.y < -50 || this.y > H + 50) {
            this.charging = false;
            return;
        }

        // Hit player
        const p = G.player;
        if (collides(this, p)) {
            p.takeDamage(p.maxHp * CONFIG.BOSS.chargeDamagePercent);
            this.charging = false;
        }
    }

    _spawnEggs() {
        const BC = CONFIG.BOSS;
        const p = G.player;
        for (let i = 0; i < BC.eggCount; i++) {
            const a = (i / BC.eggCount) * Math.PI * 2 + rand(-0.2, 0.2);
            const dist = rand(100, 250);
            this.eggs.push({
                x: this.x + Math.cos(a) * dist,
                y: this.y + Math.sin(a) * dist,
                hp: BC.eggHp,
                timer: BC.eggExplosionTime,
                radius: 10
            });
        }
    }

    _startEnrage() {
        this.phase3Enraged = true;
        this.enrageTimer = 0;
        this.shockwaveTimer = 0;
        this.shockwavePhase = 0;
        this.phaseTimer = 0;
    }

    _executeShockwaves(dt) {
        const BC = CONFIG.BOSS;
        if (this.shockwavePhase === 0) {
            this.shockwavePhase = 1;
            this.shockwaveTimer = 0;
            G.fx.addBigEffect(this.x, this.y, '#ff0000', '!!!');
        }
        this.shockwaveTimer += dt;
        while (this.shockwaveTimer >= (this.shockwavePhase < 7 ? BC.shockwaveFastInterval : 2.0) && this.shockwavePhase <= 7) {
            this.shockwaveTimer -= (this.shockwavePhase < 7 ? BC.shockwaveFastInterval : 2.0);
            this._doShockwave(this.shockwavePhase === 7);
            this.shockwavePhase++;
        }
        if (this.shockwavePhase > 7) {
            this.phase3Enraged = false;
            this.enrageFinished = true;
        }
    }

    _doShockwave(isFinal) {
        // Shockwave ring expanding from boss
        G.fx.addShockwave(this.x, this.y, isFinal ? 800 : 300, isFinal ? 2.0 : 0.5, '#ff0000');
        if (isFinal) {
            const p = G.player;
            p.takeDamage(p.maxHp * CONFIG.BOSS.shockwaveDamagePercent);
        }
    }

    changePhase(newPhase) {
        this.phase = newPhase;
        this.invuln = true;
        this.invulnTimer = CONFIG.BOSS.phaseTransitionTime;
        this.phaseTimer = 0;
        this.summonTimer = 0;
        this.chargeTimer = 0;
        this.eggTimer = 0;
        this.charging = false;
        this.eggs = [];
        this.phase3Enraged = false;
        this.phase3Broken = false;
        this.enrageFinished = false;
        
        if (newPhase === 2) {
            this.maxHp = CONFIG.BOSS.phase2Hp;
            this.hp = this.maxHp;
        } else if (newPhase === 3) {
            this.maxHp = CONFIG.BOSS.phase3Hp;
            this.hp = this.maxHp;
        }
        
        G.fx.addBigEffect(this.x, this.y, '#ff00ff', `Phase ${newPhase}!`);
    }

    render(ctx) {
        if (this.hp <= 0) {
            this._renderDeath(ctx);
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Invulnerability shimmer
        if (this.invuln && Math.floor(G.time * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Flashing
        if (this.hitFlash > 0) ctx.fillStyle = '#ffffff';

        // Phase 3 enrage aura
        if (this.phase3Enraged && !this.phase3Broken) {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 30;
        }

        if (this.phase3Broken) {
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 20;
        }

        // Body segments
        for (let i = this.bodySegments.length - 1; i >= 0; i--) {
            const seg = this.bodySegments[i];
            const alpha = 1 - i * 0.1;
            ctx.globalAlpha = this.invuln ? alpha * 0.6 : alpha;
            
            const r = seg.r || (this.radius * (1 - i * 0.12));
            ctx.fillStyle = i === 0 ? '#cc2222' : '#aa1111';
            ctx.beginPath();
            ctx.ellipse(0, i * 12, r, r * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Shell pattern
            ctx.strokeStyle = '#ff444488';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, i * 12, r * 0.7, r * 0.3, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Head (segment 0)
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        const headR = this.radius * 1.1;
        ctx.ellipse(0, 0, headR, headR * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = this.phase === 3 ? '#ff0000' : '#ffff00';
        ctx.shadowColor = this.phase === 3 ? '#ff0000' : '#ffff00';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(-headR * 0.35, -headR * 0.15, headR * 0.25, 0, Math.PI * 2);
        ctx.arc(headR * 0.35, -headR * 0.15, headR * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Mandibles
        ctx.strokeStyle = '#ff6644';
        ctx.lineWidth = 3;
        for (let s = -1; s <= 1; s += 2) {
            ctx.beginPath();
            ctx.moveTo(s * headR * 0.5, headR * 0.3);
            ctx.quadraticCurveTo(s * headR, headR * 0.8, s * headR * 0.7, headR * 1.2);
            ctx.stroke();
        }

        ctx.restore();

        // Phase 3 vulnerability indicator
        if (this.vulnerabilityTimer > 0) {
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(G.time * 8) * 0.2;
            ctx.strokeStyle = '#ff8800';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Boss HP bar at top
        this._renderHpBar(ctx);
    }

    _renderHpBar(ctx) {
        const w = 300, h = 14, x = G.canvas.width / 2 - w / 2, y = 10;
        ctx.fillStyle = '#330000';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = '#111111';
        ctx.fillRect(x, y, w, h);
        const pct = this.hp / this.maxHp;
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0, '#ff0000');
        grad.addColorStop(0.5, '#ff4400');
        grad.addColorStop(1, '#ff8800');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w * pct, h);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('真蛰虫 Phase ' + this.phase + '  ' + Math.floor(pct * 100) + '%', G.canvas.width / 2, y + h - 3);
    }

    _renderDeath(ctx) {
        const t = this.deathTimer / 1.5;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.translate(this.x, this.y);
        const s = 1 + t * 0.5;
        ctx.scale(s, s);
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * (1 - t), 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + t * 3;
            const dist = t * 100;
            G.particles.add(this.x + Math.cos(a) * dist, this.y + Math.sin(a) * dist, '#ff6600', rand(30, 80), rand(0.3, 0.8));
        }
        ctx.restore();
    }
}
