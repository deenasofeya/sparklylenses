// --- Persediaan Kanvas & Pembolehubah Utama ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const startBtn = document.getElementById('start-btn');

const TILE_SIZE = 20;
const ROWS = 24;
const COLS = 22;

let score = 0;
let highScore = localStorage.getItem('pacman_strawberry_highscore') || 0;
let lives = 3;
let gameLoopId = null;
let isScaredMode = false;
let scaredTimer = null;
let gameActive = false;

highScoreEl.textContent = highScore;

// --- Peta Permainan (1: Dinding, 0: Strawberi, 2: Kosong, 3: Strawberi Gergasi/Kuasa) ---
const initialMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,3,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,2,1,1,2,1,1,1,0,1,1,1,1,1],
    [2,2,2,2,1,0,1,2,2,2,2,2,2,2,2,1,0,1,2,2,2,2],
    [1,1,1,1,1,0,1,2,1,1,2,2,1,1,2,1,0,1,1,1,1,1],
    [2,2,2,2,2,0,2,2,1,2,2,2,2,1,2,2,0,2,2,2,2,2],
    [1,1,1,1,1,0,1,2,1,1,1,1,1,1,2,1,0,1,1,1,1,1],
    [2,2,2,2,1,0,1,2,2,2,2,2,2,2,2,1,0,1,2,2,2,2],
    [1,1,1,1,1,0,1,2,1,1,1,1,1,1,2,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,3,0,0,1,0,0,0,0,0,2,2,0,0,0,0,0,1,0,0,3,1],
    [1,1,1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1,0,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let map = JSON.parse(JSON.stringify(initialMap));

// --- Ciri Audio Sintesis (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'eat') {
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'power') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}

// --- Kelas Pac-Man ---
class Pacman {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 10 * TILE_SIZE + TILE_SIZE / 2;
        this.y = 16 * TILE_SIZE + TILE_SIZE / 2;
        this.speed = 2;
        this.dirX = 0;
        this.dirY = 0;
        this.nextDirX = 0;
        this.nextDirY = 0;
        this.radius = TILE_SIZE / 2 - 2;
        this.mouthAngle = 0.2;
        this.mouthSpeed = 0.02;
    }

    update() {
        // Cuba tukar arah jika pergerakan seterusnya sah
        if (this.nextDirX !== 0 || this.nextDirY !== 0) {
            if (this.canMove(this.nextDirX, this.nextDirY)) {
                this.dirX = this.nextDirX;
                this.dirY = this.nextDirY;
            }
        }

        // Semak halangan di hadapan
        if (this.canMove(this.dirX, this.dirY)) {
            this.x += this.dirX * this.speed;
            this.y += this.dirY * this.speed;
        }

        // Animasi Mulut
        this.mouthAngle += this.mouthSpeed;
        if (this.mouthAngle > 0.4 || this.mouthAngle < 0.02) {
            this.mouthSpeed = -this.mouthSpeed;
        }

        // Semak pemakanan Strawberi
        this.checkEat();
    }

    canMove(dx, dy) {
        let nextX = this.x + dx * this.speed;
        let nextY = this.y + dy * this.speed;

        let gridX = Math.floor(nextX / TILE_SIZE);
        let gridY = Math.floor(nextY / TILE_SIZE);

        // Abaikan sempadan jika lalu laluan lorong (tunnel)
        if (gridX < 0 || gridX >= COLS) return true;

        return map[gridY] && map[gridY][gridX] !== 1;
    }

    checkEat() {
        let gridX = Math.floor(this.x / TILE_SIZE);
        let gridY = Math.floor(this.y / TILE_SIZE);

        // Laluan Terowong Melintasi Skrin
        if (gridX < 0) this.x = (COLS - 1) * TILE_SIZE;
        if (gridX >= COLS) this.x = 0;

        if (map[gridY] && map[gridY][gridX] === 0) {
            map[gridY][gridX] = 2;
            score += 10;
            playSound('eat');
            updateScore();
        } else if (map[gridY] && map[gridY][gridX] === 3) {
            map[gridY][gridX] = 2;
            score += 50;
            playSound('power');
            triggerScaredMode();
            updateScore();
        }
    }

    draw() {
        ctx.beginPath();
        let angle = 0;
        if (this.dirX === 1) angle = 0;
        if (this.dirX === -1) angle = Math.PI;
        if (this.dirY === 1) angle = Math.PI / 2;
        if (this.dirY === -1) angle = (Math.PI * 3) / 2;

        ctx.arc(
            this.x,
            this.y,
            this.radius,
            angle + this.mouthAngle,
            angle + Math.PI * 2 - this.mouthAngle
        );
        ctx.lineTo(this.x, this.y);
        ctx.fillStyle = '#ffcc00';
        ctx.fill();
        ctx.closePath();
    }
}

// --- Kelas Hantu ---
class Ghost {
    constructor(x, y, color) {
        this.startX = x;
        this.startY = y;
        this.color = color;
        this.reset();
    }

    reset() {
        this.x = this.startX * TILE_SIZE + TILE_SIZE / 2;
        this.y = this.startY * TILE_SIZE + TILE_SIZE / 2;
        this.speed = 1.5;
        this.dirX = 0;
        this.dirY = -1;
    }

    update() {
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;

        // Buka keputusan arah di persimpangan
        if (Math.floor(this.x) % TILE_SIZE === TILE_SIZE / 2 && Math.floor(this.y) % TILE_SIZE === TILE_SIZE / 2) {
            this.changeDirection();
        }
    }

    changeDirection() {
        const directions = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
        ];

        // Tapis arah yang melanggar dinding
        let validDirs = directions.filter(d => {
            if (d.x === -this.dirX && d.y === -this.dirY) return false; // Elak terus patah balik
            let gX = Math.floor((this.x + d.x * TILE_SIZE) / TILE_SIZE);
            let gY = Math.floor((this.y + d.y * TILE_SIZE) / TILE_SIZE);
            return map[gY] && map[gY][gX] !== 1;
        });

        if (validDirs.length > 0) {
            let chosen = validDirs[Math.floor(Math.random() * validDirs.length)];
            this.dirX = chosen.x;
            this.dirY = chosen.y;
        } else {
            this.dirX = -this.dirX;
            this.dirY = -this.dirY;
        }
    }

    draw() {
        ctx.beginPath();
        let r = TILE_SIZE / 2 - 2;
        ctx.arc(this.x, this.y - 2, r, Math.PI, 0, false);
        ctx.lineTo(this.x + r, this.y + r);
        ctx.lineTo(this.x - r, this.y + r);
        ctx.fillStyle = isScaredMode ? '#0055ff' : this.color;
        ctx.fill();
        ctx.closePath();

        // Mata Hantu
        ctx.beginPath();
        ctx.arc(this.x - 4, this.y - 4, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 4, this.y - 4, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x - 4 + this.dirX, this.y - 4 + this.dirY, 1.5, 0, Math.PI * 2);
        ctx.arc(this.x + 4 + this.dirX, this.y - 4 + this.dirY, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = isScaredMode ? '#ffcc00' : '#000000';
        ctx.fill();
    }
}

// Inisialisasi Objek Permainan
const pacman = new Pacman();
const ghosts = [
    new Ghost(10, 10, '#ff0000'), // Merah
    new Ghost(11, 10, '#ffb8ff'), // Merah Jambu
    new Ghost(10, 9, '#00ffff'),  // Biru Muda
    new Ghost(11, 9, '#ffb852')   // Oren
];

// --- Melukis Strawberi & Peta ---
function drawMap() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 1) {
                // Dinding
                ctx.fillStyle = '#002b80';
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#00d2ff';
                ctx.strokeRect(c * TILE_SIZE + 2, r * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            } else if (map[r][c] === 0) {
                // Strawberi Kecil
                drawStrawberry(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, 5);
            } else if (map[r][c] === 3) {
                // Strawberi Gergasi (Kuasa)
                drawStrawberry(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, 9);
            }
        }
    }
}

function drawStrawberry(x, y, size) {
    ctx.save();
    ctx.translate(x, y);

    // Buah Strawberi (Segi Tiga Bulat)
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.quadraticCurveTo(-size, 0, -size / 2, -size / 2);
    ctx.quadraticCurveTo(0, -size / 1.2, size / 2, -size / 2);
    ctx.quadraticCurveTo(size, 0, 0, size);
    ctx.fillStyle = '#ff3366';
    ctx.fill();

    // Daun Hijau
    ctx.beginPath();
    ctx.arc(0, -size / 2, size / 3, 0, Math.PI * 2);
    ctx.fillStyle = '#2ecc71';
    ctx.fill();

    ctx.restore();
}

// --- Mod Hantu Takut ---
function triggerScaredMode() {
    isScaredMode = true;
    if (scaredTimer) clearTimeout(scaredTimer);
    scaredTimer = setTimeout(() => {
        isScaredMode = false;
    }, 7000);
}

// --- Kemaskini Skor & Nyawa ---
function updateScore() {
    scoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;
        localStorage.setItem('pacman_strawberry_highscore', highScore);
    }

    // Semak Kemenangan
    let hasStrawberry = map.some(row => row.includes(0) || row.includes(3));
    if (!hasStrawberry) {
        endGame(true);
    }
}

function updateLivesDisplay() {
    livesEl.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        livesEl.innerHTML += '<span class="strawberry-life">🍓</span>';
    }
}

// --- Pengendalian Perlanggaran ---
function checkCollisions() {
    ghosts.forEach(ghost => {
        let dist = Math.hypot(pacman.x - ghost.x, pacman.y - ghost.y);
        if (dist < TILE_SIZE / 1.2) {
            if (isScaredMode) {
                // Makan Hantu
                playSound('power');
                score += 200;
                updateScore();
                ghost.reset();
            } else {
                // Pac-Man Terkena Hantu
                playSound('die');
                lives--;
                updateLivesDisplay();

                if (lives <= 0) {
                    endGame(false);
                } else {
                    pacman.reset();
                    ghosts.forEach(g => g.reset());
                }
            }
        }
    });
}

// --- Gelung Permainan Utama (Game Loop) ---
function gameLoop() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawMap();
    pacman.update();
    pacman.draw();

    ghosts.forEach(ghost => {
        ghost.update();
        ghost.draw();
    });

    checkCollisions();

    gameLoopId = requestAnimationFrame(gameLoop);
}

// --- Kawalan Arah Pergerakan ---
function setDirection(dir) {
    if (dir === 'UP') { pacman.nextDirX = 0; pacman.nextDirY = -1; }
    if (dir === 'DOWN') { pacman.nextDirX = 0; pacman.nextDirY = 1; }
    if (dir === 'LEFT') { pacman.nextDirX = -1; pacman.nextDirY = 0; }
    if (dir === 'RIGHT') { pacman.nextDirX = 1; pacman.nextDirY = 0; }
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || e.key === 'w') setDirection('UP');
    if (e.key === 'ArrowDown' || e.key === 's') setDirection('DOWN');
    if (e.key === 'ArrowLeft' || e.key === 'a') setDirection('LEFT');
    if (e.key === 'ArrowRight' || e.key === 'd') setDirection('RIGHT');
});

// --- Mula / Tamat Permainan ---
function startGame() {
    map = JSON.parse(JSON.stringify(initialMap));
    score = 0;
    lives = 3;
    isScaredMode = false;
    gameActive = true;

    updateScore();
    updateLivesDisplay();
    pacman.reset();
    ghosts.forEach(g => g.reset());

    overlay.classList.add('hidden');

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
}

function endGame(isWin) {
    gameActive = false;
    overlay.classList.remove('hidden');

    if (isWin) {
        overlayTitle.textContent = 'TAHNIAH! ANDA MENANG!';
        overlayMsg.textContent = `Anda berjaya makan semua strawberi! Skor: ${score}`;
    } else {
        overlayTitle.textContent = 'GAME OVER';
        overlayMsg.textContent = `Strawberi anda telah habis direbut hantu. Skor: ${score}`;
    }

    startBtn.textContent = 'MAIN SEMULA';
}

startBtn.addEventListener('click', startGame);