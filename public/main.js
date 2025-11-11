// Game constants
const BOARD_WIDTH = 20;
const BOARD_SIZE = BOARD_WIDTH * BOARD_WIDTH;

// Game elements
const WALL = 1;
const PACKET = 0;
const EMPTY = 2;
const POWER_BOOST = 3;
const GUARDIAN_START = 4;
const VIRUS_START = 5;

// Game state
let maze = [];
let guardianIndex = 0;
let score = 0;
let lives = 3;
let level = 1;
let isBoostActive = false;
let gameInterval;
let isGameRunning = false;
let remainingPackets = 0;
let nextLevelScore = 250;

// Virus objects
let viruses = [];

// Mobile controls state
let activeDirection = null;
let moveInterval = null;
const MOVE_SPEED = 150; // Player move speed (ms)
const VIRUS_MOVE_INTERVAL = 200; // Virus base move speed (ms)

// Menu state
let isMenuOpen = false;

// Performance optimization cache for DOM updates
let previousGuardianIndex = -1;
let previousVirusIndices = [];

// Initialize the game
function initGame() {
createMaze();
createBoard();
resetGameState();
drawCharacters();

// Set up event listeners
document.addEventListener('keydown', handleKeyPress);
document.addEventListener('keyup', handleKeyUp);

// Mobile controls
setupMobileControls();

// Menu controls - UPDATED FOR EXTERNAL PAGE NAVIGATION
setupMenuControls();

// Start overlay controls
setupStartOverlay();

// Prevent context menu on mobile buttons
document.querySelectorAll('.mobile-btn').forEach(btn => {
btn.addEventListener('contextmenu', (e) => e.preventDefault());
});

// REMOVED: window.addEventListener('resize', ...) as it's often unnecessary overhead
}

// Setup menu controls - UPDATED FOR EXTERNAL PAGE NAVIGATION
function setupMenuControls() {
const menuBtn = document.getElementById('game-menu-btn');
const closeBtn = document.getElementById('close-menu-btn');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const resetBtn = document.getElementById('reset-game-btn');

// Main Menu Button Listener
menuBtn.addEventListener('click', () => {
if (isGameRunning) {
togglePause(); // Pause the game when opening the menu
}
toggleMenu();
updatePauseButtonText();
});

// Close Button Listener
closeBtn.addEventListener('click', () => {
toggleMenu(); // Close the menu
// Only resume if the game was running before the menu opened
if (!isMenuOpen && !isGameRunning && score > 0) {
togglePause();
}
});

// Standard Menu Option Listeners
pauseResumeBtn.addEventListener('click', () => {
togglePause();
toggleMenu(); // Close menu after action
});

resetBtn.addEventListener('click', () => {
resetGame();
toggleMenu();
});
}

// Setup start overlay
function setupStartOverlay() {
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-game-btn');

// FIX: Start पर header दिखाना
document.querySelector('header').style.display = 'block';

startBtn.addEventListener('click', () => {
startOverlay.classList.remove('active');

// FIX: Game शुरू होने पर header छिपाना
document.querySelector('header').style.display = 'none';

startGame();
});
}

// Toggle game menu
function toggleMenu() {
const menu = document.getElementById('game-menu');
isMenuOpen = !isMenuOpen;

if (isMenuOpen) {
menu.classList.add('active');
// FIX: Menu खुलने पर header दिखाना
document.querySelector('header').style.display = 'block';
} else {
menu.classList.remove('active');
// FIX: Menu बंद होने पर header छिपाना (अगर गेम चल रहा था/शुरू हो चुका था)
if (isGameRunning || score > 0) {
document.querySelector('header').style.display = 'none';
}
}
}

// Update pause button text
function updatePauseButtonText() {
const pauseBtn = document.getElementById('pause-resume-btn');
pauseBtn.textContent = isGameRunning ? 'Pause Game' : 'Resume Game';
}

// Setup mobile controls (OPTIMIZED - mousedown/mouseup removed)
function setupMobileControls() {
const buttons = [
{ id: 'up-btn', dir: 'ArrowUp' },
{ id: 'down-btn', dir: 'ArrowDown' },
{ id: 'left-btn', dir: 'ArrowLeft' },
{ id: 'right-btn', dir: 'ArrowRight' }
];

buttons.forEach(btnInfo => {
const btn = document.getElementById(btnInfo.id);

// Use only touchstart/touchend for primary interaction on all devices
btn.addEventListener('touchstart', (e) => {
e.preventDefault();
startContinuousMove(btnInfo.dir);
}, { passive: false }); // passive: false ensures preventDefault works

btn.addEventListener('touchend', stopContinuousMove);

// Prevent drag and context menu
btn.addEventListener('contextmenu', (e) => e.preventDefault());
btn.addEventListener('dragstart', (e) => e.preventDefault());

// REMOVED mousedown/mouseup for simplification and overhead reduction
});
}


// Start continuous movement in a direction
function startContinuousMove(direction) {
if (!isGameRunning) return;

activeDirection = direction;

// Move immediately on first press
moveGuardian(direction);

// Then set up continuous movement
if (moveInterval) {
clearInterval(moveInterval);
}

moveInterval = setInterval(() => {
if (activeDirection && isGameRunning) {
moveGuardian(activeDirection);
}
}, MOVE_SPEED);
}

// Stop continuous movement
function stopContinuousMove() {
activeDirection = null;
if (moveInterval) {
clearInterval(moveInterval);
moveInterval = null;
}
}

// Create the game maze
function createMaze() {
// Maze data remains the same
maze = [
1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
1,4,0,0,0,1,0,0,0,0,0,1,0,0,0,0,3,0,5,1,
1,0,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,5,1,
1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,
1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,
1,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,5,1,
1,1,1,1,0,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1,
1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,
1,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,1,
1,1,1,1,0,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1,
1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,
1,0,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,
1,0,0,0,0,1,0,0,0,3,0,0,0,0,0,1,0,0,0,1,
1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,
1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,
1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
1,5,0,0,0,1,0,0,3,0,0,1,0,0,0,0,0,0,5,1,
1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
];

remainingPackets = maze.filter(cell => cell === PACKET).length;
}

// Create the game board UI
function createBoard() {
const board = document.getElementById('game-board');
board.innerHTML = '';

for (let i = 0; i < maze.length; i++) {
const cell = document.createElement('div');
cell.classList.add('grid-cell');

if (maze[i] === WALL) {
cell.classList.add('wall');
} else if (maze[i] === PACKET) {
cell.classList.add('packet');
} else if (maze[i] === POWER_BOOST) {
cell.classList.add('firewall-boost');
}

board.appendChild(cell);
}
}

// Reset game state
function resetGameState() {
guardianIndex = maze.indexOf(GUARDIAN_START);
initializeViruses();

score = 0;
lives = 3;
level = 1;
isBoostActive = false;
nextLevelScore = 250;

// Reset movement state
activeDirection = null;
if (moveInterval) {
clearInterval(moveInterval);
moveInterval = null;
}

// Reset performance cache
previousGuardianIndex = -1;
previousVirusIndices = [];

updateUI();
}

// Initialize viruses with different behaviors
function initializeViruses() {
const virusStarts = getAllIndexes(maze, VIRUS_START);

const virusTypes = [
{ name: 'Worm', baseSpeed: 8, aggression: 0.8, color: '#ff3366', points: 100 },
{ name: 'Trojan', baseSpeed: 6, aggression: 0.6, color: '#ff6600', points: 150 },
{ name: 'Spyware', baseSpeed: 7, aggression: 0.9, color: '#9933ff', points: 120 },
{ name: 'Ransomware', baseSpeed: 5, aggression: 0.5, color: '#00cc99', points: 200 },
{ name: 'Adware', baseSpeed: 9, aggression: 0.7, color: '#ffcc00', points: 80 },
{ name: 'Rootkit', baseSpeed: 4, aggression: 0.4, color: '#ff0066', points: 180 }
];

viruses = [];
virusStarts.forEach((index, i) => {
if (i < 6) {
viruses.push({
id: i,
index: index,
color: virusTypes[i].color,
name: virusTypes[i].name,
baseSpeed: virusTypes[i].baseSpeed,
currentSpeed: virusTypes[i].baseSpeed,
points: virusTypes[i].points,
aggression: virusTypes[i].aggression,
moveCounter: 0,
isChasing: false,
lastPosition: null,
lastMoveIndex: -1
});
}
});
}

// Update UI elements
function updateUI() {
document.getElementById('score').textContent = score;
document.getElementById('lives').textContent = lives;
document.getElementById('level').textContent = level;

// Show next level requirement
document.getElementById('powerup-status').textContent =
isBoostActive ? 'Firewall Boost Active!' : `Next Level: ${nextLevelScore} points`;

// Check for level up based on score
checkLevelUp();
}

// Check if player reached score threshold for level up
function checkLevelUp() {
if (score >= nextLevelScore) {
levelUp();
}
}

// Enhanced level up function to increase difficulty
function levelUp() {
level++;

// Increase next level requirement
nextLevelScore += 250;

// Make viruses faster and more intelligent
viruses.forEach(virus => {
// Reduce current speed (lower number = faster movement)
virus.currentSpeed = Math.max(2, virus.currentSpeed - 1);

// Increase aggression but cap at 1.0 for max smartness
virus.aggression = Math.min(1.0, virus.aggression + 0.05);
});

updateUI();

// Reset maze but keep current positions
resetMaze();
}

// Reset maze without resetting game state
function resetMaze() {
createMaze();
createBoard();
drawCharacters();
}

// Draw characters on the board (OPTIMIZED for minimal DOM changes)
function drawCharacters() {
const board = document.getElementById('game-board');

// 1. Guardian Update (Only update if position changed)
if (previousGuardianIndex !== -1 && previousGuardianIndex !== guardianIndex) {
const oldCell = board.children[previousGuardianIndex];
if (oldCell) oldCell.classList.remove('guardian');
}
const guardianCell = board.children[guardianIndex];
if (guardianCell) guardianCell.classList.add('guardian');
previousGuardianIndex = guardianIndex;

// 2. Viruses Update
const currentVirusIndices = viruses.map(v => v.index);
// Combine old and new positions to clear/update efficiently
const indicesToUpdate = new Set([...previousVirusIndices, ...currentVirusIndices]);

// Clear old classes/styles and apply new ones based on the current state
indicesToUpdate.forEach(index => {
const cell = board.children[index];
if (cell) {
// Remove previous states
cell.classList.remove('malware-virus', 'quarantined');
cell.style.backgroundColor = '';
cell.style.boxShadow = '';

// Check if a virus is currently at this index
const virus = viruses.find(v => v.index === index);

if (virus) {
cell.classList.add('malware-virus');
if (isBoostActive) {
cell.classList.add('quarantined');
// Styles cleared above.
} else {
cell.style.backgroundColor = virus.color;
cell.style.boxShadow = `0 0 10px ${virus.color}`;
}
}
}
});

previousVirusIndices = currentVirusIndices; // Update cache for next frame
}

// Handle keyboard input
function handleKeyPress(e) {
// Enter key to start game (only if game is not running)
if (e.key === 'Enter' && !isGameRunning) {
document.getElementById('start-overlay').classList.remove('active');

// FIX: Game शुरू होने पर header छिपाना
document.querySelector('header').style.display = 'none';

startGame();
return;
}

// Space key to pause/resume game (only if game has started)
if (e.key === ' ' && score > 0) {
e.preventDefault(); // Prevent spacebar from scrolling the page
togglePause();
return;
}

// Escape key to open/close menu
if (e.key === 'Escape') {
if (!isMenuOpen && isGameRunning) {
togglePause(); // Pause the game
} else if (isMenuOpen && !isGameRunning && score > 0) {
togglePause(); // Resume the game
}
toggleMenu();
updatePauseButtonText();
return;
}

if (!isGameRunning) return;

if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
e.preventDefault();
startContinuousMove(e.key);
}

// Pause key functionality (additional ways to pause)
if (e.key === 'p' || e.key === 'P') {
togglePause();
}
}

// Handle key up for keyboard controls
function handleKeyUp(e) {
if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
e.preventDefault();
if (activeDirection === e.key) {
stopContinuousMove();
}
}
}

// Move the guardian
function moveGuardian(direction) {
if (!isGameRunning) {
return;
}

let newIndex = guardianIndex;

switch(direction) {
case 'ArrowUp':
newIndex -= BOARD_WIDTH;
break;
case 'ArrowDown':
newIndex += BOARD_WIDTH;
break;
case 'ArrowLeft':
// Added boundary check to prevent wraparound
if (guardianIndex % BOARD_WIDTH !== 0) {
newIndex -= 1;
} else {
return; // Stop movement if blocked by edge
}
break;
case 'ArrowRight':
// Added boundary check to prevent wraparound
if (guardianIndex % BOARD_WIDTH !== BOARD_WIDTH - 1) {
newIndex += 1;
} else {
return; // Stop movement if blocked by edge
}
break;
}

if (newIndex >= 0 && newIndex < BOARD_SIZE && maze[newIndex] !== WALL) {
handleCellInteraction(newIndex);
guardianIndex = newIndex;
drawCharacters();
}
}

// Handle interactions with cells
function handleCellInteraction(index) {
const cellType = maze[index];

switch(cellType) {
case PACKET:
score += 10;
maze[index] = EMPTY;
remainingPackets--;
updateUI();
showPointsPopup(index, '+10', '#ffff00'); // Yellow color for packets
break;

case POWER_BOOST:
score += 50;
maze[index] = EMPTY;
activateFirewallBoost();
updateUI();
showPointsPopup(index, '+50', '#9933ff'); // Purple color for power boost
break;
}

// Re-check collision after movement
viruses.forEach(virus => {
if (virus.index === index) {
handleVirusCollision(virus);
}
});

if (remainingPackets === 0) {
resetMaze(); // Game reset without score reset
}
}

// Handle collision with a virus
function handleVirusCollision(virus) {
if (isBoostActive) {
score += virus.points;
const virusStarts = getAllIndexes(maze, VIRUS_START);
virus.index = virusStarts[Math.floor(Math.random() * virusStarts.length)];
updateUI();
showPointsPopup(virus.index, `+${virus.points}`, virus.color);
} else {
// PREVENT NEGATIVE LIVES - MAX FUNCTION USE KARO
lives = Math.max(0, lives - 1);
updateUI();

if (lives <= 0) {
gameOver();
} else {
// Reset positions on collision
guardianIndex = maze.indexOf(GUARDIAN_START);
const virusStarts = getAllIndexes(maze, VIRUS_START);
viruses.forEach(v => {
v.index = virusStarts[Math.floor(Math.random() * virusStarts.length)];
});
drawCharacters();
}
}
}

// Show points popup
function showPointsPopup(index, points, color) {
const board = document.getElementById('game-board');
const cell = board.children[index];

const popup = document.createElement('div');
popup.textContent = points;
popup.style.position = 'absolute';
popup.style.color = color;
popup.style.fontWeight = 'bold';
popup.style.fontSize = '14px';
popup.style.textShadow = `0 0 5px ${color}`;
popup.style.animation = 'floatUp 1s ease-out forwards';
popup.style.zIndex = '100';
popup.style.pointerEvents = 'none';

const rect = cell.getBoundingClientRect();
const boardRect = board.getBoundingClientRect();
// Use relative calculation based on cell size for accurate positioning
const cellSize = rect.width;
popup.style.left = `${rect.left - boardRect.left + (cellSize / 4)}px`;
popup.style.top = `${rect.top - boardRect.top - (cellSize / 2)}px`;

board.style.position = 'relative';
board.appendChild(popup);

setTimeout(() => {
popup.remove();
}, 1000);
}

// Enhanced virus movement with probability-based chasing
function moveViruses() {
if (!isGameRunning) {
return; // Don't move viruses if game is paused
}

viruses.forEach(virus => {
virus.moveCounter++;

// Check if it's time for this virus to move
if (virus.moveCounter >= virus.currentSpeed) {
virus.moveCounter = 0;

let newIndex;
const distanceToPlayer = calculateDistance(virus.index, guardianIndex);

// Decide whether to chase or use strategic movement
const shouldChase = Math.random() < calculateChaseProbability(virus, distanceToPlayer);

if (shouldChase) {
// OPTIMIZED AI: Use Greedy Manhattan distance instead of expensive BFS
newIndex = findSmartestShortestMoveTowardsPlayer(virus.index, virus.id);
virus.isChasing = true;
} else {
// If not strictly chasing, use strategic move, but still smart.
newIndex = findStrategicPosition(virus.index, virus.id, distanceToPlayer);
virus.isChasing = false;
}

// Apply the move if valid and different from current position
if (newIndex !== null && newIndex !== virus.index) {
virus.lastMoveIndex = virus.index; // Store old position
virus.index = newIndex;

// Check for collision with player
if (virus.index === guardianIndex) {
handleVirusCollision(virus);
}
}
}
});

drawCharacters();
}

// Calculate the probability that a virus will chase the player (SMARTER VERSION)
function calculateChaseProbability(virus, distance) {
let baseProbability = virus.aggression * (1 - (distance / (BOARD_WIDTH * 1.5))) + 0.1;

// LEVEL-BASED INTELLIGENCE BOOST
const levelBoost = (level - 1) * 0.08;
let probability = baseProbability + levelBoost;

// Adjust for power-up - SMARTER: at level 10+, firewall has no effect on chase
if (isBoostActive) {
if (level >= 10) {
probability = Math.max(0.9999, probability); // 0.1% confusion removed (always chase)
} else {
// Level-based fear reduction
const fearReduction = Math.min(0.25, (level - 1) * 0.04);
probability -= (0.3 - fearReduction);
}
}

// Ensure no random "confusion" (0.1% chance max)
return Math.max(0.0001, Math.min(1.0, probability)); // Max 1.0 (no confusion)
}

// NEW OPTIMIZED FUNCTION: Finds the shortest path using Greedy Manhattan Distance (faster than BFS)
function findSmartestShortestMoveTowardsPlayer(virusIndex, virusId) {
const virus = viruses.find(v => v.id === virusId);
const directions = [-1, 1, -BOARD_WIDTH, BOARD_WIDTH];
let bestMove = virusIndex;
let minDistance = calculateDistance(virusIndex, guardianIndex);

// Filter available moves: valid and not reversing immediately
const availableMoves = directions
.map(dir => virusIndex + dir)
.filter(newIndex => isValidMove(newIndex, virusIndex) && newIndex !== virus.lastMoveIndex);

// If no forward move, allow turning back (last resort)
if (availableMoves.length === 0) {
if (isValidMove(virus.lastMoveIndex, virusIndex)) {
availableMoves.push(virus.lastMoveIndex);
}
}

// Greedy move: Choose the direction that minimizes Manhattan Distance
for (const move of availableMoves) {
const distance = calculateDistance(move, guardianIndex);
if (distance < minDistance) {
minDistance = distance;
bestMove = move;
}
}

return bestMove;
}


// Predict player's future position (kept original for strategic use)
function predictPlayerPosition(stepsAhead) {
let predictedIndex = guardianIndex;

if (activeDirection) {
let tempIndex = guardianIndex;

for (let i = 0; i < stepsAhead; i++) {
let testIndex = tempIndex;

switch(activeDirection) {
case 'ArrowUp': testIndex -= BOARD_WIDTH; break;
case 'ArrowDown': testIndex += BOARD_WIDTH; break;
case 'ArrowLeft':
if (tempIndex % BOARD_WIDTH !== 0) { testIndex -= 1; }
break;
case 'ArrowRight':
if (tempIndex % BOARD_WIDTH !== BOARD_WIDTH - 1) { testIndex += 1; }
break;
}

if (isValidMove(testIndex, tempIndex)) {
tempIndex = testIndex;
} else {
break;
}
}

predictedIndex = tempIndex;
}

return predictedIndex;
}

// Enhanced strategic positioning with level-based tactics
function findStrategicPosition(virusIndex, virusId, distanceToPlayer) {
const virus = viruses.find(v => v.id === virusId);
const directions = [-1, 1, -BOARD_WIDTH, BOARD_WIDTH];
const validMoves = [];

// Get all valid moves first (excluding immediate reversal)
for (const dir of directions) {
const newIndex = virusIndex + dir;
if (isValidMove(newIndex, virusIndex) && newIndex !== virus.lastMoveIndex) {
validMoves.push(newIndex);
}
}

if (validMoves.length === 0) {
// If no forward move possible, allow turning back only as a last resort
const fallbackMove = virusIndex + directions.find(dir => virusIndex + dir === virus.lastMoveIndex && isValidMove(virusIndex + dir, virusIndex))
if (fallbackMove !== undefined) return fallbackMove;

return virusIndex;
}

// LEVEL-BASED STRATEGY SELECTION
const strategyRoll = Math.random();

// Higher level viruses use more advanced strategies
if (level >= 8 && strategyRoll < 0.4) {
// Advanced: Set up ambush points
const ambushMove = findAmbushPosition(virusIndex, validMoves);
if (ambushMove !== null) return ambushMove;
}

if (level >= 6 && strategyRoll < 0.3) {
// Intermediate: Block player's escape routes
const blockMove = findBlockingPosition(virusIndex, validMoves);
if (blockMove !== null) return blockMove;
}

if (level >= 4 && distanceToPlayer > 5 && strategyRoll < 0.4) {
// Basic: Guard power-ups
const powerUpMove = moveToPowerUp(virusIndex, validMoves);
if (powerUpMove !== null) return powerUpMove;
}

// Fallback: Smart random movement that improves with level
return getStrategicRandomMove(virusIndex, validMoves, virus);
}

// Find positions for ambushing the player
function findAmbushPosition(currentIndex, validMoves) {
const ambushCandidates = validMoves.filter(move => {
const distance = calculateDistance(move, guardianIndex);
return distance >= 2 && distance <= 4 && !isDeadEnd(move);
});

if (ambushCandidates.length > 0) {
ambushCandidates.sort((a, b) => {
const aOptions = countValidMoves(a);
const bOptions = countValidMoves(b);
return aOptions - bOptions;
});

return ambushCandidates[0];
}

return null;
}

// Find positions that block player's movement
function findBlockingPosition(currentIndex, validMoves) {
const playerDirections = [-1, 1, -BOARD_WIDTH, BOARD_WIDTH];
const playerMoves = playerDirections
.map(dir => guardianIndex + dir)
.filter(index => isValidMove(index, guardianIndex));

if (playerMoves.length <= 2) {
for (const move of validMoves) {
if (playerMoves.includes(move)) {
return move;
}
}

// Use shortest path logic here too for optimal blocking
const blockingMove = findMoveTowardsTarget(currentIndex, validMoves, guardianIndex);
if (blockingMove !== null && blockingMove !== currentIndex) {
return blockingMove;
}
}

return null;
}

// Move towards the nearest power-up
function moveToPowerUp(currentIndex, validMoves) {
const powerUpIndices = getAllIndexes(maze, POWER_BOOST);

if (powerUpIndices.length === 0) return null;

let closestPowerUp = null;
let minDistance = Infinity;

for (const powerUpIndex of powerUpIndices) {
const distance = calculateDistance(currentIndex, powerUpIndex);
if (distance < minDistance) {
minDistance = distance;
closestPowerUp = powerUpIndex;
}
}

return findMoveTowardsTarget(currentIndex, validMoves, closestPowerUp);
}

// Enhanced strategic random move with level-based intelligence
function getStrategicRandomMove(currentIndex, validMoves, virus) {
const scoredMoves = validMoves.map(move => {
let score = Math.random();

const distanceToPlayer = calculateDistance(move, guardianIndex);
const moveOptions = countValidMoves(move);

// Level 1-2: Basic avoidance of dead ends
if (level >= 1) {
if (isDeadEnd(move) && distanceToPlayer > 3) {
score -= 0.3;
}
}

// Level 3-4: Prefer positions with more options
if (level >= 3) {
score += moveOptions * 0.15;
}

// Level 5-6: Aggressive positioning
if (level >= 5 && virus.aggression > 0.6) {
if (distanceToPlayer <= 4) {
score += (5 - distanceToPlayer) * 0.1;
}
}

// Level 7+: Advanced tactical positioning
if (level >= 7) {
if (isChokePoint(move)) {
score += 0.4;
}
}

return { move, score };
});

virus.lastPosition = currentIndex;

scoredMoves.sort((a, b) => b.score - a.score);
return scoredMoves[0].move;
}

// Find move that minimizes distance to target (used for strategy, not for shortest path)
function findMoveTowardsTarget(currentIndex, validMoves, targetIndex) {
let bestMove = currentIndex;
let bestDistance = Infinity;

for (const move of validMoves) {
const distance = calculateDistance(move, targetIndex);
if (distance < bestDistance) {
bestDistance = distance;
bestMove = move;
}
}

return bestMove !== currentIndex ? bestMove : null;
}

// Check if a position is a dead end
function isDeadEnd(position) {
return countValidMoves(position) <= 1;
}

// Count valid moves from a position
function countValidMoves(position) {
const directions = [-1, 1, -BOARD_WIDTH, BOARD_WIDTH];
let count = 0;

for (const dir of directions) {
const newIndex = position + dir;
if (isValidMove(newIndex, position)) {
count++;
}
}

return count;
}

// Check if position is a choke point
function isChokePoint(position) {
const moves = countValidMoves(position);
if (moves !== 2) return false;

const directions = [-1, 1, -BOARD_WIDTH, BOARD_WIDTH];
const validDirs = directions.filter(dir => {
const newIndex = position + dir;
return isValidMove(newIndex, position);
});

return Math.abs(validDirs[0]) !== Math.abs(validDirs[1]);
}

/**
* Check if a move is valid (not a wall and not occupied by another virus)
*/
function isValidMove(newIndex, currentIndex) {
// Check boundaries
if (newIndex < 0 || newIndex >= BOARD_SIZE) {
return false;
}

// Check for walls
if (maze[newIndex] === WALL) {
return false;
}

// Check if another virus is already there (except current virus)
if (viruses.some(v => v.index === newIndex && v.index !== currentIndex)) {
return false;
}

return true;
}

/**
* Calculate Manhattan distance between two positions
*/
function calculateDistance(pos1, pos2) {
const x1 = pos1 % BOARD_WIDTH;
const y1 = Math.floor(pos1 / BOARD_WIDTH);
const x2 = pos2 % BOARD_WIDTH;
const y2 = Math.floor(pos2 / BOARD_WIDTH);

return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// Activate firewall boost
function activateFirewallBoost() {
isBoostActive = true;
updateUI();

setTimeout(() => {
isBoostActive = false;
updateUI();
drawCharacters();
}, 10000);
}

// Game over - FIXED VERSION
function gameOver() {
isGameRunning = false;
clearInterval(gameInterval);
stopContinuousMove();

setTimeout(() => {
alert(`Game Over! Your final score: ${score}\nYou reached Level ${level}`);

// FIX: Header दिखाना
document.querySelector('header').style.display = 'block';
resetGame();

}, 500);
}

// Start the game
function startGame() {
if (isGameRunning) return;

isGameRunning = true;

updatePauseButtonText();

// Clear any existing interval first
if (gameInterval) {
clearInterval(gameInterval);
}

// Start virus movement
// Use the optimized interval constant
gameInterval = setInterval(() => {
if (isGameRunning) {
moveViruses();
}
}, VIRUS_MOVE_INTERVAL); // 200ms
}

// Toggle pause - FIXED FOR CONSISTENT RESUME
function togglePause() {
// Don't allow toggling if the start overlay is active or game hasn't started
if (document.getElementById('start-overlay').classList.contains('active')) return;
if (score === 0 && !isGameRunning && !isMenuOpen) return;

isGameRunning = !isGameRunning;
updatePauseButtonText();

if (isGameRunning) {
// RESUME: Clear existing interval (just in case) and start a new one
if (gameInterval) clearInterval(gameInterval);

gameInterval = setInterval(() => {
if (isGameRunning) {
moveViruses();
}
}, VIRUS_MOVE_INTERVAL);
} else {
// PAUSE: Clear the interval to stop virus movement
if (gameInterval) {
clearInterval(gameInterval);
gameInterval = null;
}
stopContinuousMove(); // Stop player movement too
}
}

// Reset the game
function resetGame() {
// Stop everything first
isGameRunning = false;

// Clear all intervals
if (gameInterval) {
clearInterval(gameInterval);
gameInterval = null;
}

stopContinuousMove();

// Reset game state
createMaze();
createBoard();
resetGameState();
drawCharacters();

// Show start overlay
document.getElementById('start-overlay').classList.add('active');
}

// Helper function to get all indexes of a value in an array
function getAllIndexes(arr, val) {
const indexes = [];
for (let i = 0; i < arr.length; i++) {
if (arr[i] === val) indexes.push(i);
}
return indexes;
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', initGame);