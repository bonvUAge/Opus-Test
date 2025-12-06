const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const TILE_SIZE = 16;
const WAVE_DURATION = 30000; // 30 seconds per wave
const BOSS_WAVE = 5;

// Game state
let gameState = {
    currentHero: 0, // 0 = barbarian, 1 = archer
    level: 1,
    exp: 0,
    expToNext: 100,
    wave: 1,
    kills: 0,
    waveTimer: 0,
    bossSpawned: false,
    gameOver: false
};

// Input
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === '1') {
        switchHero();
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Hero classes
class Hero {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'barbarian' or 'archer'
        this.maxHp = type === 'barbarian' ? 150 : 80;
        this.hp = this.maxHp;
        this.speed = type === 'barbarian' ? 2 : 2.5;
        this.attackRange = type === 'barbarian' ? 40 : 200;
        this.attackDamage = type === 'barbarian' ? 25 : 15;
        this.attackSpeed = type === 'barbarian' ? 1000 : 800; // ms
        this.lastAttack = 0;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.color = type === 'barbarian' ? '#f44' : '#4f4';
    }

    update(deltaTime, enemies) {
        // Movement
        let dx = 0, dy = 0;
        if (keys['w']) dy -= 1;
        if (keys['s']) dy += 1;
        if (keys['a']) dx -= 1;
        if (keys['d']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // Keep in bounds
        this.x = Math.max(this.width/2, Math.min(canvas.width - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(canvas.height - this.height/2, this.y));

        // Auto-attack
        this.lastAttack += deltaTime;
        if (this.lastAttack >= this.attackSpeed) {
            this.attack(enemies);
            this.lastAttack = 0;
        }
    }

    attack(enemies) {
        const closest = this.findClosestEnemy(enemies);
        if (closest) {
            const dist = this.distanceTo(closest);
            if (dist <= this.attackRange) {
                if (this.type === 'barbarian') {
                    // Melee attack
                    closest.takeDamage(this.attackDamage);
                    this.createAttackEffect(closest.x, closest.y, '#ff0');
                } else {
                    // Ranged attack - create projectile
                    projectiles.push(new Projectile(this.x, this.y, closest.x, closest.y, this.attackDamage));
                }
            }
        }
    }

    findClosestEnemy(enemies) {
        let closest = null;
        let minDist = Infinity;
        for (let enemy of enemies) {
            if (enemy.hp > 0) {
                const dist = this.distanceTo(enemy);
                if (dist < minDist) {
                    minDist = dist;
                    closest = enemy;
                }
            }
        }
        return closest;
    }

    distanceTo(other) {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            gameState.gameOver = true;
        }
    }

    createAttackEffect(x, y, color) {
        effects.push(new Effect(x, y, color, 200));
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        // Draw weapon indicator
        ctx.fillStyle = '#fff';
        if (this.type === 'barbarian') {
            // Sword
            ctx.fillRect(this.x + this.width/2, this.y - 2, 8, 4);
        } else {
            // Bow
            ctx.fillRect(this.x - this.width/2 - 4, this.y - 4, 4, 8);
        }

        // HP bar
        const barWidth = this.width;
        const barHeight = 4;
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 8, barWidth, barHeight);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 8, barWidth * (this.hp / this.maxHp), barHeight);
    }
}

// Enemy class
class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.maxHp = type === 'boss' ? 500 : 30;
        this.hp = this.maxHp;
        this.speed = type === 'boss' ? 0.8 : 1.2;
        this.damage = type === 'boss' ? 20 : 5;
        this.width = type === 'boss' ? TILE_SIZE * 2 : TILE_SIZE;
        this.height = type === 'boss' ? TILE_SIZE * 2 : TILE_SIZE;
        this.color = type === 'boss' ? '#a0f' : '#f00';
        this.expValue = type === 'boss' ? 100 : 10;
        this.attackCooldown = 0;
    }

    update(deltaTime, hero) {
        // Move towards hero
        const dx = hero.x - this.x;
        const dy = hero.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }

        // Attack hero on collision
        if (dist < this.width) {
            this.attackCooldown -= deltaTime;
            if (this.attackCooldown <= 0) {
                hero.takeDamage(this.damage);
                this.attackCooldown = 1000;
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    die() {
        gameState.kills++;
        gameState.exp += this.expValue;
        effects.push(new Effect(this.x, this.y, '#ff0', 300));
        
        // Check level up
        if (gameState.exp >= gameState.expToNext) {
            gameState.level++;
            gameState.exp = 0;
            gameState.expToNext = Math.floor(gameState.expToNext * 1.5);
            
            // Level up bonuses
            heroes[gameState.currentHero].maxHp += 10;
            heroes[gameState.currentHero].hp = Math.min(heroes[gameState.currentHero].hp + 20, heroes[gameState.currentHero].maxHp);
            heroes[gameState.currentHero].attackDamage += 5;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);

        // Draw eyes
        ctx.fillStyle = '#fff';
        const eyeSize = this.type === 'boss' ? 4 : 2;
        const eyeOffset = this.width / 4;
        ctx.fillRect(this.x - eyeOffset, this.y - eyeOffset, eyeSize, eyeSize);
        ctx.fillRect(this.x + eyeOffset - eyeSize, this.y - eyeOffset, eyeSize, eyeSize);

        // HP bar
        if (this.type === 'boss') {
            const barWidth = this.width;
            const barHeight = 6;
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 12, barWidth, barHeight);
            ctx.fillStyle = '#f0f';
            ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 12, barWidth * (this.hp / this.maxHp), barHeight);
        }
    }
}

// Projectile class
class Projectile {
    constructor(x, y, targetX, targetY, damage) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.speed = 5;
        this.size = 4;
        
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
        this.active = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Check bounds
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.active = false;
        }

        // Check collision with enemies
        for (let enemy of enemies) {
            if (enemy.hp > 0) {
                const dist = Math.sqrt((this.x - enemy.x) ** 2 + (this.y - enemy.y) ** 2);
                if (dist < enemy.width / 2) {
                    enemy.takeDamage(this.damage);
                    this.active = false;
                    effects.push(new Effect(this.x, this.y, '#ff0', 150));
                    break;
                }
            }
        }
    }

    draw() {
        ctx.fillStyle = '#0ff';
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
}

// Visual effect
class Effect {
    constructor(x, y, color, duration) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.duration = duration;
        this.timer = 0;
    }

    update(deltaTime) {
        this.timer += deltaTime;
    }

    isExpired() {
        return this.timer >= this.duration;
    }

    draw() {
        const alpha = 1 - (this.timer / this.duration);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        const size = 8 + (this.timer / this.duration) * 8;
        ctx.fillRect(this.x - size/2, this.y - size/2, size, size);
        ctx.globalAlpha = 1;
    }
}

// Initialize
const heroes = [
    new Hero(canvas.width / 2, canvas.height / 2, 'barbarian'),
    new Hero(canvas.width / 2, canvas.height / 2, 'archer')
];
let enemies = [];
let projectiles = [];
let effects = [];

function switchHero() {
    const oldHero = heroes[gameState.currentHero];
    gameState.currentHero = (gameState.currentHero + 1) % 2;
    const newHero = heroes[gameState.currentHero];
    
    // Transfer position
    newHero.x = oldHero.x;
    newHero.y = oldHero.y;
    
    updateUI();
}

function spawnWave() {
    const numEnemies = 5 + gameState.wave * 3;
    
    for (let i = 0; i < numEnemies; i++) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: x = Math.random() * canvas.width; y = -20; break;
            case 1: x = canvas.width + 20; y = Math.random() * canvas.height; break;
            case 2: x = Math.random() * canvas.width; y = canvas.height + 20; break;
            case 3: x = -20; y = Math.random() * canvas.height; break;
        }
        
        enemies.push(new Enemy(x, y));
    }
    
    // Spawn boss on wave 5
    if (gameState.wave >= BOSS_WAVE && !gameState.bossSpawned) {
        enemies.push(new Enemy(canvas.width / 2, -50, 'boss'));
        gameState.bossSpawned = true;
    }
}

function updateUI() {
    const hero = heroes[gameState.currentHero];
    document.getElementById('heroName').textContent = hero.type === 'barbarian' ? 'Варвар' : 'Лучник';
    document.getElementById('hp').textContent = Math.floor(hero.hp);
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('exp').textContent = gameState.exp + '/' + gameState.expToNext;
    document.getElementById('wave').textContent = gameState.wave;
    document.getElementById('kills').textContent = gameState.kills;
}

function showGameOver() {
    document.getElementById('finalKills').textContent = gameState.kills;
    document.getElementById('finalWave').textContent = gameState.wave;
    document.getElementById('gameOver').style.display = 'block';
}

// Game loop
let lastTime = performance.now();

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (gameState.gameOver) {
        showGameOver();
        return;
    }

    // Update wave timer
    gameState.waveTimer += deltaTime;
    if (gameState.waveTimer >= WAVE_DURATION) {
        gameState.wave++;
        gameState.waveTimer = 0;
        spawnWave();
    }

    // Update
    const currentHero = heroes[gameState.currentHero];
    currentHero.update(deltaTime, enemies);

    for (let enemy of enemies) {
        if (enemy.hp > 0) {
            enemy.update(deltaTime, currentHero);
        }
    }

    for (let projectile of projectiles) {
        projectile.update();
    }

    for (let effect of effects) {
        effect.update(deltaTime);
    }

    // Clean up
    enemies = enemies.filter(e => e.hp > 0);
    projectiles = projectiles.filter(p => p.active);
    effects = effects.filter(e => !e.isExpired());

    // Draw
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    // Draw game objects
    for (let effect of effects) {
        effect.draw();
    }
    
    for (let enemy of enemies) {
        enemy.draw();
    }

    for (let projectile of projectiles) {
        projectile.draw();
    }

    currentHero.draw();

    // Draw wave timer
    ctx.fillStyle = '#fff';
    ctx.font = '16px Courier New';
    const timeLeft = Math.ceil((WAVE_DURATION - gameState.waveTimer) / 1000);
    ctx.fillText(`Следующая волна через: ${timeLeft}s`, 10, 30);

    updateUI();
    requestAnimationFrame(gameLoop);
}

// Start game
spawnWave();
requestAnimationFrame(gameLoop);