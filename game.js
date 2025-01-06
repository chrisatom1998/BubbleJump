class BubbleGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startButton = document.getElementById('start-button');
        this.scoreElement = document.getElementById('current-score');
        this.highScoreElement = document.getElementById('high-score');
        this.controlsHint = document.getElementById('controls-hint');

        // Create background bubbles
        this.createBackgroundBubbles();

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
        this.lastTapTime = 0; // Track last bubble tap time
        this.timeLeft = 60; // 60 seconds per level
        this.highScore = parseInt(localStorage.getItem('bubbleGameHighScore')) || 0;
        this.updateHighScore();

        // Color sequence for bubbles (expanded to support more bubbles)
        this.colors = [
            '#FF4136', // Red
            '#2ECC40', // Green
            '#0074D9', // Blue
            '#FFDC00', // Yellow
            '#B10DC9', // Purple
            '#FF851B', // Orange
            '#39CCCC', // Teal
            '#F012BE', // Magenta
            '#01FF70', // Lime
            '#7FDBFF', // Light Blue
            '#FF69B4', // Hot Pink
            '#FFB6C1', // Light Pink
            '#98FB98', // Pale Green
            '#DDA0DD', // Plum
            '#87CEEB', // Sky Blue
            '#CD853F', // Peru
            '#8B4513', // Saddle Brown
            '#4B0082', // Indigo
            '#9370DB', // Medium Purple
            '#48D1CC'  // Medium Turquoise
        ];
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

    createBackgroundBubbles() {
        for (let i = 0; i < 20; i++) {
            const bubble = document.createElement('div');
            bubble.classList.add('bubble');
            const size = Math.random() * 60 + 20; // Random size between 20px and 80px
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${Math.random() * 100}%`;
            bubble.style.animationDuration = `${Math.random() * 10 + 5}s`; // Random duration between 5-15s
            bubble.style.animationDelay = `${Math.random() * 5}s`; // Random delay up to 5s
            document.body.appendChild(bubble);

            // Remove and recreate bubble when animation ends
            bubble.addEventListener('animationend', () => {
                bubble.remove();
                this.createSingleBackgroundBubble();
            });
        }
    }

    createSingleBackgroundBubble() {
        const bubble = document.createElement('div');
        bubble.classList.add('bubble');
        const size = Math.random() * 60 + 20;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.animationDuration = `${Math.random() * 10 + 5}s`;
        document.body.appendChild(bubble);

        bubble.addEventListener('animationend', () => {
            bubble.remove();
            this.createSingleBackgroundBubble();
        });
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
        this.lastTapTime = 0;
        this.updateScore();
        this.startButton.classList.add('hidden');
        this.controlsHint.classList.add('hidden');
        
        // Generate initial sequence
        this.generateSequence();
        
        // Start game loop
        this.gameLoop();
    }

    getRandomPosition(bubbleRadius) {
        // Add padding from edges
        const padding = bubbleRadius * 2;
        return {
            x: padding + Math.random() * (this.canvas.width - padding * 2),
            y: padding + Math.random() * (this.canvas.height - padding * 2)
        };
    }

    checkBubbleOverlap(newX, newY, radius, existingBubbles) {
        // Check minimum distance between bubbles (add some padding)
        const minDistance = radius * 2.5;
        
        for (const bubble of existingBubbles) {
            const dx = newX - bubble.x;
            const dy = newY - bubble.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                return true; // Overlap detected
            }
        }
        return false; // No overlap
    }

    generateSequence() {
        this.currentSequence = [];
        this.playerSequence = [];
        // Start with 3 bubbles, add 1 every level up to 20
        const sequenceLength = Math.min(3 + (this.level - 1), 20);
        
        // Generate random sequence
        for (let i = 0; i < sequenceLength; i++) {
            this.currentSequence.push(Math.floor(Math.random() * this.colors.length));
        }

        // Create bubbles for the sequence
        this.bubbles = [];
        const bubbleRadius = this.baseUnit * 2;
        
        for (let i = 0; i < this.currentSequence.length; i++) {
            let position;
            let attempts = 0;
            const maxAttempts = 100;

            // Keep trying to find a non-overlapping position
            do {
                position = this.getRandomPosition(bubbleRadius);
                attempts++;
                
                // If we can't find a spot after max attempts, use a backup grid position
                if (attempts >= maxAttempts) {
                    const gridSize = Math.ceil(Math.sqrt(this.currentSequence.length));
                    const cellWidth = this.canvas.width / (gridSize + 1);
                    const cellHeight = this.canvas.height / (gridSize + 1);
                    const row = Math.floor(i / gridSize);
                    const col = i % gridSize;
                    position = {
                        x: cellWidth + col * cellWidth,
                        y: cellHeight + row * cellHeight
                    };
                    break;
                }
            } while (this.checkBubbleOverlap(position.x, position.y, bubbleRadius, this.bubbles));

            this.bubbles.push({
                x: position.x,
                y: position.y,
                radius: bubbleRadius,
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
        
        // Draw combo and speed bonus
        if (this.combo > 1) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText(`Combo x${this.combo}!`, this.canvas.width / 2, this.canvas.height - this.baseUnit * 4);
        }

        // Show speed bonus potential
        const timeSinceLastTap = Date.now() - this.lastTapTime;
        if (this.lastTapTime > 0 && timeSinceLastTap < 2000) {
            const potentialMultiplier = Math.min(3, Math.max(1, 3 - (timeSinceLastTap / 1000)));
            if (potentialMultiplier > 1) {
                this.ctx.fillStyle = '#00FF00';
                this.ctx.fillText(`Speed x${potentialMultiplier.toFixed(1)}`, this.canvas.width / 2, this.canvas.height - this.baseUnit * 6);
            }
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
            
            // Calculate speed multiplier
            const currentTime = Date.now();
            let speedMultiplier = 1;
            
            if (this.lastTapTime > 0) {
                const timeDiff = currentTime - this.lastTapTime;
                // Faster taps = higher multiplier (up to 3x)
                // 500ms or less = 3x, 1000ms = 2x, 2000ms = 1x
                speedMultiplier = Math.min(3, Math.max(1, 3 - (timeDiff / 1000)));
            }
            this.lastTapTime = currentTime;

            // Update score and combo
            const basePoints = 100;
            const comboMultiplier = this.combo;
            const doubleMultiplier = this.powerUps.scoreDoubler.active ? 2 : 1;
            const points = Math.round(basePoints * comboMultiplier * doubleMultiplier * speedMultiplier);
            this.score += points;
            this.combo++;
            
            // Show speed bonus text
            if (speedMultiplier > 1) {
                this.ctx.save();
                this.ctx.fillStyle = '#FFD700';
                this.ctx.font = `${this.baseUnit * 1.2}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`Speed Bonus x${speedMultiplier.toFixed(1)}!`, this.canvas.width / 2, this.canvas.height - this.baseUnit * 6);
                this.ctx.restore();
            }
            
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
