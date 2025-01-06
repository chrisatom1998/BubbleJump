class BubbleGame {
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
        this.combo = 0;
        this.level = 1;
        this.timeLeft = 60; // 60 seconds per level
        this.highScore = parseInt(localStorage.getItem('bubbleGameHighScore')) || 0;
        this.updateHighScore();

        // Color sequence for bubbles
        this.colors = ['#FF4136', '#2ECC40', '#0074D9', '#FFDC00', '#B10DC9'];
        this.currentSequence = [];
        this.playerSequence = [];

        // Power-ups
        this.powerUps = {
            timeFreezer: { active: false, duration: 5000 },
            colorBlast: { active: false, color: null },
            scoreDoubler: { active: false, duration: 10000 }
        };

        // Bubbles array
        this.bubbles = [];

        // Bind event listeners
        this.bindEvents();

        // Update controls hint
        this.controlsHint.innerHTML = 'Tap bubbles in the correct sequence!';

        // Initial render
        this.render();
    }

    bindEvents() {
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // Start button
        this.startButton.addEventListener('click', () => this.startGame());
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleInteraction(touch.clientX, touch.clientY);
    }

    handleClick(e) {
        this.handleInteraction(e.clientX, e.clientY);
    }

    handleInteraction(clientX, clientY) {
        if (!this.isPlaying) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Check bubble collision
        for (let i = 0; i < this.bubbles.length; i++) {
            const bubble = this.bubbles[i];
            const dx = x - bubble.x;
            const dy = y - bubble.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < bubble.radius) {
                this.popBubble(bubble);
                break;
            }
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.baseUnit = Math.min(window.innerWidth, window.innerHeight) / 30;
    }

    startGame() {
        this.isPlaying = true;
        this.score = 0;
        this.combo = 0;
        this.level = 1;
        this.timeLeft = 60;
        this.updateScore();
        this.startButton.classList.add('hidden');
        this.controlsHint.classList.add('hidden');
        
        // Generate initial sequence
        this.generateSequence();
        
        // Start game loop
        this.gameLoop();
    }

    generateSequence() {
        this.currentSequence = [];
        this.playerSequence = [];
        const sequenceLength = Math.min(3 + Math.floor(this.level / 2), this.colors.length);
        
        // Generate random sequence
        for (let i = 0; i < sequenceLength; i++) {
            this.currentSequence.push(Math.floor(Math.random() * this.colors.length));
        }

        // Create bubbles for the sequence
        this.bubbles = [];
        for (let i = 0; i < this.currentSequence.length; i++) {
            const angle = (i * 2 * Math.PI) / this.currentSequence.length;
            const radius = this.baseUnit * 6;
            const x = this.canvas.width / 2 + Math.cos(angle) * radius;
            const y = this.canvas.height / 2 + Math.sin(angle) * radius;

            this.bubbles.push({
                x,
                y,
                radius: this.baseUnit * 2,
                color: this.colors[this.currentSequence[i]],
                sequenceIndex: i,
                scale: 1,
                popping: false
            });
        }
    }

    gameLoop() {
        if (!this.isPlaying) return;

        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Update time
        if (!this.powerUps.timeFreezer.active) {
            this.timeLeft -= 1/60; // Decrease by 1 second every 60 frames
        }

        // Check for game over
        if (this.timeLeft <= 0) {
            this.gameOver();
            return;
        }

        // Update power-ups
        this.updatePowerUps();

        // Update bubble animations
        this.bubbles.forEach(bubble => {
            if (bubble.popping) {
                bubble.scale *= 0.9;
                if (bubble.scale < 0.1) {
                    bubble.scale = 0;
                }
            }
        });
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw bubbles
        this.bubbles.forEach(bubble => {
            if (bubble.scale > 0) {
                this.ctx.save();
                this.ctx.translate(bubble.x, bubble.y);
                this.ctx.scale(bubble.scale, bubble.scale);
                
                // Bubble glow
                this.ctx.shadowColor = bubble.color;
                this.ctx.shadowBlur = this.baseUnit * 0.5;
                
                // Draw bubble
                this.ctx.beginPath();
                this.ctx.arc(0, 0, bubble.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = bubble.color;
                this.ctx.fill();
                
                // Draw sequence number
                this.ctx.fillStyle = 'white';
                this.ctx.font = `bold ${this.baseUnit * 1.5}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(bubble.sequenceIndex + 1, 0, 0);
                
                this.ctx.restore();
            }
        });

        // Draw timer
        this.ctx.fillStyle = 'white';
        this.ctx.font = `${this.baseUnit * 1.2}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Time: ${Math.ceil(this.timeLeft)}s`, this.canvas.width / 2, this.baseUnit * 2);
        
        // Draw level
        this.ctx.fillText(`Level ${this.level}`, this.canvas.width / 2, this.baseUnit * 4);
        
        // Draw combo
        if (this.combo > 1) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText(`Combo x${this.combo}!`, this.canvas.width / 2, this.canvas.height - this.baseUnit * 4);
        }

        // Draw power-up indicators
        if (this.powerUps.timeFreezer.active) {
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.fillText('Time Frozen!', this.canvas.width / 2, this.baseUnit * 6);
        }
        if (this.powerUps.scoreDoubler.active) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText('Score x2!', this.canvas.width / 2, this.baseUnit * 8);
        }
    }

    popBubble(bubble) {
        if (bubble.popping) return;

        const expectedIndex = this.playerSequence.length;
        if (bubble.sequenceIndex === expectedIndex) {
            // Correct sequence
            bubble.popping = true;
            this.playerSequence.push(bubble.sequenceIndex);
            
            // Update score and combo
            const basePoints = 100;
            const comboMultiplier = this.combo;
            const doubleMultiplier = this.powerUps.scoreDoubler.active ? 2 : 1;
            this.score += basePoints * comboMultiplier * doubleMultiplier;
            this.combo++;
            
            this.updateScore();

            // Check if sequence is complete
            if (this.playerSequence.length === this.currentSequence.length) {
                this.levelComplete();
            }
        } else {
            // Wrong sequence
            this.combo = 0;
            this.playerSequence = [];
            this.generateSequence(); // Reset sequence
        }
    }

    levelComplete() {
        this.level++;
        this.timeLeft = Math.max(30, 60 - (this.level * 5)); // Decrease time per level
        this.generateSequence();

        // Random chance to spawn power-up
        if (Math.random() < 0.3) {
            this.activateRandomPowerUp();
        }
    }

    activateRandomPowerUp() {
        const powerUps = ['timeFreezer', 'scoreDoubler'];
        const randomPowerUp = powerUps[Math.floor(Math.random() * powerUps.length)];
        
        switch (randomPowerUp) {
            case 'timeFreezer':
                this.powerUps.timeFreezer.active = true;
                setTimeout(() => {
                    this.powerUps.timeFreezer.active = false;
                }, this.powerUps.timeFreezer.duration);
                break;
            case 'scoreDoubler':
                this.powerUps.scoreDoubler.active = true;
                setTimeout(() => {
                    this.powerUps.scoreDoubler.active = false;
                }, this.powerUps.scoreDoubler.duration);
                break;
        }
    }

    updatePowerUps() {
        // Update power-up timers here if needed
    }

    updateScore() {
        this.scoreElement.textContent = `Score: ${this.score}`;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.updateHighScore();
            localStorage.setItem('bubbleGameHighScore', this.highScore);
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
    new BubbleGame();
});
