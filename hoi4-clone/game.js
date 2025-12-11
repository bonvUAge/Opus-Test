class HOI4Game {
    constructor() {
        this.currentCountry = 'Germany';
        this.politicalPower = 100;
        this.date = new Date(1936, 0, 1);
        this.isPaused = false;
        this.gameSpeed = 1;
        
        this.resources = {
            civilianFactories: 20,
            militaryFactories: 10,
            dockyards: 5,
            divisions: 20
        };
        
        this.countries = {
            'Germany': { 
                color: '#555555', 
                position: { x: 400, y: 250 }, 
                atWar: [], 
                allies: [],
                relations: {} 
            },
            'France': { 
                color: '#0055A4', 
                position: { x: 350, y: 280 }, 
                atWar: [], 
                allies: ['UK'],
                relations: {} 
            },
            'UK': { 
                color: '#C8102E', 
                position: { x: 330, y: 220 }, 
                atWar: [], 
                allies: ['France'],
                relations: {} 
            },
            'Soviet Union': { 
                color: '#DA291C', 
                position: { x: 550, y: 200 }, 
                atWar: [], 
                allies: [],
                relations: {} 
            },
            'USA': { 
                color: '#B22234', 
                position: { x: 150, y: 250 }, 
                atWar: [], 
                allies: [],
                relations: {} 
            },
            'Italy': { 
                color: '#009246', 
                position: { x: 420, y: 310 }, 
                atWar: [], 
                allies: [],
                relations: {} 
            },
            'Japan': { 
                color: '#BC002D', 
                position: { x: 700, y: 260 }, 
                atWar: [], 
                allies: [],
                relations: {} 
            }
        };
        
        this.canvas = document.getElementById('world-map');
        this.ctx = this.canvas.getContext('2d');
        
        this.initializeRelations();
        this.drawMap();
        this.updateUI();
        this.startGameLoop();
    }
    
    initializeRelations() {
        Object.keys(this.countries).forEach(country1 => {
            this.countries[country1].relations = {};
            Object.keys(this.countries).forEach(country2 => {
                if (country1 !== country2) {
                    this.countries[country1].relations[country2] = 0;
                }
            });
        });
    }
    
    drawMap() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем фон карты
        this.ctx.fillStyle = '#0a1929';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем сетку
        this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Рисуем линии войны
        Object.keys(this.countries).forEach(country => {
            const countryData = this.countries[country];
            countryData.atWar.forEach(enemy => {
                const enemyData = this.countries[enemy];
                this.ctx.strokeStyle = '#ff4444';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(countryData.position.x, countryData.position.y);
                this.ctx.lineTo(enemyData.position.x, enemyData.position.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            });
        });
        
        // Рисуем страны
        Object.keys(this.countries).forEach(country => {
            const countryData = this.countries[country];
            const pos = countryData.position;
            
            // Тень
            this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            this.ctx.shadowBlur = 10;
            
            // Территория страны (круг)
            this.ctx.fillStyle = countryData.color;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Обводка
            this.ctx.strokeStyle = country === this.currentCountry ? '#ffd700' : '#ffffff';
            this.ctx.lineWidth = country === this.currentCountry ? 3 : 1;
            this.ctx.stroke();
            
            // Сброс тени
            this.ctx.shadowBlur = 0;
            
            // Название страны
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(country, pos.x, pos.y + 50);
            
            // Статус войны
            if (countryData.atWar.length > 0) {
                this.ctx.fillStyle = '#ff4444';
                this.ctx.font = 'bold 10px Arial';
                this.ctx.fillText('⚔ War', pos.x, pos.y + 65);
            }
        });
    }
    
    updateUI() {
        document.getElementById('current-date').textContent = 
            this.date.toISOString().split('T')[0];
        document.getElementById('current-country').textContent = this.currentCountry;
        document.getElementById('political-power').textContent = 
            Math.floor(this.politicalPower);
        
        document.getElementById('civilian-factories').textContent = 
            this.resources.civilianFactories;
        document.getElementById('military-factories').textContent = 
            this.resources.militaryFactories;
        document.getElementById('dockyards').textContent = 
            this.resources.dockyards;
        document.getElementById('divisions').textContent = 
            this.resources.divisions;
        
        this.updateCountriesList();
    }
    
    updateCountriesList() {
        const list = document.getElementById('countries-list');
        list.innerHTML = '';
        
        Object.keys(this.countries).forEach(country => {
            const data = this.countries[country];
            const div = document.createElement('div');
            div.className = 'country-status';
            
            if (data.atWar.length > 0) {
                div.classList.add('at-war');
            } else if (data.allies.includes(this.currentCountry)) {
                div.classList.add('ally');
            }
            
            const status = data.atWar.length > 0 ? '⚔ Война' : '✓ Мир';
            div.innerHTML = `<strong>${country}</strong><br>${status}`;
            list.appendChild(div);
        });
    }
    
    addLog(message, type = 'default') {
        const log = document.getElementById('event-log');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const time = this.date.toISOString().split('T')[0];
        entry.textContent = `[${time}] ${message}`;
        log.insertBefore(entry, log.firstChild);
        
        // Ограничиваем количество записей
        while (log.children.length > 20) {
            log.removeChild(log.lastChild);
        }
    }
    
    buildFactory(type) {
        const cost = 50;
        if (this.politicalPower < cost) {
            this.addLog('Недостаточно политической власти!', 'production');
            return;
        }
        
        this.politicalPower -= cost;
        
        switch(type) {
            case 'civilian':
                this.resources.civilianFactories++;
                this.addLog('Построен гражданский завод', 'production');
                break;
            case 'military':
                this.resources.militaryFactories++;
                this.addLog('Построен военный завод', 'production');
                break;
            case 'dockyard':
                this.resources.dockyards++;
                this.addLog('Построена верфь', 'production');
                break;
        }
        
        this.updateUI();
    }
    
    trainDivision() {
        const cost = 20;
        if (this.politicalPower < cost) {
            this.addLog('Недостаточно политической власти!', 'production');
            return;
        }
        
        this.politicalPower -= cost;
        this.resources.divisions++;
        this.addLog('Обучена новая дивизия', 'production');
        this.updateUI();
    }
    
    produceEquipment() {
        const produced = this.resources.militaryFactories * 2;
        this.addLog(`Произведено ${produced} единиц вооружения`, 'production');
    }
    
    declareWar() {
        const target = document.getElementById('target-country').value;
        const cost = 100;
        
        if (this.politicalPower < cost) {
            this.addLog('Недостаточно политической власти для объявления войны!', 'war');
            return;
        }
        
        if (this.countries[this.currentCountry].atWar.includes(target)) {
            this.addLog(`Вы уже в состоянии войны с ${target}!`, 'war');
            return;
        }
        
        this.politicalPower -= cost;
        this.countries[this.currentCountry].atWar.push(target);
        this.countries[target].atWar.push(this.currentCountry);
        
        this.addLog(`${this.currentCountry} объявляет войну ${target}!`, 'war');
        this.drawMap();
        this.updateUI();
    }
    
    improveRelations() {
        const target = document.getElementById('target-country').value;
        const cost = 30;
        
        if (this.politicalPower < cost) {
            this.addLog('Недостаточно политической власти!', 'diplomacy');
            return;
        }
        
        this.politicalPower -= cost;
        this.countries[this.currentCountry].relations[target] = 
            Math.min(100, (this.countries[this.currentCountry].relations[target] || 0) + 20);
        
        this.addLog(`Улучшены отношения с ${target}`, 'diplomacy');
        this.updateUI();
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        this.addLog(this.isPaused ? 'Игра на паузе' : 'Игра возобновлена');
    }
    
    setSpeed(speed) {
        this.gameSpeed = speed;
        this.addLog(`Скорость игры установлена: x${speed}`);
    }
    
    advanceTime() {
        if (this.isPaused) return;
        
        // Прибавляем день
        this.date.setDate(this.date.getDate() + 1);
        
        // Ежедневная генерация политической власти
        this.politicalPower += 0.5 * this.gameSpeed;
        
        // Производство от заводов
        if (this.date.getDate() === 1) {
            const income = this.resources.civilianFactories * 2;
            this.politicalPower += income;
            this.addLog(`Месячный доход: +${income} политической власти`, 'production');
        }
        
        this.updateUI();
    }
    
    startGameLoop() {
        setInterval(() => {
            this.advanceTime();
        }, 1000 / this.gameSpeed);
    }
}

// Инициализация игры
let game;
window.onload = () => {
    game = new HOI4Game();
};