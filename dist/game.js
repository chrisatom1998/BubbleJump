class BubbleJump {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startButton = document.getElementById('start-button');
        this.scoreElement = document.getElementById('current-score');
        this.highScoreElement = document.getElementById('high-score');
        this.controlsHint = document.getElementById('controls-hint');

        // Set canvas size to match screen dimensions
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Calculate base unit for responsive sizing
        this.baseUnit = Math.min(window.innerWidth, window.innerHeight) / 30;

        // Game state
        this.isPlaying = false;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('bubbleJumpHighScore')) || 0;
        this.updateHighScore();

        // Player properties
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: this.baseUnit,
            velocityX: 0,
            velocityY: 0,
            speed: this.baseUnit * 0.25,
            jumpForce: this.baseUnit * -0.6,
            gravity: this.baseUnit * 0.025,
            color: '#fff'
        };

        // Stars array
        this.stars = [];
        for (let i = 0; i < 5; i++) {
            this.stars.push(this.createStar());
        }

        // Decorative bubbles array
        this.bubbles = [];
        for (let i = 0; i < 15; i++) {
            this.bubbles.push(this.createBubble());
        }

        // Input handling
        this.keys = {
            left: false,
            right: false,
            space: false
        };

        // Touch handling
        this.touchStart = null;
        this.lastTouchX = null;

        // Bind event listeners
        this.bindEvents();

        // Update controls hint for mobile
        this.controlsHint.innerHTML = 'Slide left/right to move<br>Swipe up to jump';

        // Initial render
        this.render();
    }

    bindEvents() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());

        // Start button
        this.startButton.addEventListener('click', () => this.startGame());
    }

    handleKeyDown(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case ' ':
                if (!this.keys.space && this.isPlaying) {
                    this.jump();
                }
                this.keys.space = true;
                break;
        }
    }

    handleKeyUp(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case ' ':
                this.keys.space = false;
                break;
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.touchStart = { 
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
        this.lastTouchX = touch.clientX - rect.left;
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (!this.touchStart || !this.isPlaying) return;

        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        // Smooth horizontal movement
        if (this.lastTouchX !== null) {
            const deltaX = touchX - this.lastTouchX;
            this.player.x += deltaX;
            // Keep player within bounds
            this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
        }
        this.lastTouchX = touchX;

        // Check for jump gesture
        const deltaY = touchY - this.touchStart.y;
        if (deltaY < -this.baseUnit * 2) {
            this.jump();
            this.touchStart = null;
            this.lastTouchX = null;
        }
    }

    handleTouchEnd() {
        this.touchStart = null;
        this.lastTouchX = null;
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.baseUnit = Math.min(window.innerWidth, window.innerHeight) / 30;
        
        // Update game elements scaling
        if (this.player) {
            this.player.radius = this.baseUnit;
            this.player.speed = this.baseUnit * 0.25;
            this.player.jumpForce = this.baseUnit * -0.6;
            this.player.gravity = this.baseUnit * 0.025;
        }
    }

    startGame() {
        this.isPlaying = true;
        this.score = 0;
        this.updateScore();
        this.startButton.classList.add('hidden');
        this.controlsHint.classList.add('hidden');
        
        // Reset player position
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.player.velocityY = 0;

        // Start game loop
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isPlaying) return;

        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Player movement
        if (this.keys.left) this.player.x -= this.player.speed;
        if (this.keys.right) this.player.x += this.player.speed;

        // Apply gravity
        this.player.velocityY += this.player.gravity;
        this.player.y += this.player.velocityY;

        // Keep player in bounds
        this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
        
        // Check for game over
        if (this.player.y > this.canvas.height + this.player.radius) {
            this.gameOver();
            return;
        }

        // Update stars
        this.stars.forEach(star => {
            star.y -= star.speed;
            star.rotation += star.rotationSpeed;

            // Check for collection
            const dx = this.player.x - star.x;
            const dy = this.player.y - star.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.player.radius + star.radius) {
                this.collectStar(star);
            }

            // Reset star if off screen
            if (star.y < -star.radius) {
                Object.assign(star, this.createStar(true));
            }
        });

        // Update bubbles
        this.bubbles.forEach(bubble => {
            bubble.y -= bubble.speed;
            if (bubble.y < -bubble.radius) {
                Object.assign(bubble, this.createBubble(true));
            }
        });
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw bubbles
        this.bubbles.forEach(bubble => {
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = bubble.color;
            this.ctx.globalAlpha = 0.3;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });

        // Draw stars
        this.stars.forEach(star => {
            this.ctx.save();
            this.ctx.translate(star.x, star.y);
            this.ctx.rotate(star.rotation);
            
            // Star glow
            this.ctx.shadowColor = 'yellow';
            this.ctx.shadowBlur = this.baseUnit;
            
            // Draw star
            this.ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5;
                const x = Math.cos(angle) * star.radius;
                const y = Math.sin(angle) * star.radius;
                i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.fillStyle = 'yellow';
            this.ctx.fill();
            
            this.ctx.restore();
        });

        // Draw player
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.player.color;
        
        // Player glow
        this.ctx.shadowColor = 'white';
        this.ctx.shadowBlur = this.baseUnit * 0.75;
        
        this.ctx.fill();

        // Draw player face
        const eyeRadius = this.baseUnit * 0.15;
        const mouthWidth = this.baseUnit * 0.4;
        const eyeOffset = this.baseUnit * 0.35;
        
        // Eyes
        this.ctx.beginPath();
        this.ctx.arc(this.player.x - eyeOffset, this.player.y - eyeOffset * 0.7, eyeRadius, 0, Math.PI * 2);
        this.ctx.arc(this.player.x + eyeOffset, this.player.y - eyeOffset * 0.7, eyeRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'black';
        this.ctx.shadowBlur = 0;
        this.ctx.fill();

        // Mouth
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y + this.baseUnit * 0.25, mouthWidth, 0, Math.PI);
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = this.baseUnit * 0.1;
        this.ctx.stroke();
    }

    jump() {
        this.player.velocityY = this.player.jumpForce;
    }

    createStar(atBottom = false) {
        return {
            x: Math.random() * (this.canvas.width - this.baseUnit * 2) + this.baseUnit,
            y: atBottom ? this.canvas.height + this.baseUnit : Math.random() * this.canvas.height,
            radius: this.baseUnit * 0.75,
            speed: this.baseUnit * (0.1 + Math.random() * 0.05),
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: 0.02 + Math.random() * 0.02
        };
    }

    createBubble(atBottom = false) {
        const colors = ['rgba(255,192,203,0.5)', 'rgba(64,224,208,0.5)']; // pink and turquoise
        return {
            x: Math.random() * this.canvas.width,
            y: atBottom ? this.canvas.height + this.baseUnit : Math.random() * this.canvas.height,
            radius: this.baseUnit * (0.5 + Math.random() * 1.5),
            speed: this.baseUnit * (0.025 + Math.random() * 0.025),
            color: colors[Math.floor(Math.random() * colors.length)]
        };
    }

    collectStar(star) {
        this.score += 100;
        this.updateScore();
        Object.assign(star, this.createStar(true));
    }

    updateScore() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.updateHighScore();
            localStorage.setItem('bubbleJumpHighScore', this.highScore);
        }
    }

    updateHighScore() {
        this.highScoreElement.textContent = `High Score: ${this.highScore}`;
    }

    gameOver() {
        this.isPlaying = false;
        this.startButton.classList.remove('hidden');
        this.controlsHint.classList.remove('hidden');
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new BubbleJump();
});
