const Input = {
    keys: {},
    mouse: { x: 0, y: 0, down: false },
    touch: { active: false, joystickId: null, moveId: null, joystick: { dx: 0, dy: 0 }, startX: 0, startY: 0 },
    vJoystick: { baseX: 0, baseY: 0, knobX: 0, knobY: 0, active: false },
    isMobile: false,

    init() {
        this.isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || 
                        ('ontouchstart' in window && window.innerWidth < 1024);
        
        window.addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; e.preventDefault(); });
        window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; e.preventDefault(); });
        
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top; });
        canvas.addEventListener('mousedown', () => this.mouse.down = true);
        canvas.addEventListener('mouseup', () => this.mouse.down = false);
        canvas.addEventListener('mouseleave', () => this.mouse.down = false);

        if (this.isMobile) {
            canvas.addEventListener('touchstart', e => this._onTouchStart(e), { passive: false });
            canvas.addEventListener('touchmove', e => this._onTouchMove(e), { passive: false });
            canvas.addEventListener('touchend', e => this._onTouchEnd(e), { passive: false });
        }
    },

    _onTouchStart(e) {
        e.preventDefault();
        for (const t of e.changedTouches) {
            const r = e.target.getBoundingClientRect();
            const tx = t.clientX - r.left, ty = t.clientY - r.top;
            const scaleX = r.width / e.target.width, scaleY = r.height / e.target.height;
            const sx = tx / scaleX, sy = ty / scaleY;
            if (sx < e.target.width * 0.5) {
                this.vJoystick.baseX = sx; this.vJoystick.baseY = sy;
                this.vJoystick.knobX = sx; this.vJoystick.knobY = sy;
                this.vJoystick.active = true;
                this.touch.moveId = t.identifier;
            } else {
                // tap to interact with UI
                G.ui.handleTap(sx, sy);
            }
        }
    },

    _onTouchMove(e) {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier === this.touch.moveId && this.vJoystick.active) {
                const r = e.target.getBoundingClientRect();
                const scaleX = r.width / e.target.width, scaleY = r.height / e.target.height;
                const sx = t.clientX / scaleX - r.left / scaleX, sy = t.clientY / scaleY - r.top / scaleY;
                const dx = sx - this.vJoystick.baseX, dy = sy - this.vJoystick.baseY;
                const len = Math.hypot(dx, dy), maxR = 50;
                if (len > maxR) {
                    this.vJoystick.knobX = this.vJoystick.baseX + dx / len * maxR;
                    this.vJoystick.knobY = this.vJoystick.baseY + dy / len * maxR;
                } else {
                    this.vJoystick.knobX = sx; this.vJoystick.knobY = sy;
                }
                this.vJoystick.dx = dx / maxR; this.vJoystick.dy = dy / maxR;
            }
        }
    },

    _onTouchEnd(e) {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier === this.touch.moveId) {
                this.vJoystick.active = false;
                this.vJoystick.dx = 0; this.vJoystick.dy = 0;
            }
        }
    },

    getMoveDir() {
        if (this.isMobile && this.vJoystick.active) {
            return { x: this.vJoystick.dx, y: this.vJoystick.dy };
        }
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        const len = Math.hypot(dx, dy);
        return len ? { x: dx / len, y: dy / len } : { x: 0, y: 0 };
    },

    isPressing(key) { return !!this.keys[key.toLowerCase()]; }
};
