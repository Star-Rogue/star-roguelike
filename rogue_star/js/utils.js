function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angleBetween(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
function lerp(a, b, t) { return a + (b - a) * t; }
function remap(v, iLo, iHi, oLo, oHi) { return oLo + (oHi - oLo) * ((v - iLo) / (iHi - iLo)); }
function normalize(v) { const len = Math.hypot(v.x, v.y); return len ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 }; }
function vecFromAngle(angle, len) { return { x: Math.cos(angle) * len, y: Math.sin(angle) * len }; }
function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
function lerpAngle(a, b, t) { let d = wrapAngle(b - a); return a + d * t; }
function collides(a, b) { return dist(a, b) < (a.radius || 0) + (b.radius || 0); }

function rollRarity() {
    const r = Math.random();
    const R = CONFIG.RARITY_COLORS;
    if (r < R.rainbow.prob) return 'rainbow';
    if (r < R.rainbow.prob + R.gold.prob) return 'gold';
    if (r < R.rainbow.prob + R.gold.prob + R.blue.prob) return 'blue';
    return 'white';
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
        this.beginPath();
        this.moveTo(x + r.tl, y);
        this.lineTo(x + w - r.tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        this.lineTo(x + w, y + h - r.br);
        this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        this.lineTo(x + r.bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        this.closePath();
    };
}
