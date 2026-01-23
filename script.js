// DOM Elements
const board = document.getElementById('board');
const scoreBox = document.getElementById('scoreBox');
const hiscoreBox = document.getElementById('hiscoreBox');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const gameWonScreen = document.getElementById('gameWonScreen');
const finalScoreSpan = document.getElementById('finalScore');
const wonScoreSpan = document.getElementById('wonScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const newHighScoreScreen = document.getElementById('newHighScoreScreen');
const continueBtn = document.getElementById('continueBtn');
const newHighScoreValue = document.getElementById('newHighScoreValue');

// Audio
const foodSound = new Audio('food.mp3');
const gameOverSound = new Audio('gameover.mp3');
const moveSound = new Audio('move.mp3');
const musicSound = new Audio('music.mp3');
musicSound.loop = true;
musicSound.volume = 0.5;

// Game State
let speed = 7;
let lastPaintTime = 0;
let score = 0;
let hiscore = JSON.parse(localStorage.getItem("hiscore")) || 0;
const gridSize = 18;
let isPlaying = false;
let initialHighScore = 0;
let highScoreShown = false;

// Snake & Food
let snake = [{ x: 13, y: 15 }];
let food = { x: 6, y: 7 };
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };

// Initialize
hiscoreBox.innerHTML = hiscore;

// Event Listeners
window.addEventListener('keydown', handleInput);
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);
playAgainBtn.addEventListener('click', resetGame);

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameWonScreen.classList.add('hidden');
    newHighScoreScreen.classList.add('hidden');
    isPlaying = true;
    score = 0;
    initialHighScore = hiscore;
    highScoreShown = false;
    scoreBox.innerHTML = 0;
    snake = [{ x: 13, y: 15 }];
    direction = { x: 0, y: 0 }; // Wait for input
    nextDirection = { x: 0, y: 0 };
    musicSound.currentTime = 0;
    musicSound.play().catch(e => console.log("Audio play failed:", e));

    // Start Loop
    window.requestAnimationFrame(main);
}

function resetGame() {
    startGame();
}

function handleInput(e) {
    if (!isPlaying) return;

    // Prevent default scrolling for arrow keys
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }

    switch (e.key) {
        case "ArrowUp":
            if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
            break;
        case "ArrowDown":
            if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
            break;
        case "ArrowLeft":
            if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
            break;
        case "ArrowRight":
            if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
            break;
        case "w":
        case "W":
            gameWon();
            break;
    }
}

function main(currentTime) {
    if (!isPlaying) return;
    window.requestAnimationFrame(main);

    if ((currentTime - lastPaintTime) / 1000 < 1 / speed) {
        return;
    }

    lastPaintTime = currentTime;
    gameEngine();
}

function gameEngine() {
    // Part 1: Update
    update();
    // Part 2: Draw
    draw();
}

function update() {
    // Apply buffered input
    if ((nextDirection.x !== 0 || nextDirection.y !== 0) &&
        (nextDirection.x !== direction.x || nextDirection.y !== direction.y)) {
        direction = { ...nextDirection };
        moveSound.currentTime = 0;
        moveSound.play().catch(() => { });
    }

    // If no direction set (start of game), don't move
    if (direction.x === 0 && direction.y === 0) return;

    // Calculate new head position
    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    // Check Collision
    if (isCollide(head)) {
        gameOver();
        return;
    }

    // Move Snake
    snake.unshift(head);

    // Check Food
    if (head.x === food.x && head.y === food.y) {
        foodSound.currentTime = 0;
        foodSound.play();
        score += 1;
        scoreBox.innerHTML = score;

        if (score > hiscore) {
            hiscore = score;
            localStorage.setItem("hiscore", JSON.stringify(hiscore));
            hiscoreBox.innerHTML = hiscore;

            // Check if we beat the initial session high score and haven't shown the overlay yet
            if (initialHighScore > 0 && score > initialHighScore && !highScoreShown) {
                showNewHighScore();
            }
        }

        // Check Win Condition (Full Board)
        if (snake.length === gridSize * gridSize) {
            gameWon();
            return;
        }

        // Regenerate Food
        generateFood();

        // Increase speed slightly every 5 points
        if (score % 5 === 0) {
            speed += 0.5;
        }
    } else {
        // Remove tail if not eating
        snake.pop();
    }
}

function generateFood() {
    let validPosition = false;
    let newFood = {};

    // Safety break to prevent infinite loop if board is somehow full but not caught
    let attempts = 0;
    const maxAttempts = 1000;

    while (!validPosition && attempts < maxAttempts) {
        attempts++;
        newFood = {
            x: Math.round(1 + (gridSize - 1) * Math.random()),
            y: Math.round(1 + (gridSize - 1) * Math.random())
        };

        // Check if food spawns on snake
        let onSnake = false;
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === newFood.x && snake[i].y === newFood.y) {
                onSnake = true;
                break;
            }
        }

        if (!onSnake) {
            validPosition = true;
        }
    }

    if (validPosition) {
        food = newFood;
    } else {
        // Fallback: Scan grid for empty spot
        for (let x = 1; x <= gridSize; x++) {
            for (let y = 1; y <= gridSize; y++) {
                let onSnake = false;
                for (let i = 0; i < snake.length; i++) {
                    if (snake[i].x === x && snake[i].y === y) {
                        onSnake = true;
                        break;
                    }
                }
                if (!onSnake) {
                    food = { x, y };
                    return;
                }
            }
        }
        // If we get here, board is full (should be caught by win condition)
        gameWon();
    }
}

function isCollide(head) {
    // Wall Collision
    if (head.x > gridSize || head.x <= 0 || head.y > gridSize || head.y <= 0) {
        return true;
    }

    // Self Collision
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    return false;
}

function gameOver() {
    isPlaying = false;
    gameOverSound.play();
    musicSound.pause();
    finalScoreSpan.innerHTML = score;
    gameOverScreen.classList.remove('hidden');
}

function gameWon() {
    isPlaying = false;
    // You could add a specific win sound here
    musicSound.pause();
    wonScoreSpan.innerHTML = score;
    gameWonScreen.classList.remove('hidden');
}

function showNewHighScore() {
    highScoreShown = true;
    newHighScoreValue.innerHTML = score;
    newHighScoreScreen.classList.remove('hidden');

    // hide automatically, game keeps running
    setTimeout(() => {
        newHighScoreScreen.classList.add('hidden');
    }, 1500);
}



function draw() {
    board.innerHTML = "";

    // Draw Snake
    snake.forEach((e, index) => {
        const snakeElement = document.createElement('div');
        snakeElement.style.gridRowStart = e.y;
        snakeElement.style.gridColumnStart = e.x;

        if (index === 0) {
            snakeElement.classList.add('head');
        } else {
            snakeElement.classList.add('snake');
        }
        board.appendChild(snakeElement);
    });

    // Draw Food
    const foodElement = document.createElement('div');
    foodElement.style.gridRowStart = food.y;
    foodElement.style.gridColumnStart = food.x;
    foodElement.classList.add('food');
    board.appendChild(foodElement);
}
