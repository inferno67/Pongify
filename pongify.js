// --- Menu logic ---
const menuScreen = document.getElementById('menu');
const gameArea = document.getElementById('gameArea');
const modeBtns = document.querySelectorAll('.mode-btn');
const difficultyLabel = document.getElementById('difficultyLabel');
const backBtn = document.getElementById('backBtn');

let selectedMode = "easy";
let gameInstance = null;

// Difficulty settings
const DIFFICULTY = {
    easy: {
        ballSpeed: 5,
        aiSpeed: 5,
        paddleSpeed: 8,
        paddleHeight: 120,
        aiAccuracy: 0.70,
    },
    medium: {
        ballSpeed: 7,
        aiSpeed: 7,
        paddleSpeed: 9,
        paddleHeight: 100,
        aiAccuracy: 0.85,
    },
    hard: {
        ballSpeed: 9,
        aiSpeed: 10,
        paddleSpeed: 10,
        paddleHeight: 80,
        aiAccuracy: 0.98,
    }
};

modeBtns.forEach(btn => {
    btn.onclick = () => {
        selectedMode = btn.dataset.mode;
        menuScreen.style.display = "none";
        gameArea.style.display = "flex";
        difficultyLabel.textContent = selectedMode.toUpperCase() + " MODE";
        setTimeout(() => {
            gameInstance = new Game(
                document.getElementById('pong'),
                document.getElementById('pong').getContext('2d'),
                DIFFICULTY[selectedMode]
            );
        }, 300);
    };
});

backBtn.onclick = () => {
    gameInstance && gameInstance.destroy();
    menuScreen.style.display = "flex";
    gameArea.style.display = "none";
};

// --- Game logic ---
class Paddle {
    constructor(x, y, width, height, isAI = false, speed = 8) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isAI = isAI;
        this.speed = speed;
        this.targetY = y;
    }

    move(ball = null, canvasHeight = 500, aiAccuracy = 0.8) {
        if (this.isAI && ball) {
            // Improved AI: Predict ball position, add reaction error
            if (ball.vx > 0) {
                let prediction = ball.y + (Math.random() - 0.5) * (1 - aiAccuracy) * 180;
                this.targetY = prediction - this.height / 2;
            }
            // Smooth movement
            if (this.y < this.targetY) {
                this.y += this.speed;
                if (this.y > this.targetY) this.y = this.targetY;
            } else if (this.y > this.targetY) {
                this.y -= this.speed;
                if (this.y < this.targetY) this.y = this.targetY;
            }
        }
        // Clamp paddle inside canvas
        this.y = Math.max(0, Math.min(canvasHeight - this.height, this.y));
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = "#6c63ff";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#fff";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    get rect() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
}

class Ball {
    constructor(x, y, radius, speed = 6) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.baseSpeed = speed;
        this.speed = speed;
        this.vx = speed * (Math.random() < 0.5 ? 1 : -1);
        this.vy = speed * (Math.random() < 0.5 ? 1 : -1);
        this.lastHitBy = null;
    }

    reset(centerX, centerY) {
        this.x = centerX;
        this.y = centerY;
        this.speed = this.baseSpeed;
        let angle = (Math.random() * Math.PI / 2) - Math.PI / 4;
        let dir = (Math.random() < 0.5 ? 1 : -1);
        this.vx = dir * this.speed * Math.cos(angle);
        this.vy = this.speed * Math.sin(angle);
        this.lastHitBy = null;
    }

    move(canvasWidth, canvasHeight) {
        this.x += this.vx;
        this.y += this.vy;

        // Wall collisions
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -1;
        }
        if (this.y + this.radius > canvasHeight) {
            this.y = canvasHeight - this.radius;
            this.vy *= -1;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = "#2196f3";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.restore();
    }
}

class Game {
    constructor(canvas, ctx, difficulty) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.width = canvas.width;
        this.height = canvas.height;

        // Difficulty settings
        this.difficulty = difficulty;

        // Paddle dimensions
        this.paddleW = 20;
        this.paddleH = difficulty.paddleHeight;
        this.margin = 32;

        // Entities
        this.player = new Paddle(
            this.margin,
            this.height / 2 - this.paddleH / 2,
            this.paddleW,
            this.paddleH,
            false,
            difficulty.paddleSpeed
        );
        this.ai = new Paddle(
            this.width - this.margin - this.paddleW,
            this.height / 2 - this.paddleH / 2,
            this.paddleW,
            this.paddleH,
            true,
            difficulty.aiSpeed
        );
        this.ball = new Ball(this.width / 2, this.height / 2, 13, difficulty.ballSpeed);

        // Score
        this.playerScore = 0;
        this.aiScore = 0;
        this.maxScore = 10;
        this.running = true;

        // Mouse control
        this.mouseMoveHandler = e => this.handleMouse(e);
        this.restartBtnHandler = () => this.restart();
        this.restartBtn = document.getElementById('restartBtn');
        canvas.addEventListener('mousemove', this.mouseMoveHandler);
        this.restartBtn.addEventListener('click', this.restartBtnHandler);

        this.loop = this.loop.bind(this);
        this.rafId = requestAnimationFrame(this.loop);
    }

    destroy() {
        this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
        this.restartBtn.removeEventListener('click', this.restartBtnHandler);
        cancelAnimationFrame(this.rafId);
    }

    handleMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        let mouseY = e.clientY - rect.top;
        this.player.y = mouseY - this.player.height / 2;
        this.player.y = Math.max(0, Math.min(this.height - this.player.height, this.player.y));
    }

    restart() {
        this.playerScore = 0;
        this.aiScore = 0;
        this.running = true;
        this.ball.reset(this.width / 2, this.height / 2);
    }

    drawNet() {
        this.ctx.save();
        this.ctx.strokeStyle = "#fff";
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([16, 16]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.width / 2, 0);
        this.ctx.lineTo(this.width / 2, this.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.restore();
    }

    drawScore() {
        this.ctx.font = "bold 48px 'Segoe UI', Arial";
        this.ctx.fillStyle = "#fff";
        this.ctx.textAlign = "center";
        this.ctx.fillText(this.playerScore, this.width / 2 - 80, 70);
        this.ctx.fillText(this.aiScore, this.width / 2 + 80, 70);

        if (!this.running) {
            let winner = this.playerScore > this.aiScore ? "You Win!" : "AI Wins!";
            this.ctx.font = "bold 38px 'Segoe UI', Arial";
            this.ctx.fillStyle = "#4caf50";
            this.ctx.fillText(winner, this.width / 2, this.height / 2 - 34);
            this.ctx.font = "24px Arial";
            this.ctx.fillStyle = "#fff";
            this.ctx.fillText("Press Restart or Menu to play again", this.width / 2, this.height / 2 + 20);
        }
    }

    checkCollision(paddle) {
        // Precise ball-paddle collision
        let rect = paddle.rect;
        let ballNextX = this.ball.x + this.ball.vx;
        let ballNextY = this.ball.y + this.ball.vy;

        // Closest point on paddle to ball center
        let closestX = Math.max(rect.left, Math.min(ballNextX, rect.right));
        let closestY = Math.max(rect.top, Math.min(ballNextY, rect.bottom));
        let distX = ballNextX - closestX;
        let distY = ballNextY - closestY;
        let distance = Math.sqrt(distX * distX + distY * distY);

        return distance < this.ball.radius;
    }

    handlePaddleCollision(paddle) {
        // Reverse ball direction, add angle based on hit position
        let rect = paddle.rect;

        // Move ball just outside paddle to prevent sticking
        if (this.ball.vx < 0) { // left paddle
            this.ball.x = rect.right + this.ball.radius;
        } else { // right paddle
            this.ball.x = rect.left - this.ball.radius;
        }

        // Calculate hit position
        let relativeIntersectY = (this.ball.y - (paddle.y + paddle.height / 2));
        let normalizedRelativeIntersectionY = relativeIntersectY / (paddle.height / 2);
        let bounceAngle = normalizedRelativeIntersectionY * (Math.PI / 4); // Max 45 degrees

        // Speed up after each hit (cap at 18)
        this.ball.speed = Math.min(this.ball.speed + 0.5, 18);

        let direction = this.ball.vx < 0 ? 1 : -1;
        this.ball.vx = direction * this.ball.speed * Math.cos(bounceAngle);
        this.ball.vy = this.ball.speed * Math.sin(bounceAngle);
        this.ball.lastHitBy = paddle.isAI ? "AI" : "Player";
    }

    update() {
        if (!this.running) return;

        this.ball.move(this.width, this.height);

        // Paddle movement
        this.ai.move(this.ball, this.height, this.difficulty.aiAccuracy);

        // Collision detection
        if (this.checkCollision(this.player)) {
            this.handlePaddleCollision(this.player);
        }
        if (this.checkCollision(this.ai)) {
            this.handlePaddleCollision(this.ai);
        }

        // Score logic
        if (this.ball.x - this.ball.radius < 0) {
            // AI scores
            this.aiScore++;
            this.ball.reset(this.width / 2, this.height / 2);
        }
        if (this.ball.x + this.ball.radius > this.width) {
            // Player scores
            this.playerScore++;
            this.ball.reset(this.width / 2, this.height / 2);
        }

        // Game end
        if (this.playerScore >= this.maxScore || this.aiScore >= this.maxScore) {
            this.running = false;
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw net
        this.drawNet();

        // Draw paddles and ball
        this.player.draw(this.ctx);
        this.ai.draw(this.ctx);
        this.ball.draw(this.ctx);

        // Draw score
        this.drawScore();
    }

    loop() {
        this.update();
        this.draw();
        this.rafId = requestAnimationFrame(this.loop);
    }
}

// --- End Game logic ---