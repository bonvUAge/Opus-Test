const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Resize canvas
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game State
const gameState = {
    date: { year: 1936, month: 1, day: 1 },
    paused: false,
    speed: 1,
    player: {
        country: 'Россия',
        provinces: [],
        industry: 50,
        equipment: 200,
        manpower: 1000,
        politicalPower: 100,
        stability: 100,
        armies: []
    },
    selectedProvince: null,
    building: null,
    wars: []
};

// Province class
class Province {
    constructor(id, name, x, y, owner, population, industry) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = 100;
        this.height = 80;
        this.owner = owner;
        this.population = population;
        this.industry = industry;
        this.color = this.getColor();
        this.armies = [];
    }

    getColor() {
        const colors = {
            'Россия': '#4a4',
            'Германия': '#888',
            'Франция': '#44a',
            'Италия': '#a44',
            'Нейтральная': '#666'
        };
        return colors[this.owner] || '#666';
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Province name
        ctx.fillStyle = '#fff';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.width/2, this.y + this.height/2);

        // Army indicator
        if (this.armies.length > 0) {
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`⚔️${this.armies.length}`, this.x + this.width/2, this.y + this.height/2 + 15);
        }

        // Highlight if selected
        if (gameState.selectedProvince === this) {
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }

    contains(x, y) {
        return x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height;
    }
}

// Army class
class Army {
    constructor(id, name, strength, location) {
        this.id = id;
        this.name = name;
        this.strength = strength;
        this.location = location;
        this.moving = false;
    }
}

// Create map provinces
const provinces = [
    new Province(1, 'Москва', 50, 100, 'Россия', 5000000, 10),
    new Province(2, 'Ленинград', 50, 50, 'Россия', 3000000, 8),
    new Province(3, 'Сталинград', 150, 150, 'Россия', 2000000, 6),
    new Province(4, 'Киев', 150, 100, 'Россия', 2500000, 5),
    new Province(5, 'Минск', 150, 50, 'Россия', 1500000, 4),
    
    new Province(6, 'Берлин', 250, 100, 'Германия', 4000000, 15),
    new Province(7, 'Мюнхен', 250, 150, 'Германия', 2000000, 10),
    new Province(8, 'Гамбург', 250, 50, 'Германия', 1800000, 8),
    
    new Province(9, 'Париж', 350, 100, 'Франция', 4500000, 12),
    new Province(10, 'Марсель', 350, 150, 'Франция', 1500000, 7),
    
    new Province(11, 'Рим', 450, 150, 'Италия', 3000000, 9),
    new Province(12, 'Милан', 450, 100, 'Италия', 2000000, 11),
    
    new Province(13, 'Варшава', 50, 200, 'Нейтральная', 1200000, 3),
    new Province(14, 'Прага', 150, 200, 'Нейтральная', 1000000, 4),
    new Province(15, 'Будапешт', 250, 200, 'Нейтральная', 1500000, 5),
];

// Initialize player provinces
gameState.player.provinces = provinces.filter(p => p.owner === gameState.player.country);

// Initial armies
gameState.player.armies = [
    new Army(1, '1-я Гвардейская', 1000, provinces[0]),
    new Army(2, '2-я Армия', 800, provinces[1])
];
provinces[0].armies.push(gameState.player.armies[0]);
provinces[1].armies.push(gameState.player.armies[1]);

// Draw map
function drawMap() {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let province of provinces) {
        province.draw();
    }
}

// Mouse interaction
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    for (let province of provinces) {
        if (province.contains(x, y)) {
            gameState.selectedProvince = province;
            updateProvinceInfo();
            drawMap();
            break;
        }
    }
});

// Update UI
function updateUI() {
    document.getElementById('industry').textContent = gameState.player.industry;
    document.getElementById('equipment').textContent = Math.floor(gameState.player.equipment);
    document.getElementById('manpower').textContent = Math.floor(gameState.player.manpower);
    document.getElementById('power').textContent = Math.floor(gameState.player.politicalPower);
    
    document.getElementById('countryName').textContent = gameState.player.country;
    document.getElementById('provinces').textContent = gameState.player.provinces.length;
    
    const totalPop = gameState.player.provinces.reduce((sum, p) => sum + p.population, 0);
    document.getElementById('population').textContent = (totalPop / 1000000).toFixed(1) + 'М';
    document.getElementById('stability').textContent = gameState.player.stability + '%';
    
    // Date
    const months = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 
                    'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
    document.getElementById('dateDisplay').textContent = 
        `${gameState.date.day} ${months[gameState.date.month - 1]} ${gameState.date.year}`;
    
    // War status
    if (gameState.wars.length > 0) {
        document.getElementById('warStatus').innerHTML = 
            `<span class="war-status">⚔️ Война с: ${gameState.wars.join(', ')}</span>`;
    } else {
        document.getElementById('warStatus').textContent = 'Мир';
    }
    
    // Army list
    const armyList = document.getElementById('armyList');
    armyList.innerHTML = '';
    for (let army of gameState.player.armies) {
        const div = document.createElement('div');
        div.className = 'army-item';
        div.innerHTML = `
            <strong>${army.name}</strong><br>
            👥 ${army.strength} | 📍 ${army.location.name}
        `;
        armyList.appendChild(div);
    }
}

function updateProvinceInfo() {
    const info = document.getElementById('provinceInfo');
    if (gameState.selectedProvince) {
        const p = gameState.selectedProvince;
        info.innerHTML = `
            <div class="stat-row">
                <span class="stat-label">Название:</span>
                <span class="stat-value">${p.name}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Владелец:</span>
                <span class="stat-value">${p.owner}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Население:</span>
                <span class="stat-value">${(p.population/1000000).toFixed(1)}М</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Промышленность:</span>
                <span class="stat-value">${p.industry}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Войска:</span>
                <span class="stat-value">${p.armies.length}</span>
            </div>
        `;
    } else {
        info.innerHTML = '<p class="province-info">Кликните на провинцию</p>';
    }
}

// Game controls
let gameSpeed = 1;
let isPaused = false;

document.getElementById('pauseBtn').addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? '▶️ Играть' : '⏸️ Пауза';
});

document.getElementById('speedBtn').addEventListener('click', () => {
    gameSpeed = gameSpeed === 1 ? 2 : gameSpeed === 2 ? 4 : 1;
    document.getElementById('speedBtn').textContent = `⏩ x${gameSpeed}`;
});

// Recruit army
document.getElementById('recruitBtn').addEventListener('click', () => {
    if (gameState.player.politicalPower >= 50 && gameState.player.equipment >= 100) {
        gameState.player.politicalPower -= 50;
        gameState.player.equipment -= 100;
        
        const newArmy = new Army(
            gameState.player.armies.length + 1,
            `${gameState.player.armies.length + 1}-я Армия`,
            500,
            provinces[0]
        );
        gameState.player.armies.push(newArmy);
        provinces[0].armies.push(newArmy);
        
        updateUI();
        drawMap();
    } else {
        alert('Недостаточно ресурсов!');
    }
});

// Build factory
document.getElementById('buildFactoryBtn').addEventListener('click', () => {
    if (gameState.player.politicalPower >= 100 && !gameState.building) {
        gameState.player.politicalPower -= 100;
        gameState.building = { type: 'factory', progress: 0, duration: 180 }; // 180 days
        document.getElementById('buildProgress').style.display = 'block';
        updateUI();
    } else if (gameState.building) {
        alert('Уже идет строительство!');
    } else {
        alert('Недостаточно политической власти!');
    }
});

// Declare war
document.getElementById('declareWarBtn').addEventListener('click', () => {
    if (gameState.wars.length === 0) {
        const enemies = ['Германия', 'Франция', 'Италия'].filter(c => 
            provinces.some(p => p.owner === c)
        );
        if (enemies.length > 0) {
            const target = enemies[Math.floor(Math.random() * enemies.length)];
            gameState.wars.push(target);
            updateUI();
            alert(`Война объявлена: ${target}!`);
        }
    } else {
        alert('Уже в состоянии войны!');
    }
});

// Game loop
let lastUpdate = Date.now();
let dayTimer = 0;

function gameLoop() {
    const now = Date.now();
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;
    
    if (!isPaused) {
        dayTimer += delta * gameSpeed;
        
        // One game day per second at speed 1
        if (dayTimer >= 1) {
            dayTimer = 0;
            advanceDay();
        }
    }
    
    drawMap();
    requestAnimationFrame(gameLoop);
}

function advanceDay() {
    // Advance date
    gameState.date.day++;
    if (gameState.date.day > 30) {
        gameState.date.day = 1;
        gameState.date.month++;
        if (gameState.date.month > 12) {
            gameState.date.month = 1;
            gameState.date.year++;
        }
    }
    
    // Production
    const totalIndustry = gameState.player.provinces.reduce((sum, p) => sum + p.industry, 0);
    gameState.player.equipment += totalIndustry * 0.5;
    gameState.player.politicalPower += 0.5;
    gameState.player.manpower += totalIndustry * 0.1;
    
    // Building progress
    if (gameState.building) {
        gameState.building.progress++;
        const percent = (gameState.building.progress / gameState.building.duration * 100).toFixed(0);
        document.getElementById('buildProgressFill').style.width = percent + '%';
        document.getElementById('buildProgressFill').textContent = percent + '%';
        
        if (gameState.building.progress >= gameState.building.duration) {
            if (gameState.building.type === 'factory') {
                gameState.player.industry += 5;
                provinces[0].industry += 5;
            }
            gameState.building = null;
            document.getElementById('buildProgress').style.display = 'none';
            alert('Строительство завершено!');
        }
    }
    
    // War simulation
    if (gameState.wars.length > 0) {
        // Simple combat
        if (Math.random() < 0.05) { // 5% chance per day
            const enemyProvince = provinces.find(p => gameState.wars.includes(p.owner));
            if (enemyProvince && gameState.player.armies.length > 0) {
                const army = gameState.player.armies[0];
                if (army.strength > 200) {
                    // Win province
                    enemyProvince.owner = gameState.player.country;
                    enemyProvince.color = enemyProvince.getColor();
                    gameState.player.provinces.push(enemyProvince);
                    army.strength -= 100;
                    alert(`Захвачена провинция: ${enemyProvince.name}!`);
                }
            }
        }
    }
    
    updateUI();
}

// Start game
updateUI();
updateProvinceInfo();
gameLoop();