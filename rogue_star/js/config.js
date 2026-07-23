const CONFIG = {
    RARITY_COLORS: {
    white:  { color: '#cccccc', name: '普通', prob: 0.35, mult: 1 },
    blue:   { color: '#4499ff', name: '稀有', prob: 0.30, mult: 2 },
    gold:   { color: '#ffcc00', name: '传说', prob: 0.25, mult: 3 },
    rainbow:{ color: '#ff66ff', name: '神话', prob: 0.10, mult: 5 }
},

PLAYER: {
    hp: 100,
    speed: 220,
    radius: 16,
    invulnTime: 0.5,
    xpBase: 20  // base XP needed for level 1→2, scales: level * xpBase
},

ENEMY: {
    baseHp: 35,
    speed: { min: 80, max: 130 },
    damage: 12,
    radius: 14,
    xpBase: 12,
    hpScalePerMinute: 0.8,  // HP * (1 + minutes * scale)
    maxOnScreen: 50,
    spawnInterval: 1.5       // seconds between spawns initially
},

BOSS: {
    spawnInterval: 300,      // 5 minutes after game start
    radius: 45,
    speed: 75,
    contactDamage: 30,
    phase1Hp: 2500,
    phase2Hp: 5000,
    phase3Hp: 8000,
    phaseTransitionTime: 2,  // 2s invuln between phases
    // Phase 1
    summonCount: 8,
    summonInterval: 8,
    chargeInterval: 8,
    chargeWarningTime: 0.8,
    chargeDamagePercent: 0.25,
    // Phase 2
    eggCount: 8,
    eggInterval: 8,
    eggHp: 50,
    eggExplosionTime: 3.5,
    eggExplosionRadius: 90,
    eggExplosionDamage: 35,
    // Phase 3
    enrageDr: 0.90,          // 90% damage reduction during charge
    enrageBreakPercent: 0.25, // need 25% of phase3 HP to break
    enrageMaxTime: 8,        // 8s to break
    shockwaveCount: 9,
    shockwaveDamagePercent: 0.70, // last shockwave
    shockwaveFastInterval: 0.25,   // first waves
    vulnerabilityMultiplier: 2.0, // +100% damage taken
    vulnerabilityDuration: 6
},

WEAPONS: {
    stardust: {
        name: '星尘',
        id: 'stardust',
        damage: 8,
        fireRate: 1.2,        // shots per second
        bulletSpeed: 280,
        bulletSize: 5,
        bulletLifespan: 2.0,
        autoTargetRange: 500,
        critRate: 0,
        critMult: 0.5,        // +50% (1.5x)
        bulletColor: '#88ccff',
        bulletGlow: '#44aaff',
        bulletCount: 1,
        description: '基础能量弹，自动追踪最近敌人'
    },
    starfire: {
        name: '星火',
        id: 'starfire',
        damage: 5,            // per tick
        fireRate: 8,          // ticks per second
        range: 180,
        width: 28,
        critRate: 0,
        critMult: 0.5,
        flameColor1: '#ff6622',
        flameColor2: '#ffaa00',
        flameColor3: '#ffdd44',
        bulletCount: 1,
        description: '近距离火焰喷射，持续灼烧敌人'
    },
    starlight: {
        name: '星光',
        id: 'starlight',
        damage: 14,
        fireRate: 0.7,
        range: 500,
        beamWidth: 4,
        critRate: 0,
        critMult: 0.5,
        beamColor: '#cc44ff',
        beamGlow: '#ff88ff',
        bulletCount: 1,
        description: '高伤害激光束，瞬间命中目标'
    }
},

EVOLUTIONS: {
    // 星尘 evolutions
    stardust_light: {
        parentId: 'stardust',
        name: '星尘之光',
        id: 'stardust_light',
        damageMult: 0.75,
        fireRateMult: 1.0,
        bulletSpeedMult: 1.8,
        bulletSizeMult: 1.0,
        bulletLifespanMult: 1.5,
        autoTargetRangeMult: 1.5,
        critRate: 0,
        critMult: 0.5,
        bulletColor: '#ffffff',
        bulletGlow: '#aaddff',
        homingStrength: 8.0,   // rad/s turn rate (sharp turns)
        bulletCountMult: 1.0,
        description: '追踪能量弹，极速锐角转弯追击'
    },
    stardust_ring: {
        parentId: 'stardust',
        name: '星尘之环',
        id: 'stardust_ring',
        damageMult: 1.2,
        fireRateMult: 1.0,
        bulletSpeedMult: 1.0,
        bulletSizeMult: 1.0,
        bulletLifespanMult: 1.0,
        autoTargetRangeMult: 1.0,
        critRate: 0,
        critMult: 0.5,
        bulletColor: '#44ddff',
        bulletGlow: '#00bbee',
        ringRadius: 100,
        ringBullets: 6,
        ringSpeedMult: 1.0,    // based on bullet speed stat
        bulletCountMult: 1.0,
        description: '环绕旋转弹幕，持续切割周围敌人'
    },
    // 星火 evolutions
    starfire_fury: {
        parentId: 'starfire',
        name: '群星怒焰',
        id: 'starfire_fury',
        damageMult: 0.65,
        fireRateMult: 1.0,
        rangeMult: 2.2,
        widthMult: 2.0,
        critRate: 0,
        critMult: 0.5,
        flameColor1: '#4488ff',
        flameColor2: '#66ccff',
        flameColor3: '#ffffff',
        bulletCountMult: 1.0,
        description: '超长广域烈焰，如恒星风暴席卷战场'
    },
    starfire_blaze: {
        parentId: 'starfire',
        name: '星流烈火',
        id: 'starfire_blaze',
        damageMult: 0.55,
        fireRateMult: 1.5,
        rangeMult: 1.0,
        widthMult: 1.0,
        critRate: 0,
        critMult: 0.5,
        explosionRadius: 70,
        explosionDamage: 25,
        explosionInterval: 0.4,
        bulletCountMult: 1.0,
        description: '火焰末端引发小范围爆炸，密集爆发伤害'
    },
    // 星光 evolutions
    starlight_eye: {
        parentId: 'starlight',
        name: '星空之眼',
        id: 'starlight_eye',
        damageMult: 0.65,
        fireRateMult: 1.0,
        rangeMult: 1.2,
        beamWidthMult: 1.0,
        critRate: 0,
        critMult: 0.5,
        beamColor: '#ff44ff',
        beamGlow: '#ff88ff',
        lockCount: 3,
        bulletCountMult: 1.0,
        description: '锁定多个目标，同时发射激光束'
    },
    starlight_reaper: {
        parentId: 'starlight',
        name: '死神之眼',
        id: 'starlight_reaper',
        damageMult: 0.45,
        fireRateMult: 1.0,
        rangeMult: 1.3,
        beamWidthMult: 1.0,
        critRate: 25,
        critMult: 1.0,         // +100% (2x total on crit)
        beamColor: '#ff4444',
        beamGlow: '#ff6666',
        bulletCountMult: 1.0,
        description: '致命暴击激光，高概率造成双倍伤害'
    }
},

// Affix pools per weapon
AFFIX_POOLS: {
    // ─── 星尘 / 星尘之光 / 星尘之环 ───
    stardust: {
        damage:       { label: '伤害强化', base: 3, desc: '基础伤害', icon: '⚔' },
        fireRate:     { label: '射速强化', base: 0.15, pct: true, desc: '攻击速度', icon: '⏩' },
        bulletSpeed:  { label: '弹速强化', base: 0.20, pct: true, desc: '子弹飞行速度', icon: '💨' },
        bulletSize:   { label: '弹体增大', base: 2, desc: '子弹体积', icon: '🔵' },
        critRate:     { label: '暴击率', base: 3, pct: true, desc: '暴击概率', icon: '💥' },
        critDamage:   { label: '暴击伤害', base: 0.25, pct: true, desc: '暴击倍率加成', icon: '💢' },
        pierce:       { label: '穿透', base: 1, desc: '穿透敌人数量', icon: '🔱' },
        bulletCount:  { label: '弹数增加', base: 1, desc: '同时发射子弹数', icon: '🔫' },
        moveSpeed:    { label: '移速提升', base: 0.05, pct: true, desc: '移动速度', icon: '👟', global: true },
        lifesteal:    { label: '吸血', base: 1, pct: true, desc: '造成伤害回复生命', icon: '❤', global: true, whiteOnly: true, cap: 50 }
    },
    // ─── 星火 / 群星怒焰 / 星流烈火 ───
    starfire: {
        damage:       { label: '伤害强化', base: 2, desc: '每跳伤害', icon: '⚔' },
        range:        { label: '射程延长', base: 0.15, pct: true, desc: '火焰射程', icon: '📏' },
        width:        { label: '宽度扩大', base: 0.15, pct: true, desc: '火焰宽度', icon: '↔' },
        fireRate:     { label: '频率提升', base: 0.12, pct: true, desc: '灼烧频率', icon: '⏩' },
        moveSpeed:    { label: '移速提升', base: 0.05, pct: true, desc: '移动速度', icon: '👟', global: true },
        lifesteal:    { label: '吸血', base: 1, pct: true, desc: '造成伤害回复生命', icon: '❤', global: true, whiteOnly: true, cap: 50 }
    },
    // 群星怒焰 extra affixes
    starfire_fury: {
        damage:       { label: '伤害强化', base: 2, desc: '每跳伤害', icon: '⚔' },
        range:        { label: '射程延长', base: 0.15, pct: true, desc: '火焰射程', icon: '📏' },
        width:        { label: '宽度扩大', base: 0.15, pct: true, desc: '火焰宽度', icon: '↔' },
        fireRate:     { label: '频率提升', base: 0.12, pct: true, desc: '灼烧频率', icon: '⏩' },
        pierce:       { label: '穿透', base: 1, desc: '火焰穿透力', icon: '🔱' },
        moveSpeed:    { label: '移速提升', base: 0.05, pct: true, desc: '移动速度', icon: '👟', global: true },
        lifesteal:    { label: '吸血', base: 1, pct: true, desc: '造成伤害回复生命', icon: '❤', global: true, whiteOnly: true, cap: 50 }
    },
    // 星流烈火 extra affixes
    starfire_blaze: {
        damage:       { label: '伤害强化', base: 2, desc: '每跳伤害', icon: '⚔' },
        range:        { label: '射程延长', base: 0.15, pct: true, desc: '火焰射程', icon: '📏' },
        width:        { label: '宽度扩大', base: 0.15, pct: true, desc: '火焰宽度', icon: '↔' },
        fireRate:     { label: '频率提升', base: 0.12, pct: true, desc: '灼烧频率', icon: '⏩' },
        explosionSize:{ label: '爆炸半径', base: 0.15, pct: true, desc: '爆炸范围', icon: '💣' },
        moveSpeed:    { label: '移速提升', base: 0.05, pct: true, desc: '移动速度', icon: '👟', global: true },
        lifesteal:    { label: '吸血', base: 1, pct: true, desc: '造成伤害回复生命', icon: '❤', global: true, whiteOnly: true, cap: 50 }
    },
    // ─── 星光 / 星空之眼 / 死神之眼 ───
    starlight: {
        damage:       { label: '伤害强化', base: 4, desc: '基础伤害', icon: '⚔' },
        critRate:     { label: '暴击率', base: 3, pct: true, desc: '暴击概率', icon: '💥' },
        critDamage:   { label: '暴击伤害', base: 0.25, pct: true, desc: '暴击倍率加成', icon: '💢' },
        fireRate:     { label: '射速强化', base: 0.10, pct: true, desc: '攻击速度', icon: '⏩' },
        range:        { label: '射程延长', base: 0.12, pct: true, desc: '激光射程', icon: '📏' },
        beamWidth:    { label: '光束加粗', base: 1, desc: '激光宽度', icon: '↔' },
        moveSpeed:    { label: '移速提升', base: 0.05, pct: true, desc: '移动速度', icon: '👟', global: true },
        lifesteal:    { label: '吸血', base: 1, pct: true, desc: '造成伤害回复生命', icon: '❤', global: true, whiteOnly: true, cap: 50 }
    },
    // 星空之眼 extra
    starlight_eye: {
        damage:       { label: '伤害强化', base: 4, desc: '基础伤害', icon: '⚔' },
        critRate:     { label: '暴击率', base: 3, pct: true, desc: '暴击概率', icon: '💥' },
        critDamage:   { label: '暴击伤害', base: 0.25, pct: true, desc: '暴击倍率加成', icon: '💢' },
        fireRate:     { label: '射速强化', base: 0.10, pct: true, desc: '攻击速度', icon: '⏩' },
        range:        { label: '射程延长', base: 0.12, pct: true, desc: '激光射程', icon: '📏' },
        beamWidth:    { label: '光束加粗', base: 1, desc: '激光宽度', icon: '↔' },
        lockCount:    { label: '锁定数', base: 1, desc: '同时锁定目标数', icon: '🎯' },
        moveSpeed:    { label: '移速提升', base: 0.05, pct: true, desc: '移动速度', icon: '👟', global: true },
        lifesteal:    { label: '吸血', base: 1, pct: true, desc: '造成伤害回复生命', icon: '❤', global: true, whiteOnly: true, cap: 50 }
    },
    // 死神之眼 extra
    starlight_reaper: {
        damage:       { label: '伤害强化', base: 4, desc: '基础伤害', icon: '⚔' },
        critRate:     { label: '暴击率', base: 5, pct: true, desc: '暴击概率', icon: '💥' },
        critDamage:   { label: '暴击伤害', base: 0.30, pct: true, desc: '暴击倍率加成', icon: '💢' },
        fireRate:     { label: '射速强化', base: 0.10, pct: true, desc: '攻击速度', icon: '⏩' },
        range:        { label: '射程延长', base: 0.12, pct: true, desc: '激光射程', icon: '📏' },
        beamWidth:    { label: '光束加粗', base: 1, desc: '激光宽度', icon: '↔' },
        moveSpeed:    { label: '移速提升', base: 0.05, pct: true, desc: '移动速度', icon: '👟', global: true },
        lifesteal:    { label: '吸血', base: 1, pct: true, desc: '造成伤害回复生命', icon: '❤', global: true, whiteOnly: true, cap: 50 }
    }
},

DIFFICULTY: {
    easy:   { name: '简单', enemyHpMult: 0.7, enemySpeedMult: 0.8, xpMult: 1.5 },
    normal: { name: '普通', enemyHpMult: 1.0, enemySpeedMult: 1.0, xpMult: 1.0 },
    hard:   { name: '困难', enemyHpMult: 1.5, enemySpeedMult: 1.2, xpMult: 0.8 }
    }
};
