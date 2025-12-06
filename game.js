const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let gameState = {
    score: 0,
    wave: 1,
    kills: 0,
    enemiesPerWave: 5,
    currentHero: 0,
    gameOver: false,
    bossSpawned: false
};

// Keys
const keys = {};

// Heroes
class Hero {
    constructor(name, type, health, damage, attackSpeed, attackRange, speed, symbol) {
        this.name = name;
        this.type = type;
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.width = 16;
        this.height = 16;
        this.health = health;
        this.maxHealth = health;
        this.damage = damage;
        this.attackSpeed = attackSpeed;
        this.attackRange = attackRange;
        this.speed = speed;
        this.symbol = symbol;
        this.lastAttack = 0;
        this.direction = 0;
    }

    draw() {
        // Draw in Dwarf Fortress ASCII style
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, this.x, this.y);
        
        // Draw attack range circle when hero is melee
        if (this.type === 'melee') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.attackRange, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    move() {
        let dx = 0, dy = 0;
        if (keys['w'] || keys['W']) dy -= 1;
        if (keys['s'] || keys['S']) dy += 1;
        if (keys['a'] || keys['A']) dx -= 1;
        if (keys['d'] || keys['D']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const magnitude = Math.sqrt(dx * dx + dy * dy);
            dx /= magnitude;
            dy /= magnitude;
            this.direction = Math.atan2(dy, dx);
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;

        this.x = Math.max(this.width/2, Math.min(canvas.width - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(canvas.height - this.height/2, this.y));
    }

    attack(enemies, projectiles, currentTime) {
        if (currentTime - this.lastAttack < this.attackSpeed) return;

        if (this.type === 'melee') {
            // Vampire survivors style: attack all enemies in range
            let attacked = false;
            for (let enemy of enemies) {
                const dist = this.distance(enemy);
                if (dist < this.attackRange) {
                    enemy.health -= this.damage;
                    attacked = true;
                    if (enemy.health <= 0) {
                        gameState.kills++;
                        gameState.score += enemy.isBoss ? 500 : 10;
                    }
                }
            }
            if (attacked) {
                this.lastAttack = currentTime;
            }
        } else if (this.type === 'ranged') {
            let target = this.findClosestEnemy(enemies);
            if (!target) return;
            
            const angle = Math.atan2(target.y - this.y, target.x - this.x);
            projectiles.push(new Projectile(this.x, this.y, angle, this.damage));
            this.lastAttack = currentTime;
        }
    }

    findClosestEnemy(enemies) {
        let closest = null;
        let minDist = Infinity;
        for (let enemy of enemies) {
            const dist = this.distance(enemy);
            if (dist < minDist) {
                minDist = dist;
                closest = enemy;
            }
        }
        return closest;
    }

    distance(entity) {
        return Math.sqrt((this.x - entity.x) ** 2 + (this.y - entity.y) ** 2);
    }
}

// Enemies
class Enemy {
    constructor(x, y, health, damage, speed, symbol, isBoss = false) {
        this.x = x;
        this.y = y;
        this.width = isBoss ? 20 : 16;
        this.height = isBoss ? 20 : 16;
        this.health = health;
        this.maxHealth = health;
        this.damage = damage;
        this.speed = speed;
        this.symbol = symbol;
        this.isBoss = isBoss;
        this.lastAttack = 0;
    }

    draw() {
        // Draw in Dwarf Fortress ASCII style
        ctx.font = `bold ${this.isBoss ? 20 : 16}px monospace`;
        ctx.fillStyle = this.isBoss ? '#ff00ff' : '#ff0000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, this.x, this.y);

        // Health bar for boss
        if (this.isBoss) {
            const barWidth = 40;
            const barHeight = 3;
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 8, barWidth, barHeight);
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(this.x - barWidth/2, this.y - this.height/2 - 8, (this.health / this.maxHealth) * barWidth, barHeight);
        }
    }

    move(hero) {
        const angle = Math.atan2(hero.y - this.y, hero.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }

    attack(hero, currentTime) {
        const dist = Math.sqrt((this.x - hero.x) ** 2 + (this.y - hero.y) ** 2);
        if (dist < 20 && currentTime - this.lastAttack > 1000) {
            hero.health -= this.damage;
            this.lastAttack = currentTime;
        }
    }
}

// Projectiles
class Projectile {
    constructor(x, y, angle, damage) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 6;
        this.damage = damage;
        this.width = 8;
        this.height = 8;
    }

    draw() {
        // Draw arrow in ASCII style
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#ffff00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillText('→', 0, 0);
        ctx.restore();
    }

    move() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    isOffScreen() {
        return this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height;
    }

    hits(enemy) {
        return Math.abs(this.x - enemy.x) < enemy.width/2 + this.width/2 &&
               Math.abs(this.y - enemy.y) < enemy.height/2 + this.height/2;
    }
}

// Initialize heroes with ASCII symbols
const heroes = [
    new Hero('Варвар', 'melee', 100, 25, 800, 50, 3, '@'),
    new Hero('Лучник', 'ranged', 80, 15, 500, 300, 2.5, 'i')
];

let currentHero = heroes[0];
let enemies = [];
let projectiles = [];
let waveEnemiesKilled = 0;

// Spawn enemies
function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0: x = Math.random() * canvas.width; y = -20; break;
        case 1: x = canvas.width + 20; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 20; break;
        case 3: x = -20; y = Math.random() * canvas.height; break;
    }
    
    const health = 30 + gameState.wave * 10;
    const damage = 5 + gameState.wave * 2;
    
    // Random enemy types in DF style
    const enemyTypes = ['g', 'o', 'k', 'T', 'D'];
    const symbol = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    
    enemies.push(new Enemy(x, y, health, damage, 1 + gameState.wave * 0.1, symbol));
}

function spawnBoss() {
    const x = canvas.width / 2;
    const y = -50;
    const boss = new Enemy(x, y, 500 + gameState.wave * 200, 20, 2, 'Ð', true);
    enemies.push(boss);
    gameState.bossSpawned = true;
}

function spawnWave() {
    waveEnemiesKilled = 0;
    const enemyCount = gameState.enemiesPerWave + gameState.wave * 2;
    
    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => spawnEnemy(), i * 500);
    }
}

// Input handling
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    if (e.key === '1') {
        const oldHero = currentHero;
        gameState.currentHero = (gameState.currentHero + 1) % heroes.length;
        currentHero = heroes[gameState.currentHero];
        
        // Transfer position from old hero to new hero
        currentHero.x = oldHero.x;
        currentHero.y = oldHero.y;
        
        updateUI();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Update UI
function updateUI() {
    document.getElementById('heroName').textContent = currentHero.name;
    document.getElementById('wave').textContent = gameState.wave;
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('kills').textContent = gameState.kills;
    document.getElementById('health').textContent = Math.max(0, Math.floor(currentHero.health));
    
    const healthPercent = Math.max(0, (currentHero.health / currentHero.maxHealth) * 100);
    document.getElementById('healthBar').style.width = healthPercent + '%';
}

function showGameOver() {
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOver').style.display = 'block';
}

// Game loop
function gameLoop() {
    if (gameState.gameOver) return;

    const currentTime = Date.now();
    
    // Clear canvas with DF-style background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw simple grid in DF style
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 16) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    // Draw some random floor tiles for DF atmosphere
    ctx.fillStyle = '#0a0a0a';
    ctx.font = '12px monospace';
    for (let i = 0; i < canvas.width; i += 32) {
        for (let j = 0; j < canvas.height; j += 32) {
            if (Math.random() > 0.7) {
                ctx.fillText('.', i, j);
            }
        }
    }
    
    // Update and draw hero
    currentHero.move();
    currentHero.attack(enemies, projectiles, currentTime);
    currentHero.draw();
    
    // Update and draw projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        proj.move();
        proj.draw();
        
        if (proj.isOffScreen()) {
            projectiles.splice(i, 1);
            continue;
        }
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (proj.hits(enemies[j])) {
                enemies[j].health -= proj.damage;
                projectiles.splice(i, 1);
                if (enemies[j].health <= 0) {
                    gameState.kills++;
                    gameState.score += enemies[j].isBoss ? 500 : 10;
                    waveEnemiesKilled++;
                }
                break;
            }
        }
    }
    
    // Update and draw enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.move(currentHero);
        enemy.attack(currentHero, currentTime);
        enemy.draw();
        
        if (enemy.health <= 0) {
            enemies.splice(i, 1);
            if (enemy.isBoss) {
                gameState.bossSpawned = false;
            }
        }
    }
    
    // Check wave completion
    if (enemies.length === 0 && waveEnemiesKilled >= gameState.enemiesPerWave + (gameState.wave - 1) * 2) {
        gameState.wave++;
        
        if (gameState.wave % 5 === 0 && !gameState.bossSpawned) {
            setTimeout(() => spawnBoss(), 2000);
        } else if (!gameState.bossSpawned) {
            setTimeout(() => spawnWave(), 2000);
        }
    }
    
    // Check game over
    if (currentHero.health <= 0) {
        gameState.gameOver = true;
        showGameOver();
        return;
    }
    
    updateUI();
    requestAnimationFrame(gameLoop);
}

// Start game
spawnWave();
gameLoop();