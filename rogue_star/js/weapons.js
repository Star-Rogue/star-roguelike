// Weapon Bullet / Fire / Beam types
const WeaponSystem = {
    bullets: [],
    fireParticles: [],
    beams: [],
    ringAngle: 0,
    explosions: [],

    reset() {
        this.bullets = [];
        this.fireParticles = [];
        this.beams = [];
        this.ringAngle = 0;
        this.explosions = [];
    },

    getWeaponConfig(wpId) {
        if (CONFIG.WEAPONS[wpId]) return CONFIG.WEAPONS[wpId];
        if (CONFIG.EVOLUTIONS[wpId]) return CONFIG.EVOLUTIONS[wpId];
        return null;
    },

    getEffectiveStats() {
        const p = G.player;
        const wpId = p.weaponId;
        const isEvolved = wpId in CONFIG.EVOLUTIONS;
        const evoConf = CONFIG.EVOLUTIONS[wpId];
        const baseWp = CONFIG.WEAPONS[p.baseWeaponId] || CONFIG.WEAPONS[wpId];

        let stats = { damage: 0, fireRate: 0, bulletSpeed: 0, bulletSize: 0, bulletLifespan: 2, 
                       range: 0, width: 0, beamWidth: 0, critRate: 0, critMult: 0, bulletCount: 1,
                       lockCount: 3, ringRadius: 100, ringBullets: 6, homingStrength: 0,
                       explosionRadius: 70, explosionDamage: 25, explosionInterval: 0.4 };

        if (isEvolved) {
            if (evoConf.parentId && CONFIG.WEAPONS[evoConf.parentId]) {
                const parent = CONFIG.WEAPONS[evoConf.parentId];
                stats.damage = parent.damage * (evoConf.damageMult || 1);
                stats.fireRate = parent.fireRate * (evoConf.fireRateMult || 1);
                stats.bulletSpeed = parent.bulletSpeed * (evoConf.bulletSpeedMult || 1);
                stats.bulletSize = parent.bulletSize * (evoConf.bulletSizeMult || 1);
                stats.bulletLifespan = parent.bulletLifespan * (evoConf.bulletLifespanMult || 1);
                stats.range = parent.range * (evoConf.rangeMult || 1);
                stats.width = parent.width * (evoConf.widthMult || 1);
                stats.beamWidth = parent.beamWidth * (evoConf.beamWidthMult || 1);
                stats.critRate = evoConf.critRate || parent.critRate || 0;
                stats.critMult = evoConf.critMult || parent.critMult || 0;
                stats.bulletCount = parent.bulletCount * (evoConf.bulletCountMult || 1);
                stats.lockCount = evoConf.lockCount || 3;
                stats.ringRadius = evoConf.ringRadius || 100;
                stats.ringBullets = evoConf.ringBullets || 6;
                stats.homingStrength = evoConf.homingStrength || 0;
                stats.explosionRadius = evoConf.explosionRadius || 70;
                stats.explosionDamage = evoConf.explosionDamage || 25;
                stats.explosionInterval = evoConf.explosionInterval || 0.4;
            }
        } else {
            const wc = CONFIG.WEAPONS[wpId];
            if (!wc) return stats;
            stats.damage = wc.damage;
            stats.fireRate = wc.fireRate;
            stats.bulletSpeed = wc.bulletSpeed;
            stats.bulletSize = wc.bulletSize;
            stats.bulletLifespan = wc.bulletLifespan || 2;
            stats.range = wc.range || 180;
            stats.width = wc.width || 28;
            stats.beamWidth = wc.beamWidth || 4;
            stats.critRate = wc.critRate || 0;
            stats.critMult = wc.critMult || 0;
            stats.bulletCount = wc.bulletCount || 1;
        }

        // Apply affixes
        for (const a of p.affixes) {
            const pool = G.affixLookup[a.id];
            if (!pool) continue;
            const val = a.value;
            switch (a.id) {
                case 'damage': stats.damage += val; break;
                case 'fireRate': stats.fireRate *= (1 + val); break;
                case 'bulletSpeed': stats.bulletSpeed *= (1 + val); break;
                case 'bulletSize': stats.bulletSize += val; break;
                case 'critRate': stats.critRate += val; break;
                case 'critDamage': stats.critMult += val; break;
                case 'pierce': stats.pierce = (stats.pierce || 0) + val; break;
                case 'bulletCount': stats.bulletCount += val; break;
                case 'range': stats.range *= (1 + val); break;
                case 'width': stats.width *= (1 + val); break;
                case 'beamWidth': stats.beamWidth += val; break;
                case 'lockCount': stats.lockCount += val; break;
                case 'explosionSize': stats.explosionRadius *= (1 + val); break;
                case 'moveSpeed': break; // handled in player
            }
        }

        // Over-crit conversion: critRate > 100% → convert to critDamage
        if (stats.critRate > 100) {
            const overflow = stats.critRate - 100;
            stats.critRate = 100;
            stats.critMult += overflow * 0.02; // 1% overflow = +2% crit damage
        }

        stats.critRate = Math.min(stats.critRate, 100);
        stats.bulletCount = Math.max(1, Math.floor(stats.bulletCount));

        return stats;
    },

    getNearestEnemy(sx, sy, maxRange) {
        let nearest = null, nearestDist = maxRange || Infinity;
        const all = [...G.enemies, ...(G.boss ? [G.boss] : [])];
        for (const e of all) {
            if (e.hp <= 0 || e.invuln) continue;
            const d = Math.hypot(e.x - sx, e.y - sy);
            if (d < nearestDist) { nearestDist = d; nearest = e; }
        }
        return nearest;
    },

    getNearestEnemies(sx, sy, count, maxRange) {
        const all = [...G.enemies, ...(G.boss ? [G.boss] : [])].filter(e => e.hp > 0 && !e.invuln);
        all.sort((a, b) => Math.hypot(a.x - sx, a.y - sy) - Math.hypot(b.x - sx, b.y - sy));
        return all.slice(0, count).filter(e => Math.hypot(e.x - sx, e.y - sy) <= (maxRange || Infinity));
    },

    fire(dt) {
        const p = G.player;
        const stats = this.getEffectiveStats();
        const wpId = p.weaponId;
        const isFlamethrower = p.baseWeaponId === 'starfire';
        const isLaser = p.baseWeaponId === 'starlight';
        const isRing = wpId === 'stardust_ring';
        const isHoming = wpId === 'stardust_light';
        const isFury = wpId === 'starfire_fury';
        const isBlaze = wpId === 'starfire_blaze';
        const isStarEye = wpId === 'starlight_eye';
        const isReaper = wpId === 'starlight_reaper';
        const isStardust = p.baseWeaponId === 'stardust';

        // Fire timer
        if (!p.fireTimer) p.fireTimer = 0;
        p.fireTimer += dt;

        const fireInterval = 1 / Math.max(stats.fireRate, 0.1);

        // ─── Ring weapon (continuous rotation) ───
        if (isRing) {
            const ringSpeed = 1.5 + (stats.bulletSpeed / 280) * 1.5;
            this.ringAngle += ringSpeed * dt;
            // Update ring bullet positions
            for (let i = 0; i < this.bullets.length; i++) {
                const b = this.bullets[i];
                if (!b.ringIndex) continue;
                b.x = p.x + Math.cos(this.ringAngle + b.ringAngleOffset) * stats.ringRadius;
                b.y = p.y + Math.sin(this.ringAngle + b.ringAngleOffset) * stats.ringRadius;
                b.life -= dt;
            }
            // Spawn ring bullets if needed
            const ringBullets = Math.max(4, stats.ringBullets || 6);
            const existingRing = this.bullets.filter(b => b.ringIndex !== undefined).length;
            if (existingRing < ringBullets && p.fireTimer >= fireInterval) {
                p.fireTimer -= fireInterval;
                for (let i = existingRing; i < ringBullets; i++) {
                    const aOff = (i / ringBullets) * Math.PI * 2;
                    this.bullets.push({
                        x: p.x + Math.cos(this.ringAngle + aOff) * stats.ringRadius,
                        y: p.y + Math.sin(this.ringAngle + aOff) * stats.ringRadius,
                        ringIndex: i, ringAngleOffset: aOff,
                        damage: stats.damage, size: stats.bulletSize,
                        critRate: stats.critRate, critMult: stats.critMult,
                        color: CONFIG.EVOLUTIONS.stardust_ring.bulletColor,
                        glow: CONFIG.EVOLUTIONS.stardust_ring.bulletGlow,
                        pierce: stats.pierce || 0, life: 5 + stats.bulletLifespan
                    });
                }
            }
            // Clean up expired ring bullets
            this.bullets = this.bullets.filter(b => !b.ringIndex || b.life > 0);
            return;
        }

        // ─── Normal firing ───
        while (p.fireTimer >= fireInterval) {
            p.fireTimer -= fireInterval;

            if (isFlamethrower) {
                // Flamethrower cone
                const dir = this.getAimDirection(p);
                const range = stats.range || 180;
                const width = stats.width || 28;
                // Spawn fire particles
                for (let i = 0; i < 5; i++) {
                    const spread = rand(-width/2, width/2);
                    const dist = rand(10, range);
                    const perpX = -Math.sin(dir) * spread;
                    const perpY = Math.cos(dir) * spread;
                    const fx = p.x + Math.cos(dir) * dist + perpX;
                    const fy = p.y + Math.sin(dir) * dist + perpY;
                    this.fireParticles.push({
                        x: fx, y: fy, life: rand(0.05, 0.15),
                        size: rand(3, 8), alpha: 1,
                        dir: dir, dist: dist, spread: spread
                    });
                }
                // Damage enemies in cone
                this._damageFlameCone(p, dir, range, width, stats, isBlaze);
                // Damage eggs in cone
                if (G.boss && G.boss.eggs) {
                    for (const egg of G.boss.eggs) {
                        if (egg.hp <= 0) continue;
                        const dx = egg.x - p.x, dy = egg.y - p.y;
                        const along = dx * Math.cos(dir) + dy * Math.sin(dir);
                        if (along < 0 || along > range) continue;
                        const perp = -dx * Math.sin(dir) + dy * Math.cos(dir);
                        const halfW = width / 2 + egg.radius;
                        if (Math.abs(perp) > halfW) continue;
                        const falloff = 1 - along / range * 0.5;
                        egg.hp -= stats.damage * falloff * dt * 8;
                    }
                }
            } else if (isLaser) {
                // Laser beam
                const enemies = isStarEye 
                    ? this.getNearestEnemies(p.x, p.y, stats.lockCount, stats.range || 500)
                    : [this.getNearestEnemy(p.x, p.y, stats.range || 500)];
                for (const target of enemies) {
                    if (!target) continue;
                    this.beams.push({
                        x1: p.x, y1: p.y,
                        x2: target.x, y2: target.y,
                        life: 0.1, damage: stats.damage,
                        width: stats.beamWidth || 4,
                        critRate: stats.critRate, critMult: stats.critMult,
                        color: isReaper ? CONFIG.EVOLUTIONS.starlight_reaper.beamColor : 
                               isStarEye ? CONFIG.EVOLUTIONS.starlight_eye.beamColor :
                               CONFIG.WEAPONS.starlight.beamColor,
                        glow: isReaper ? CONFIG.EVOLUTIONS.starlight_reaper.beamGlow :
                               isStarEye ? CONFIG.EVOLUTIONS.starlight_eye.beamGlow :
                               CONFIG.WEAPONS.starlight.beamGlow,
                        target: target
                    });
                    this._hitEnemy(target, stats.damage, stats.critRate, stats.critMult, p.x, p.y);
                }
            } else {
                // Stardust (bullet) weapon
                const targets = isHoming 
                    ? this.getNearestEnemies(p.x, p.y, stats.bulletCount, stats.range || 500)
                    : [this.getNearestEnemy(p.x, p.y, stats.range || 500)];
                
                for (const target of targets) {
                    if (!target) continue;
                    const a = angleBetween(p, target);
                    const bc = stats.bulletCount || 1;
                    const spread = bc > 1 ? 0.15 : 0;
                    const baseA = bc > 1 ? a - spread * (bc - 1) / 2 : a;
                    for (let i = 0; i < bc; i++) {
                        const ba = baseA + spread * i;
                        this.bullets.push({
                            x: p.x, y: p.y,
                            vx: Math.cos(ba) * stats.bulletSpeed,
                            vy: Math.sin(ba) * stats.bulletSpeed,
                            damage: stats.damage, size: stats.bulletSize,
                            critRate: stats.critRate, critMult: stats.critMult,
                            pierce: stats.pierce || 0,
                            homing: isHoming, homingStrength: stats.homingStrength || 8,
                            target: isHoming ? target : null,
                            life: stats.bulletLifespan || 2,
                            color: isHoming ? CONFIG.EVOLUTIONS.stardust_light.bulletColor : CONFIG.WEAPONS.stardust.bulletColor,
                            glow: isHoming ? CONFIG.EVOLUTIONS.stardust_light.bulletGlow : CONFIG.WEAPONS.stardust.bulletGlow,
                            trail: []
                        });
                    }
                }
            }
        }
    },

    getAimDirection(p) {
        const nearest = this.getNearestEnemy(p.x, p.y, 500);
        if (nearest) return angleBetween(p, nearest);
        return 0; // right
    },

    _damageFlameCone(p, dir, range, width, stats, isBlaze) {
        const all = [...G.enemies, ...(G.boss ? [G.boss] : [])];
        for (const e of all) {
            if (e.hp <= 0 || e.invuln) continue;
            const dx = e.x - p.x, dy = e.y - p.y;
            const along = dx * Math.cos(dir) + dy * Math.sin(dir);
            if (along < 0 || along > range) continue;
            const perp = -dx * Math.sin(dir) + dy * Math.cos(dir);
            const halfW = width / 2 + e.radius;
            if (Math.abs(perp) > halfW) continue;
            // Distance-based falloff
            const falloff = 1 - along / range * 0.5;
            const dmg = stats.damage * falloff;
            this._hitEnemy(e, dmg, stats.critRate, stats.critMult, p.x, p.y);
            // Explosion for 星流烈火 at range end
            if (isBlaze && along > range * 0.7) {
                if (!p._lastExplosionTime || G.time - p._lastExplosionTime > stats.explosionInterval) {
                    p._lastExplosionTime = G.time;
                    const ex = p.x + Math.cos(dir) * range;
                    const ey = p.y + Math.sin(dir) * range;
                    this.explosions.push({ x: ex, y: ey, radius: stats.explosionRadius, 
                        life: 0.3, maxLife: 0.3, damage: stats.explosionDamage });
                    for (const e2 of all) {
                        if (e2.hp <= 0 || e2.invuln) continue;
                        if (Math.hypot(e2.x - ex, e2.y - ey) < stats.explosionRadius + e2.radius) {
                            this._hitEnemy(e2, stats.explosionDamage, stats.critRate, stats.critMult, ex, ey);
                        }
                    }
                }
            }
        }
    },

    _hitEnemy(target, baseDmg, critRate, critMult, sx, sy) {
        let isCrit = false;
        let dmg = baseDmg;
        if (critRate > 0 && Math.random() * 100 < critRate) {
            isCrit = true;
            dmg = baseDmg * (1 + critMult);
        }
        
        // Damage over-crit conversion
        if (isCrit && critRate >= 100 && critMult > 1) {
            dmg = baseDmg * (1 + critMult);
        }

        const actualDmg = target.takeDamage(dmg);
        if (actualDmg > 0) {
            // Lifesteal
            let lifeStealPct = 0;
            for (const a of G.player.affixes) {
                if (a.id === 'lifesteal') lifeStealPct += a.value;
            }
            lifeStealPct = Math.min(lifeStealPct, 50);
            if (lifeStealPct > 0) {
                G.player.hp = Math.min(G.player.maxHp, G.player.hp + actualDmg * lifeStealPct / 100);
            }
            // XP
            if (target.hp <= 0 && target.xpValue) {
                G.player.addXP(target.xpValue);
            }
        }

        // Damage number
        if (G.settings.showDamageNumbers) {
            G.ui.damageNumbers.push({
                x: target.x, y: target.y - target.radius - 10,
                vy: -80, life: 1.0, alpha: 1,
                text: Math.floor(actualDmg), isCrit: isCrit
            });
        }
    },

    _hitBoss(target, baseDmg, critRate, critMult) {
        this._hitEnemy(target, baseDmg, critRate, critMult);
    },

    update(dt) {
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (b.ringIndex !== undefined) continue; // ring bullets handled in fire()

            b.life -= dt;
            if (b.life <= 0) { this.bullets.splice(i, 1); continue; }

            // Homing
            if (b.homing) {
                if (b.target && b.target.hp > 0) {
                    const desired = angleBetween(b, b.target);
                    const current = Math.atan2(b.vy, b.vx);
                    const newA = lerpAngle(current, desired, b.homingStrength * dt);
                    const speed = Math.hypot(b.vx, b.vy);
                    b.vx = Math.cos(newA) * speed;
                    b.vy = Math.sin(newA) * speed;
                } else {
                    b.target = this.getNearestEnemy(b.x, b.y, 600);
                }
            }

            b.x += b.vx * dt;
            b.y += b.vy * dt;

            // Trail
            b.trail = b.trail || [];
            b.trail.push({ x: b.x, y: b.y, life: 0.15 });
            for (const t of b.trail) t.life -= dt;
            b.trail = b.trail.filter(t => t.life > 0);

            // Boundary
            const W = G.canvas.width, H = G.canvas.height;
            if (b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
                this.bullets.splice(i, 1); continue;
            }

            // Collision with boss eggs
            if (G.boss && G.boss.eggs) {
                let hitEgg = false;
                for (const egg of G.boss.eggs) {
                    if (egg.hp <= 0) continue;
                    if (collides(b, egg)) {
                        egg.hp -= b.damage;
                        this._spawnBulletImpact(egg.x, egg.y, b.color);
                        if (!b.pierce || b.pierce <= 0) {
                            this.bullets.splice(i, 1);
                            hitEgg = true;
                            break;
                        }
                        b.pierce--;
                    }
                }
                if (hitEgg) continue;
            }

            // Collision
            const all = [...G.enemies, ...(G.boss ? [G.boss] : [])];
            for (const e of all) {
                if (e.hp <= 0) continue;
                if (collides(b, e)) {
                    this._hitEnemy(e, b.damage, b.critRate, b.critMult, b.x, b.y);
                    this._spawnBulletImpact(b.x, b.y, b.color);
                    if (!b.pierce || b.pierce <= 0) {
                        this.bullets.splice(i, 1);
                        break;
                    }
                    b.pierce--;
                }
            }
        }

        // Update fire particles
        for (let i = this.fireParticles.length - 1; i >= 0; i--) {
            const fp = this.fireParticles[i];
            fp.life -= dt;
            fp.alpha = fp.life / 0.15;
            if (fp.life <= 0) { this.fireParticles.splice(i, 1); }
        }

        // Update beams
        for (let i = this.beams.length - 1; i >= 0; i--) {
            const bm = this.beams[i];
            bm.life -= dt;
            if (bm.life <= 0) { this.beams.splice(i, 1); }
        }

        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const ex = this.explosions[i];
            ex.life -= dt;
            if (ex.life <= 0) { this.explosions.splice(i, 1); }
        }
    },

    _spawnBulletImpact(x, y, color) {
        for (let i = 0; i < 3; i++) {
            G.particles.add(x, y, color, rand(20, 60), rand(0.1, 0.25));
        }
    },

    renderBullets(ctx) {
        for (const b of this.bullets) {
            // Trail
            if (b.trail) {
                for (const t of b.trail) {
                    ctx.globalAlpha = t.life / 0.15 * 0.4;
                    ctx.fillStyle = b.glow || b.color;
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, b.size * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
            // Glow
            ctx.shadowColor = b.glow || b.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            ctx.fill();
            // Core
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    renderFlame(ctx) {
        const p = G.player;
        if (p.baseWeaponId !== 'starfire' && this.fireParticles.length === 0) return;
        const dir = this.getAimDirection(p);
        const wpId = p.weaponId;
        let c1 = '#ff6622', c2 = '#ffaa00', c3 = '#ffdd44';
        if (wpId === 'starfire_fury') { c1 = '#4488ff'; c2 = '#66ccff'; c3 = '#ffffff'; }
        if (wpId === 'starfire_blaze') { c1 = '#ff4422'; c2 = '#ff8800'; c3 = '#ffcc00'; }

        // Flame cone gradient
        ctx.save();
        const range = WeaponSystem.getEffectiveStats().range || 180;
        const width = WeaponSystem.getEffectiveStats().width || 28;
        ctx.translate(p.x, p.y);
        ctx.rotate(dir);
        
        // Main flame gradient
        const grad = ctx.createLinearGradient(0, -width/2, 0, width/2);
        grad.addColorStop(0, c1);
        grad.addColorStop(0.5, c2);
        grad.addColorStop(1, c3);
        
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(range, -width/2 * 0.3);
        ctx.lineTo(range * 1.1, 0);
        ctx.lineTo(range, width/2 * 0.3);
        ctx.closePath();
        ctx.fill();

        // Inner core
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(range * 0.7, -width/4 * 0.1);
        ctx.lineTo(range * 0.8, 0);
        ctx.lineTo(range * 0.7, width/4 * 0.1);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.restore();

        // Flame particles in world space
        for (const fp of this.fireParticles) {
            ctx.globalAlpha = fp.alpha * 0.6;
            ctx.fillStyle = fp.size > 5 ? c2 : c3;
            ctx.beginPath();
            ctx.arc(fp.x, fp.y, fp.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    renderBeams(ctx) {
        for (const bm of this.beams) {
            const alpha = bm.life / 0.1;
            // Glow
            ctx.save();
            ctx.globalAlpha = alpha * 0.5;
            ctx.shadowColor = bm.glow;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = bm.glow;
            ctx.lineWidth = bm.width + 4;
            ctx.beginPath();
            ctx.moveTo(bm.x1, bm.y1);
            ctx.lineTo(bm.x2, bm.y2);
            ctx.stroke();
            ctx.restore();

            // Core
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = bm.color;
            ctx.lineWidth = bm.width;
            ctx.beginPath();
            ctx.moveTo(bm.x1, bm.y1);
            ctx.lineTo(bm.x2, bm.y2);
            ctx.stroke();

            // Bright center
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = bm.width * 0.4;
            ctx.beginPath();
            ctx.moveTo(bm.x1, bm.y1);
            ctx.lineTo(bm.x2, bm.y2);
            ctx.stroke();
            ctx.restore();
        }
    },

    renderExplosions(ctx) {
        for (const ex of this.explosions) {
            const t = ex.life / ex.maxLife;
            ctx.globalAlpha = t;
            const grad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.radius * (1 - t));
            grad.addColorStop(0, 'rgba(255,200,50,0.9)');
            grad.addColorStop(0.5, 'rgba(255,100,20,0.5)');
            grad.addColorStop(1, 'rgba(255,50,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(ex.x, ex.y, ex.radius * (1 - t * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
};
