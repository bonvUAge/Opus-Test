const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Установка размера канваса
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Игровые переменные
const game = {
    running: true,
    paused: false,
    wave: 1,
    kills: 0,
    waveEnemiesKilled: 0,
    enemiesPerWave: 20,
    bossActive: false,
    bossWarningShown: false
};

// Система улучшений
const upgrades = {
    maxHp: { level: 0, name: 'Здоровье', icon: '❤️', description: '+20 к максимальному HP' },
    damage: { level: 0, name: 'Урон', icon: '⚔️', description: '+5 к урону' },
    speed: { level: 0, name: 'Скорость', icon: '⚡', description: '+0.5 к скорости' },
    attackSpeed: { level: 0, name: 'Скорость атаки', icon: '🗡️', description: '-50мс к задержке атаки' },
    range: { level: 0, name: 'Дальность', icon: '🎯', description: '+30 к дальности атаки' },
    regen: { level: 0, name: 'Регенерация', icon: '💚', description: '+1 HP в секунду' }
};

// Классы героев
const HEROES = {
    BARBARIAN: {
        name: 'Варвар',
        color: '#ff4444',
        speed: 2.5,
        range: 50,
        damage: 15,
        attackSpeed: 400,
        type: 'melee'
    },
    ARCHER: {
        name: 'Лучник',
        color: '#44ff44',
        speed: 3,
        range: 200,
        damage: 10,
        attackSpeed: 600,
        type: 'ranged'
    }
};

// Игрок
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 16,
    hp: 100,
    maxHp: 100,
    xp: 0,
    level: 1,
    currentHero: HEROES.BARBARIAN,
    heroType: 'BARBARIAN',
    lastAttack: 0,
    projectiles: [],
    regenTimer: 0
};

// Управление
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Переключение героя
    if (e.key === '1') {
        player.heroType = player.heroType === 'BARBARIAN' ? 'ARCHER' : 'BARBARIAN';
        player.currentHero = HEROES[player.heroType];
        document.getElementById('hero-name').textContent = player.currentHero.name;
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Враги
const enemies = [];
const boss = null;

class Enemy {
    constructor(x, y, isBoss = false) {
        this.x = x;
        this.y = y;
        this.size = isBoss ? 32 : 12;
        this.speed = isBoss ? 1 : 1.2 + Math.random() * 0.5;
        this.hp = isBoss ? 500 : 30;
        this.maxHp = this.hp;
        this.color = isBoss ? '#8b0000' : '#ff00ff';
        this.damage = isBoss ? 20 : 5;
        this.xpValue = isBoss ? 200 : 10;
        this.isBoss = isBoss;
        this.lastAttack = 0;
    }

    update() {
        // Движение к игроку
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > this.size + player.size) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        } else {
            // Атака игрока
            const now = Date.now();
            if (now - this.lastAttack > 1000) {
                player.hp -= this.damage;
                this.lastAttack = now;
                updateUI();
                
                if (player.hp <= 0) {
                    gameOver();
                }
            }
        }
    }

    draw() {
        // Тело врага
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        
        // Глаза (если не босс)
        if (!this.isBoss) {
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.x - 4, this.y - 4, 3, 3);
            ctx.fillRect(this.x + 1, this.y - 4, 3, 3);
        } else {
            // Корона босса
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(this.x - 12, this.y - 20, 4, 8);
            ctx.fillRect(this.x - 4, this.y - 20, 4, 8);
            ctx.fillRect(this.x + 4, this.y - 20, 4, 8);
        }
        
        // HP бар
        if (this.hp < this.maxHp) {
            const barWidth = this.size * 1.5;
            const barHeight = 4;
            const barX = this.x - barWidth/2;
            const barY = this.y - this.size - 10;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = this.isBoss ? '#ff0000' : '#00ff00';
            ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
        }
    }
}

class Projectile {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / dist) * 8;
        this.vy = (dy / dist) * 8;
        this.size = 4;
        this.damage = player.currentHero.damage;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
}

// Спавн врагов
function spawnEnemy(isBoss = false) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0: x = Math.random() * canvas.width; y = -20; break;
        case 1: x = canvas.width + 20; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 20; break;
        case 3: x = -20; y = Math.random() * canvas.height; break;
    }
    
    enemies.push(new Enemy(x, y, isBoss));
}

// Начальные враги
for (let i = 0; i < 5; i++) {
    spawnEnemy();
}

let spawnTimer = 0;
const spawnInterval = 2000;

// Атака
function attack() {
    const now = Date.now();
    if (now - player.lastAttack < player.currentHero.attackSpeed) return;
    
    const range = player.currentHero.range;
    let target = null;
    let minDist = range;
    
    // Найти ближайшего врага
    for (let enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDist) {
            minDist = dist;
            target = enemy;
        }
    }
    
    if (target) {
        if (player.currentHero.type === 'melee') {
            // Мгновенный урон для ближнего боя
            target.hp -= player.currentHero.damage;
            
            // Эффект удара
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
        } else {
            // Снаряд для дальнего боя
            player.projectiles.push(new Projectile(player.x, player.y, target.x, target.y));
        }
        
        player.lastAttack = now;
    }
}

// Обновление UI
function updateUI() {
    document.getElementById('hp').textContent = Math.max(0, Math.floor(player.hp));
    document.getElementById('maxhp').textContent = player.maxHp;
    document.getElementById('xp').textContent = player.xp;
    document.getElementById('xp-needed').textContent = player.level * 100;
    document.getElementById('level').textContent = player.level;
    document.getElementById('wave').textContent = game.wave;
}

// Game Over
function gameOver() {
    game.running = false;
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-level').textContent = player.level;
    document.getElementById('final-kills').textContent = game.kills;
}

// Показать предупреждение о боссе
function showBossWarning() {
    const warning = document.getElementById('boss-warning');
    warning.classList.remove('hidden');
    setTimeout(() => {
        warning.classList.add('hidden');
    }, 2000);
}

// Система улучшений
function showUpgradeMenu() {
    game.paused = true;
    const menu = document.getElementById('upgrade-menu');
    const optionsContainer = document.getElementById('upgrade-options');
    
    document.getElementById('upgrade-level').textContent = player.level;
    
    // Выбрать 3 случайных улучшения
    const availableUpgrades = Object.keys(upgrades);
    const selectedUpgrades = [];
    
    while (selectedUpgrades.length < 3 && availableUpgrades.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableUpgrades.length);
        selectedUpgrades.push(availableUpgrades[randomIndex]);
        availableUpgrades.splice(randomIndex, 1);
    }
    
    // Создать карточки улучшений
    optionsContainer.innerHTML = '';
    selectedUpgrades.forEach(upgradeKey => {
        const upgrade = upgrades[upgradeKey];
        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
            <div class="upgrade-icon">${upgrade.icon}</div>
            <div class="upgrade-name">${upgrade.name}</div>
            <div class="upgrade-description">${upgrade.description}</div>
            <div class="upgrade-level">Уровень ${upgrade.level}</div>
        `;
        card.onclick = () => applyUpgrade(upgradeKey);
        optionsContainer.appendChild(card);
    });
    
    menu.classList.remove('hidden');
}

function applyUpgrade(upgradeKey) {
    const upgrade = upgrades[upgradeKey];
    upgrade.level++;
    
    switch(upgradeKey) {
        case 'maxHp':
            player.maxHp += 20;
            player.hp += 20;
            break;
        case 'damage':
            player.currentHero.damage += 5;
            HEROES.BARBARIAN.damage += 5;
            HEROES.ARCHER.damage += 5;
            break;
        case 'speed':
            player.currentHero.speed += 0.5;
            HEROES.BARBARIAN.speed += 0.5;
            HEROES.ARCHER.speed += 0.5;
            break;
        case 'attackSpeed':
            player.currentHero.attackSpeed = Math.max(100, player.currentHero.attackSpeed - 50);
            HEROES.BARBARIAN.attackSpeed = Math.max(100, HEROES.BARBARIAN.attackSpeed - 50);
            HEROES.ARCHER.attackSpeed = Math.max(100, HEROES.ARCHER.attackSpeed - 50);
            break;
        case 'range':
            player.currentHero.range += 30;
            HEROES.BARBARIAN.range += 30;
            HEROES.ARCHER.range += 30;
            break;
        case 'regen':
            // Регенерация обрабатывается в игровом цикле
            break;
    }
    
    document.getElementById('upgrade-menu').classList.add('hidden');
    game.paused = false;
    updateUI();
}

// Главный игровой цикл
let lastTime = Date.now();

function gameLoop() {
    if (!game.running) return;
    
    const now = Date.now();
    const delta = now - lastTime;
    lastTime = now;
    
    if (game.paused) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Очистка
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Регенерация
    if (upgrades.regen.level > 0) {
        player.regenTimer += delta;
        if (player.regenTimer >= 1000) {
            player.hp = Math.min(player.maxHp, player.hp + upgrades.regen.level);
            player.regenTimer = 0;
            updateUI();
        }
    }
    
    // Движение игрока
    const speed = player.currentHero.speed;
    if (keys['w'] || keys['ц']) player.y -= speed;
    if (keys['s'] || keys['ы']) player.y += speed;
    if (keys['a'] || keys['ф']) player.x -= speed;
    if (keys['d'] || keys['в']) player.x += speed;
    
    // Границы
    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
    
    // Атака
    attack();
    
    // Обновление снарядов
    for (let i = player.projectiles.length - 1; i >= 0; i--) {
        const proj = player.projectiles[i];
        proj.update();
        proj.draw();
        
        // Проверка попадания
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dx = proj.x - enemy.x;
            const dy = proj.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < enemy.size) {
                enemy.hp -= proj.damage;
                player.projectiles.splice(i, 1);
                break;
            }
        }
        
        // Удаление снарядов за границами
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
            player.projectiles.splice(i, 1);
        }
    }
    
    // Обновление врагов
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update();
        enemy.draw();
        
        // Удаление мертвых врагов
        if (enemy.hp <= 0) {
            player.xp += enemy.xpValue;
            game.kills++;
            game.waveEnemiesKilled++;
            enemies.splice(i, 1);
            
            // Проверка уровня
            if (player.xp >= player.level * 100) {
                player.level++;
                showUpgradeMenu();
            }
            
            // Проверка босса
            if (enemy.isBoss) {
                game.bossActive = false;
                game.bossWarningShown = false;
                game.wave++;
                game.waveEnemiesKilled = 0;
            }
            
            updateUI();
        }
    }
    
    // Спавн врагов
    spawnTimer += delta;
    if (spawnTimer >= spawnInterval && !game.bossActive) {
        spawnTimer = 0;
        
        // Каждые 3 волны - босс
        if (game.wave % 3 === 0 && game.waveEnemiesKilled >= game.enemiesPerWave) {
            if (!game.bossWarningShown) {
                showBossWarning();
                game.bossWarningShown = true;
                setTimeout(() => {
                    game.bossActive = true;
                    spawnEnemy(true);
                }, 2000);
            }
        } else if (game.waveEnemiesKilled >= game.enemiesPerWave) {
            // Новая волна
            game.wave++;
            game.waveEnemiesKilled = 0;
            game.enemiesPerWave += 5;
            updateUI();
        } else {
            // Обычный спавн
            spawnEnemy();
        }
    }
    
    // Рисование игрока
    ctx.fillStyle = player.currentHero.color;
    ctx.fillRect(player.x - player.size/2, player.y - player.size/2, player.size, player.size);
    
    // Глаза игрока
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x - 5, player.y - 5, 4, 4);
    ctx.fillRect(player.x + 1, player.y - 5, 4, 4);
    
    // Оружие
    if (player.heroType === 'BARBARIAN') {
        // Меч
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(player.x + 8, player.y - 8, 4, 12);
    } else {
        // Лук
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x + 10, player.y, 6, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    requestAnimationFrame(gameLoop);
}

// Запуск игры
gameLoop();
updateUI();
