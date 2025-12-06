class HOI4Clone {
    constructor() {
        this.gameState = {
            date: new Date(1936, 0, 1),
            manpower: 1000000,
            factories: 50,
            equipment: 5000,
            infantry: 10,
            tanks: 2,
            fighters: 5,
            speed: 1,
            paused: false,
            atWar: false,
            enemy: null,
            selectedProvince: null,
            playerDivisions: {},
            enemyDivisions: {},
            productionQueue: [],
            research: new Set()
        };

        this.provinces = this.generateProvinces();
        this.initializeMap();
        this.initializeControls();
        this.startGameLoop();
    }

    generateProvinces() {
        const provinces = [
            { id: 'berlin', name: 'Berlin', owner: 'Germany', x: 400, y: 200, vp: 10, color: '#4a4a4a' },
            { id: 'munich', name: 'Munich', owner: 'Germany', x: 350, y: 280, vp: 5, color: '#4a4a4a' },
            { id: 'hamburg', name: 'Hamburg', owner: 'Germany', x: 380, y: 140, vp: 5, color: '#4a4a4a' },
            { id: 'paris', name: 'Paris', owner: 'France', x: 200, y: 300, vp: 15, color: '#3b5998' },
            { id: 'lyon', name: 'Lyon', owner: 'France', x: 230, y: 350, vp: 3, color: '#3b5998' },
            { id: 'marseille', name: 'Marseille', owner: 'France', x: 240, y: 400, vp: 3, color: '#3b5998' },
            { id: 'warsaw', name: 'Warsaw', owner: 'Poland', x: 550, y: 220, vp: 10, color: '#dc143c' },
            { id: 'krakow', name: 'Krakow', owner: 'Poland', x: 530, y: 270, vp: 3, color: '#dc143c' },
            { id: 'brussels', name: 'Brussels', owner: 'Belgium', x: 280, y: 230, vp: 5, color: '#ffd700' },
            { id: 'amsterdam', name: 'Amsterdam', owner: 'Netherlands', x: 300, y: 180, vp: 5, color: '#ff8c00' }
        ];

        provinces.forEach(p => {
            this.gameState.playerDivisions[p.id] = p.owner === 'Germany' ? 3 : 0;
            this.gameState.enemyDivisions[p.id] = p.owner === 'France' ? 2 : 0;
        });

        return provinces;
    }

    initializeMap() {
        const svg = document.getElementById('map');
        
        this.provinces.forEach(province => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', province.x);
            circle.setAttribute('cy', province.y);
            circle.setAttribute('r', '40');
            circle.setAttribute('fill', province.color);
            circle.setAttribute('class', 'province');
            circle.setAttribute('data-id', province.id);
            
            circle.addEventListener('click', () => this.selectProvince(province));
            svg.appendChild(circle);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', province.x);
            text.setAttribute('y', province.y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', '#fff');
            text.setAttribute('font-size', '12');
            text.setAttribute('pointer-events', 'none');
            text.textContent = province.name;
            svg.appendChild(text);

            const divText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            divText.setAttribute('x', province.x);
            divText.setAttribute('y', province.y + 15);
            divText.setAttribute('text-anchor', 'middle');
            divText.setAttribute('fill', '#d4af37');
            divText.setAttribute('font-size', '10');
            divText.setAttribute('pointer-events', 'none');
            divText.setAttribute('id', `div-${province.id}`);
            divText.textContent = `🪖${this.gameState.playerDivisions[province.id]}`;
            svg.appendChild(divText);
        });
    }

    selectProvince(province) {
        document.querySelectorAll('.province').forEach(p => p.classList.remove('selected'));
        document.querySelector(`[data-id="${province.id}"]`).classList.add('selected');
        
        this.gameState.selectedProvince = province;
        document.getElementById('province-info').classList.remove('hidden');
        document.getElementById('province-name').textContent = province.name;
        document.getElementById('province-owner').textContent = province.owner;
        document.getElementById('province-divisions').textContent = this.gameState.playerDivisions[province.id];
        document.getElementById('province-vp').textContent = province.vp;
    }

    initializeControls() {
        document.getElementById('speed-1').addEventListener('click', () => this.setSpeed(1));
        document.getElementById('speed-2').addEventListener('click', () => this.setSpeed(2));
        document.getElementById('speed-3').addEventListener('click', () => this.setSpeed(3));
        document.getElementById('pause').addEventListener('click', () => this.togglePause());

        document.querySelectorAll('.produce-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.addToProductionQueue(type);
            });
        });

        document.querySelectorAll('.research-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tech = e.target.dataset.tech;
                this.research(tech, e.target);
            });
        });

        document.getElementById('declare-war').addEventListener('click', () => this.declareWar());
        document.getElementById('move-troops').addEventListener('click', () => this.moveTroops());
    }

    setSpeed(speed) {
        this.gameState.speed = speed;
        this.gameState.paused = false;
        document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`speed-${speed}`).classList.add('active');
    }

    togglePause() {
        this.gameState.paused = !this.gameState.paused;
        document.getElementById('pause').classList.toggle('active');
    }

    addToProductionQueue(type) {
        const costs = { infantry: 10, tank: 25, fighter: 15 };
        const cost = costs[type];

        if (this.gameState.factories >= cost) {
            this.gameState.factories -= cost;
            this.gameState.productionQueue.push({ type, progress: 0, total: 30 });
            this.updateUI();
            this.log(`Started producing ${type} division`);
        } else {
            this.log(`Not enough factories to produce ${type}`, 'important');
        }
    }

    research(tech, button) {
        if (!this.gameState.research.has(tech)) {
            this.gameState.research.add(tech);
            button.disabled = true;
            button.textContent = 'Researched';
            this.log(`Researched ${tech}`, 'important');
        }
    }

    declareWar() {
        if (!this.gameState.atWar) {
            this.gameState.atWar = true;
            this.gameState.enemy = 'France';
            document.getElementById('war-status').classList.remove('hidden');
            document.getElementById('enemy').textContent = 'France';
            document.getElementById('declare-war').disabled = true;
            this.log('⚔️ WAR DECLARED ON FRANCE!', 'war');
        }
    }

    moveTroops() {
        if (!this.gameState.selectedProvince) return;

        const targetId = this.gameState.selectedProvince.id;
        const germanProvinces = this.provinces.filter(p => p.owner === 'Germany');
        
        if (germanProvinces.length > 0 && this.gameState.infantry > 0) {
            const sourceId = germanProvinces[0].id;
            if (this.gameState.playerDivisions[sourceId] > 0) {
                this.gameState.playerDivisions[sourceId]--;
                this.gameState.playerDivisions[targetId]++;
                this.updateMapDivisions();
                this.log(`Moved division to ${this.gameState.selectedProvince.name}`);
            }
        }
    }

    processProduction() {
        this.gameState.productionQueue = this.gameState.productionQueue.filter(item => {
            item.progress++;
            if (item.progress >= item.total) {
                if (item.type === 'infantry') this.gameState.infantry++;
                else if (item.type === 'tank') this.gameState.tanks++;
                else if (item.type === 'fighter') this.gameState.fighters++;
                
                this.log(`Completed production of ${item.type}`, 'important');
                return false;
            }
            return true;
        });
    }

    processCombat() {
        if (!this.gameState.atWar) return;

        this.provinces.forEach(province => {
            const playerDivs = this.gameState.playerDivisions[province.id];
            const enemyDivs = this.gameState.enemyDivisions[province.id];

            if (playerDivs > 0 && enemyDivs > 0) {
                const playerWins = Math.random() > 0.5;
                if (playerWins && playerDivs >= enemyDivs) {
                    this.gameState.enemyDivisions[province.id] = 0;
                    province.owner = 'Germany';
                    province.color = '#4a4a4a';
                    this.log(`⚔️ Captured ${province.name}!`, 'war');
                    this.updateMapColors();
                } else if (!playerWins && enemyDivs >= playerDivs) {
                    this.gameState.playerDivisions[province.id] = Math.max(0, playerDivs - 1);
                    this.gameState.manpower -= 10000;
                }
                this.updateMapDivisions();
            }
        });
    }

    updateMapColors() {
        this.provinces.forEach(province => {
            const element = document.querySelector(`[data-id="${province.id}"]`);
            if (element) {
                element.setAttribute('fill', province.color);
            }
        });
    }

    updateMapDivisions() {
        this.provinces.forEach(province => {
            const element = document.getElementById(`div-${province.id}`);
            if (element) {
                element.textContent = `🪖${this.gameState.playerDivisions[province.id]}`;
            }
        });
    }

    updateUI() {
        document.getElementById('manpower').textContent = this.gameState.manpower.toLocaleString();
        document.getElementById('factories').textContent = this.gameState.factories;
        document.getElementById('equipment').textContent = this.gameState.equipment;
        document.getElementById('infantry-count').textContent = this.gameState.infantry;
        document.getElementById('tank-count').textContent = this.gameState.tanks;
        document.getElementById('fighter-count').textContent = this.gameState.fighters;
        
        const dateStr = this.gameState.date.toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
        document.getElementById('date').textContent = dateStr;

        const queueDiv = document.getElementById('production-queue');
        queueDiv.innerHTML = this.gameState.productionQueue.map(item => 
            `<div class="queue-item">${item.type}: ${Math.floor(item.progress / item.total * 100)}%</div>`
        ).join('');

        if (this.gameState.selectedProvince) {
            document.getElementById('province-divisions').textContent = 
                this.gameState.playerDivisions[this.gameState.selectedProvince.id];
        }
    }

    log(message, type = 'normal') {
        const logDiv = document.getElementById('log-content');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const time = this.gameState.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        entry.textContent = `[${time}] ${message}`;
        logDiv.insertBefore(entry, logDiv.firstChild);

        if (logDiv.children.length > 50) {
            logDiv.removeChild(logDiv.lastChild);
        }
    }

    startGameLoop() {
        setInterval(() => {
            if (!this.gameState.paused) {
                for (let i = 0; i < this.gameState.speed; i++) {
                    this.gameState.date.setDate(this.gameState.date.getDate() + 1);
                    this.gameState.equipment += this.gameState.factories * 0.1;
                    this.gameState.factories += 0.01;
                    
                    if (this.gameState.date.getDate() === 1) {
                        this.processProduction();
                        this.gameState.manpower += 1000;
                    }

                    if (this.gameState.atWar && Math.random() < 0.1) {
                        this.processCombat();
                    }
                }
                this.updateUI();
            }
        }, 100);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new HOI4Clone();
});