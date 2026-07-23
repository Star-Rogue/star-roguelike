const UI = {
    damageNumbers: [],
    levelUpOptions: [],
    evolutionOptions: [],
    showLevelUpScreen: false,
    showEvolutionScreen: false,
    showSettingsScreen: false,
    showWeaponSelect: false,
    showGameOverScreen: false,
    showStartScreen: true,

    // Mobile UI elements
    notificationText: '',
    notificationTimer: 0,

    reset() {
        this.damageNumbers = [];
        this.levelUpOptions = [];
        this.evolutionOptions = [];
        this.showLevelUpScreen = false;
        this.showEvolutionScreen = false;
        this.showSettingsScreen = false;
        this.showWeaponSelect = true;
        this.showGameOverScreen = false;
        this.notificationText = '';
        this.notificationTimer = 0;
    },

    render(ctx) {
        if (G.player.hp > 0) this._renderHUD(ctx);
        this._renderDamageNumbers(ctx);
        if (this.showLevelUpScreen) this._renderLevelUp(ctx);
        if (this.showEvolutionScreen) this._renderEvolution(ctx);
        if (this.showSettingsScreen) this._renderSettings(ctx);
        if (this.showWeaponSelect) this._renderWeaponSelect(ctx);
        if (this.showGameOverScreen) this._renderGameOver(ctx);
        this._renderNotification(ctx);
        if (Input.isMobile) this._renderJoystick(ctx);
    },

    _renderHUD(ctx) {
        const p = G.player;
        const W = G.canvas.width, H = G.canvas.height;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';

        // Level and XP
        const lvText = `Lv.${p.level}  ${p.weaponName || ''}`;
        ctx.fillText(lvText, 10, 25);
        
        // XP bar
        const xpW = 150, xpH = 8, xpX = 10, xpY = 38;
        ctx.fillStyle = '#222244';
        ctx.fillRect(xpX, xpY, xpW, xpH);
        const xpPct = p.xp / p.xpToNext;
        ctx.fillStyle = '#44aaff';
        ctx.fillRect(xpX, xpY, xpW * xpPct, xpH);
        ctx.strokeStyle = '#6688cc';
        ctx.lineWidth = 1;
        ctx.strokeRect(xpX, xpY, xpW, xpH);
        ctx.fillStyle = '#aaaacc';
        ctx.font = '9px monospace';
        ctx.fillText(`${Math.floor(p.xp)} / ${p.xpToNext}`, xpX + 2, xpY + xpH - 1);

        // Timer
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(formatTime(G.time), W / 2, 25);

        // Boss timer
        const bossInterval = CONFIG.BOSS.spawnInterval;
        const nextBoss = bossInterval - (G.time % bossInterval);
        ctx.font = '11px monospace';
        ctx.fillStyle = '#ffaa44';
        ctx.fillText(`BOSS: ${formatTime(nextBoss)}`, W / 2, 45);

        // Kill count
        ctx.fillText(`Kills: ${G.kills}`, W / 2, 62);

        // HP bottom-left
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        const hpText = `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
        ctx.fillText('HP', 10, H - 40);
        const hpW = 120, hpH = 12;
        ctx.fillStyle = '#330000';
        ctx.fillRect(10, H - 30, hpW, hpH);
        const hpPct = p.hp / p.maxHp;
        const hpGrad = ctx.createLinearGradient(10, 0, 10 + hpW, 0);
        hpGrad.addColorStop(0, '#ff3333');
        hpGrad.addColorStop(0.5, '#ffaa00');
        hpGrad.addColorStop(1, '#44ff44');
        ctx.fillStyle = hpGrad;
        ctx.fillRect(10, H - 30, hpW * hpPct, hpH);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(hpText, 15, H - 30 + hpH - 2);

        // Weapon info
        const wpConf = WeaponSystem.getWeaponConfig(p.weaponId);
        if (wpConf) {
            ctx.fillStyle = '#aaaacc';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`[${wpConf.name}]`, W - 10, H - 10);
        }

        // Settings button (top right)
        const gearX = W - 30, gearY = 20, gearR = 16;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(gearX, gearY, gearR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gearX, gearY, gearR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚙', gearX, gearY + 6);

        // Affix list bottom-right
        ctx.textAlign = 'right';
        let ay = H - 50;
        ctx.font = '9px monospace';
        const shown = p.affixes.slice(-8);
        for (const a of shown) {
            const rInfo = CONFIG.RARITY_COLORS[a.rarity];
            ctx.fillStyle = rInfo.color;
            const valStr = a.pct ? `+${Math.floor(a.value * 100)}%` : `+${Math.floor(a.value)}`;
            ctx.fillText(`${a.icon || ''}${a.label} ${valStr}`, W - 10, ay);
            ay -= 16;
        }

        ctx.textAlign = 'left';
    },

    _renderDamageNumbers(ctx) {
        for (const dn of this.damageNumbers) {
            ctx.save();
            ctx.globalAlpha = dn.alpha;
            ctx.font = `bold ${dn.isCrit ? 18 : 13}px monospace`;
            ctx.textAlign = 'center';
            if (dn.isCrit) {
                ctx.fillStyle = '#ffcc00';
                ctx.shadowColor = '#ff8800';
                ctx.shadowBlur = 8;
                ctx.fillText('⚡' + dn.text, dn.x, dn.y);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 3;
                ctx.fillText(dn.text, dn.x, dn.y);
            }
            ctx.restore();
        }
    },

    showLevelUp() {
        G.paused = true;
        this.showLevelUpScreen = true;
        this.levelUpOptions = this._generateAffixOptions();
        if (this.levelUpOptions.length === 0) {
            // No valid affixes available
            this.showLevelUpScreen = false;
            G.paused = false;
        }
    },

    showEvolution() {
        G.paused = true;
        this.showEvolutionScreen = true;
        const baseId = G.player.baseWeaponId;
        let evoIds = [];
        if (baseId === 'stardust') evoIds = ['stardust_light', 'stardust_ring'];
        else if (baseId === 'starfire') evoIds = ['starfire_fury', 'starfire_blaze'];
        else if (baseId === 'starlight') evoIds = ['starlight_eye', 'starlight_reaper'];
        this.evolutionOptions = evoIds.map(id => ({
            id,
            conf: CONFIG.EVOLUTIONS[id]
        }));
    },

    _generateAffixOptions() {
        const poolKey = G.player.weaponId;
        const pool = CONFIG.AFFIX_POOLS[poolKey];
        if (!pool) return [];

        const keys = Object.keys(pool);
        const picked = [];
        const used = new Set();
        while (picked.length < 4 && used.size < keys.length * 2) {
            const key = keys[randInt(0, keys.length - 1)];
            if (used.has(key) && picked.length > 0) { used.add(key); continue; }
            used.add(key);
            const def = pool[key];
            
            // Check lifesteal cap
            if (key === 'lifesteal' && def.cap && G.player.totalLifesteal >= def.cap) continue;
            if (key === 'lifesteal' && def.whiteOnly) {
                picked.push({ id: key, rarity: 'white', def });
            } else {
                const rarity = rollRarity();
                picked.push({ id: key, rarity, def });
            }
        }
        return picked;
    },

    selectAffix(option) {
        G.player.applyAffix(option.id, option.rarity);
        this.showLevelUpScreen = false;
        G.paused = false;
        G.player.continueAfterChoice();
    },

    selectEvolution(evoId) {
        G.player.evolve(evoId);
        this.showEvolutionScreen = false;
    },

    selectWeapon(wpId) {
        G.startGame(wpId);
        this.showWeaponSelect = false;
        this.showStartScreen = false;
    },

    handleTap(sx, sy) {
        const W = G.canvas.width, H = G.canvas.height;

        // Settings gear button
        const gearX = W - 30, gearY = 20;
        if (Math.hypot(sx - gearX, sy - gearY) < 22) {
            this.showSettingsScreen = !this.showSettingsScreen;
            G.paused = this.showSettingsScreen;
            return;
        }

        if (this.showSettingsScreen) {
            this._handleSettingsTap(sx, sy);
            return;
        }

        if (this.showLevelUpScreen) {
            this._handleLevelUpTap(sx, sy);
            return;
        }

        if (this.showEvolutionScreen) {
            this._handleEvolutionTap(sx, sy);
            return;
        }

        if (this.showWeaponSelect) {
            this._handleWeaponSelectTap(sx, sy);
            return;
        }

        if (this.showGameOverScreen) {
            G.restartGame();
            return;
        }
    },

    _handleLevelUpTap(sx, sy) {
        const W = G.canvas.width, H = G.canvas.height;
        const cardW = W - 80, cardH = 52, startY = H / 2 - 140, gap = 10;
        for (let i = 0; i < this.levelUpOptions.length; i++) {
            const cy = startY + i * (cardH + gap);
            if (sx > 40 && sx < W - 40 && sy > cy && sy < cy + cardH) {
                this.selectAffix(this.levelUpOptions[i]);
                return;
            }
        }
    },

    _handleEvolutionTap(sx, sy) {
        const W = G.canvas.width, H = G.canvas.height;
        const cardW = 300, cardH = 180, gap = 30;
        const totalW = cardW * 2 + gap;
        const startX = W / 2 - totalW / 2;
        const cy = H / 2 - cardH / 2;
        for (let i = 0; i < this.evolutionOptions.length; i++) {
            const cx = startX + i * (cardW + gap);
            if (sx > cx && sx < cx + cardW && sy > cy && sy < cy + cardH) {
                this.selectEvolution(this.evolutionOptions[i].id);
                return;
            }
        }
    },

    _handleWeaponSelectTap(sx, sy) {
        const W = G.canvas.width, H = G.canvas.height;
        const cardW = 240, cardH = 200, gap = 20;
        const wpKeys = ['stardust', 'starfire', 'starlight'];
        const totalW = cardW * 3 + gap * 2;
        const startX = W / 2 - totalW / 2;
        const cy = H / 2 - cardH / 2;
        for (let i = 0; i < wpKeys.length; i++) {
            const cx = startX + i * (cardW + gap);
            if (sx > cx && sx < cx + cardW && sy > cy && sy < cy + cardH) {
                this.selectWeapon(wpKeys[i]);
                return;
            }
        }
    },

    _handleSettingsTap(sx, sy) {
        const W = G.canvas.width, H = G.canvas.height;
        const bx = W / 2 - 150, by = H / 2 - 80;

        // Damage numbers toggle
        if (sx > bx && sx < bx + 300 && sy > by + 10 && sy < by + 50) {
            G.settings.showDamageNumbers = !G.settings.showDamageNumbers;
        }
        // Enemy HP toggle
        if (sx > bx && sx < bx + 300 && sy > by + 60 && sy < by + 100) {
            G.settings.showEnemyHp = !G.settings.showEnemyHp;
        }
        // Close
        if (sx > W / 2 + 130 && sx < W / 2 + 150 && sy > by - 5 && sy < by + 25) {
            this.showSettingsScreen = false;
            G.paused = false;
        }
    },

    _renderStartScreen(ctx) {
        const W = G.canvas.width, H = G.canvas.height;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('星际游侠', W/2, H/2 - 80);
        ctx.font = '16px monospace';
        ctx.fillStyle = '#aaaacc';
        ctx.fillText('选择初始武器开始游戏', W/2, H/2 - 40);
        ctx.fillText('移动: WASD / 方向键 / 触屏摇杆', W/2, H - 40);
        ctx.textAlign = 'left';
    },

    _renderWeaponSelect(ctx) {
        const W = G.canvas.width, H = G.canvas.height;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px monospace';
        ctx.fillText('◆ 选择初始武器 ◆', W / 2, H / 2 - 160);

        const wpKeys = ['stardust', 'starfire', 'starlight'];
        const cardW = 220, cardH = 200, gap = 20;
        const totalW = cardW * 3 + gap * 2;
        const startX = W / 2 - totalW / 2;
        const cy = H / 2 - cardH / 2 + 10;

        for (let i = 0; i < wpKeys.length; i++) {
            const cx = startX + i * (cardW + gap);
            const wp = CONFIG.WEAPONS[wpKeys[i]];
            this._drawCard(ctx, cx, cy, cardW, cardH, wp.name, wp.description, wp.bulletColor || wp.flameColor1 || wp.beamColor, false);
        }

        ctx.textAlign = 'left';
    },

    _renderLevelUp(ctx) {
        const W = G.canvas.width, H = G.canvas.height;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('✦ 升级！选择一个词条 ✦', W / 2, H / 2 - 170);

        const cardW = W - 80, cardH = 52, startY = H / 2 - 140, gap = 10;
        for (let i = 0; i < this.levelUpOptions.length; i++) {
            const cy = startY + i * (cardH + gap);
            const opt = this.levelUpOptions[i];
            this._drawAffixCard(ctx, 40, cy, cardW, cardH, opt);
        }

        ctx.textAlign = 'left';
    },

    _renderEvolution(ctx) {
        const W = G.canvas.width, H = G.canvas.height;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 26px monospace';
        ctx.fillText('⚡ 选择进化方向 ⚡', W / 2, 60);
        ctx.font = '12px monospace';
        ctx.fillStyle = '#ff8844';
        ctx.fillText('（永久替换当前武器）', W / 2, 85);

        const cardW = Math.min(300, (W - 80) / 2), cardH = 200, gap = 30;
        const totalW = cardW * 2 + gap;
        const startX = W / 2 - totalW / 2;
        const cy = H / 2 - cardH / 2 + 20;

        for (let i = 0; i < this.evolutionOptions.length; i++) {
            const cx = startX + i * (cardW + gap);
            const evo = this.evolutionOptions[i];
            const color = evo.conf.bulletColor || evo.conf.flameColor1 || evo.conf.beamColor || '#ffcc00';
            this._drawCard(ctx, cx, cy, cardW, cardH, evo.conf.name, evo.conf.description, color, true);
        }

        ctx.textAlign = 'left';
    },

    _renderSettings(ctx) {
        const W = G.canvas.width, H = G.canvas.height;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);

        const bx = W / 2 - 150, by = H / 2 - 80;
        ctx.fillStyle = 'rgba(20,20,50,0.95)';
        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bx, by, 300, 160, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('设置', W / 2, by + 25);
        
        // Close button
        ctx.fillText('✕', W / 2 + 140, by + 25);

        // Toggle 1: damage numbers
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('显示伤害数字', bx + 20, by + 55);
        ctx.fillStyle = G.settings.showDamageNumbers ? '#44ff44' : '#ff4444';
        ctx.fillText(G.settings.showDamageNumbers ? '● 开' : '○ 关', bx + 240, by + 55);

        // Toggle 2: enemy HP
        ctx.fillStyle = '#ffffff';
        ctx.fillText('显示敌怪血条', bx + 20, by + 85);
        ctx.fillStyle = G.settings.showEnemyHp ? '#44ff44' : '#ff4444';
        ctx.fillText(G.settings.showEnemyHp ? '● 开' : '○ 关', bx + 240, by + 85);

        ctx.textAlign = 'left';
    },

    _renderGameOver(ctx) {
        const W = G.canvas.width, H = G.canvas.height;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', W / 2, H / 2 - 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px monospace';
        ctx.fillText(`等级: ${G.player.level}  |  击杀: ${G.kills}  |  存活: ${formatTime(G.time)}`, W / 2, H / 2 - 20);
        
        // Weapon info
        const wpConf = WeaponSystem.getWeaponConfig(G.player.weaponId);
        if (wpConf) {
            ctx.fillStyle = '#ffcc00';
            ctx.fillText(`最终武器: ${wpConf.name}`, W / 2, H / 2 + 10);
        }

        ctx.fillStyle = '#aaaaaa';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('点击重新开始', W / 2, H / 2 + 60);
        ctx.textAlign = 'left';
    },

    _renderNotification(ctx) {
        if (this.notificationTimer > 0) {
            const W = G.canvas.width;
            ctx.save();
            ctx.globalAlpha = Math.min(1, this.notificationTimer);
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.notificationText, W / 2, 100);
            ctx.restore();
        }
    },

    _renderJoystick(ctx) {
        if (this.showSettingsScreen || this.showLevelUpScreen || this.showEvolutionScreen || this.showWeaponSelect || this.showGameOverScreen) return;
        const j = Input.vJoystick;
        if (!j.active) return;
        
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#4488ff';
        ctx.beginPath();
        ctx.arc(j.baseX, j.baseY, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#88aaff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(j.knobX, j.knobY, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    },

    // Shared card drawing
    _drawCard(ctx, x, y, w, h, name, desc, color, selected) {
        ctx.fillStyle = 'rgba(15,15,40,0.95)';
        ctx.strokeStyle = selected ? color : '#444466';
        ctx.lineWidth = selected ? 3 : 1;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        if (selected) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 8);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${selected ? 16 : 14}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(name, x + w / 2, y + 30);

        ctx.fillStyle = '#888899';
        ctx.font = '11px monospace';
        const lines = this._wrapText(ctx, desc, w - 20);
        for (let i = 0; i < Math.min(lines.length, 6); i++) {
            ctx.fillText(lines[i], x + w / 2, y + 55 + i * 16);
        }
    },

    _drawAffixCard(ctx, x, y, w, h, opt) {
        const rInfo = CONFIG.RARITY_COLORS[opt.rarity];
        ctx.fillStyle = 'rgba(15,15,40,0.9)';
        ctx.strokeStyle = rInfo.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 6);
        ctx.fill();
        ctx.stroke();

        // Glow for rare+
        if (opt.rarity === 'gold' || opt.rarity === 'rainbow') {
            ctx.shadowColor = rInfo.color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = rInfo.color;
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 6);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.textAlign = 'left';
        const icon = opt.def.icon || '';
        const valStr = opt.def.pct ? `${Math.floor(opt.def.base * CONFIG.RARITY_COLORS[opt.rarity].mult * 100)}%` : `${Math.floor(opt.def.base * CONFIG.RARITY_COLORS[opt.rarity].mult)}`;

        ctx.fillStyle = rInfo.color;
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`${icon} ${opt.def.label} +${valStr}`, x + 15, y + 22);

        ctx.fillStyle = '#888899';
        ctx.font = '10px monospace';
        ctx.fillText(opt.def.desc || '', x + 15, y + 40);

        ctx.textAlign = 'right';
        ctx.fillStyle = rInfo.color;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`[${rInfo.name}] ×${rInfo.mult}`, x + w - 15, y + 35);

        ctx.textAlign = 'left';
    },

    _wrapText(ctx, text, maxWidth) {
        const words = text.split('');
        const lines = [];
        let current = '';
        for (const ch of words) {
            const test = current + ch;
            if (ctx.measureText(test).width > maxWidth && current.length > 0) {
                lines.push(current);
                current = ch;
            } else {
                current = test;
            }
        }
        if (current) lines.push(current);
        return lines;
    },

    showNotification(text, duration) {
        this.notificationText = text;
        this.notificationTimer = duration || 2;
    },

    update(dt) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.y += dn.vy * dt;
            dn.life -= dt;
            dn.alpha = Math.max(0, dn.life / 1.0);
            if (dn.life <= 0) this.damageNumbers.splice(i, 1);
        }
        this.notificationTimer = Math.max(0, this.notificationTimer - dt);
    }
};
