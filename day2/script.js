// ============================================================
//  Day 2: The Button You Can't Click  (version 4)
//
//  60 seconds. The button glides around the arena.
//  Every 5 clicks it speeds up. In the last 10 seconds it stops
//  gliding and teleports instead. Score = number of clicks.
//
//  The button no longer reacts to your mouse at all, so
//  swiping around can't beat it. You have to aim.
// ============================================================

// ---- Numbers to tweak ------------------------------------------------
const GAME_SECONDS = 60;
const TELEPORT_SECONDS = 10;      // teleport mode starts when this much time is left
const BOOST_EVERY = 5;            // clicks between speed boosts
const BEST_KEY = "day2-best-score";

// Two sets of numbers: one for computers, one for phones and tablets.
// baseSpeed      = pixels per second at the start
// boostAmount    = each boost adds this much of the base speed (0.20 = 20%)
// maxMultiplier  = speed never goes above this many times the base speed
// teleportStart  = seconds between teleports at the start of teleport mode
// teleportFastest= the fastest it will ever teleport
// teleportStep   = how much faster the teleports get after each speed boost
const SETTINGS = {
  desktop: {
    baseSpeed: 175, boostAmount: 0.20, maxMultiplier: 3.75,
    teleportStart: 0.8, teleportFastest: 0.5, teleportStep: 0.04,
  },
  mobile: {
    baseSpeed: 260, boostAmount: 0.30, maxMultiplier: 5,
    teleportStart: 0.6, teleportFastest: 0.35, teleportStep: 0.05,
  },
};

// "Mobile" = touchscreen or a narrow window. The CSS uses the same rule
// to make the button smaller.
const mobileQuery = window.matchMedia("(pointer: coarse), (max-width: 600px)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let cfg = SETTINGS.desktop;       // the settings for this game (chosen in startGame)

// ---- Grab the page elements ------------------------------------------
const arena    = document.getElementById("arena");
const prize    = document.getElementById("prize");
const taunt    = document.getElementById("taunt");
const startBox = document.getElementById("start");
const startBtn = document.getElementById("start-btn");
const timeEl   = document.getElementById("time");
const timeBox  = document.getElementById("time-box");
const clicksEl = document.getElementById("clicks");
const speedEl  = document.getElementById("speed");
const bestEl   = document.getElementById("best");
const win      = document.getElementById("win");
const winText  = document.getElementById("win-text");
const shareBtn = document.getElementById("share");
const againBtn = document.getElementById("again");
const shareNote = document.getElementById("share-note");

// ---- Game state ------------------------------------------------------
let state = "ready";       // "ready", "playing" or "over"
let timeLeft = GAME_SECONDS;
let clicks = 0;
let misses = 0;
let boosts = 0;            // how many speed boosts so far

// Where the button is, and which way it's heading
let x = 0;
let y = 0;
let angle = 0;             // direction in radians
let turn = 0;              // how fast it's curving (radians per second)
let turnClock = 0;         // time until it picks a new curve

let teleportMode = false;
let teleportClock = 0;
let lastFrame = 0;
let best = loadBest();
bestEl.textContent = best;

// ---- Small helpers ---------------------------------------------------
const randomBetween = (min, max) => min + Math.random() * (max - min);

function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; }
  catch (err) { return 0; }
}
function saveBest(score) {
  try { localStorage.setItem(BEST_KEY, String(score)); }
  catch (err) { /* private mode: just skip saving */ }
}

function multiplier() {
  return Math.min(1 + cfg.boostAmount * boosts, cfg.maxMultiplier);
}

function teleportInterval() {
  return Math.max(cfg.teleportFastest, cfg.teleportStart - cfg.teleportStep * boosts);
}

function maxX() { return Math.max(0, arena.clientWidth - prize.offsetWidth); }
function maxY() { return Math.max(0, arena.clientHeight - prize.offsetHeight); }

// Moving the button = changing its transform. This is what makes it smooth.
function draw() {
  prize.style.transform = `translate(${x}px, ${y}px)`;
}

// ---- Smooth movement -------------------------------------------------
// Every frame: curve a little, step forward, bounce off the walls.
function glide(dt) {
  turnClock -= dt;
  if (turnClock <= 0) {
    turn = randomBetween(-1.6, 1.6);       // pick a new gentle curve
    turnClock = randomBetween(0.5, 1.2);   // keep it for a moment
  }
  angle += turn * dt;

  const speed = cfg.baseSpeed * multiplier();
  x += Math.cos(angle) * speed * dt;
  y += Math.sin(angle) * speed * dt;

  // Bounce: flip the direction when it hits a wall
  if (x < 0)         { x = 0;      angle = Math.PI - angle; }
  else if (x > maxX()) { x = maxX(); angle = Math.PI - angle; }
  if (y < 0)         { y = 0;      angle = -angle; }
  else if (y > maxY()) { y = maxY(); angle = -angle; }

  draw();
}

// ---- Teleporting -----------------------------------------------------
// Pick a new spot at least 150px from where it is now
function teleport() {
  const oldX = x;
  const oldY = y;
  for (let i = 0; i < 20; i++) {
    x = randomBetween(0, maxX());
    y = randomBetween(0, maxY());
    if (Math.hypot(x - oldX, y - oldY) > 150) break;
  }
  draw();
}

// ---- The game loop ---------------------------------------------------
// requestAnimationFrame runs this once per screen refresh (about 60 times a second)
function frame(timestamp) {
  if (state !== "playing") return;

  // dt = seconds since the last frame. Capped, so switching tabs pauses the game
  const dt = Math.min((timestamp - lastFrame) / 1000, 0.05);
  lastFrame = timestamp;

  timeLeft -= dt;
  if (timeLeft <= 0) {
    endGame();
    return;
  }
  timeEl.textContent = timeLeft.toFixed(1) + "s";

  if (timeLeft <= TELEPORT_SECONDS) {
    if (!teleportMode) enterTeleportMode();
    teleportClock -= dt;
    if (teleportClock <= 0) {
      teleport();
      teleportClock = teleportInterval();
    }
  } else {
    glide(dt);
  }

  requestAnimationFrame(frame);
}

function enterTeleportMode() {
  teleportMode = true;
  teleportClock = 0;                 // teleports right away
  timeBox.classList.add("urgent");
  taunt.textContent = "TELEPORT MODE. It only jumps now.";
}

// ---- Clicking --------------------------------------------------------
// We listen for pointerdown instead of click: when the target is moving,
// waiting for the mouse button to come back up would often miss.
arena.addEventListener("pointerdown", (event) => {
  if (state !== "playing") return;

  if (event.target.closest("#prize")) {
    event.preventDefault();
    hit();
  } else {
    misses++;
  }
});

// The flash: the button blinks yellow, and a yellow burst is left behind
// where you clicked (so you still see it when the button teleports away)
function flashHit() {
  prize.classList.remove("flash");
  void prize.offsetWidth;            // tiny trick: lets the animation restart on rapid clicks
  prize.classList.add("flash");

  if (reduceMotion.matches) return;  // skip the burst for people who turn animations off
  const pop = document.createElement("div");
  pop.className = "pop";
  pop.style.left = (x + prize.offsetWidth / 2) + "px";
  pop.style.top = (y + prize.offsetHeight / 2) + "px";
  arena.append(pop);
  setTimeout(() => pop.remove(), 400);
}

function hit() {
  flashHit();                        // do this FIRST, before the button moves
  clicks++;
  clicksEl.textContent = clicks;

  // Speed boost every 5 clicks
  if (clicks % BOOST_EVERY === 0) {
    boosts++;
    speedEl.textContent = "x" + multiplier().toFixed(2);
    taunt.textContent = "Speed boost! Now x" + multiplier().toFixed(2) + ".";
  }

  // In teleport mode a hit makes it jump immediately
  if (teleportMode) {
    teleport();
    teleportClock = teleportInterval();
  }
}

// ---- Start, end, restart ---------------------------------------------
function startGame() {
  cfg = mobileQuery.matches ? SETTINGS.mobile : SETTINGS.desktop;
  state = "playing";
  timeLeft = GAME_SECONDS;
  clicks = 0;
  misses = 0;
  boosts = 0;
  teleportMode = false;
  turn = 0;
  turnClock = 0;

  clicksEl.textContent = "0";
  speedEl.textContent = "x1.00";
  timeEl.textContent = GAME_SECONDS.toFixed(1) + "s";
  timeBox.classList.remove("urgent");
  win.hidden = true;
  shareNote.textContent = "";
  startBox.hidden = true;
  taunt.textContent = "Go!";

  // Start in the middle, heading in a random direction
  x = maxX() / 2;
  y = maxY() / 2;
  angle = randomBetween(0, Math.PI * 2);
  draw();
  prize.classList.remove("gone");

  lastFrame = performance.now();
  requestAnimationFrame(frame);
}

function endGame() {
  state = "over";
  timeEl.textContent = "0.0s";
  prize.classList.add("gone");
  taunt.textContent = "Time!";

  const total = clicks + misses;
  const accuracy = total === 0 ? 0 : Math.round((clicks / total) * 100);

  let text = `You clicked it ${clicks} times with ${accuracy}% accuracy. Top speed: x${multiplier().toFixed(2)}.`;
  if (clicks > best) {
    best = clicks;
    saveBest(best);
    bestEl.textContent = best;
    text += " New personal best!";
  }
  winText.textContent = text;
  win.hidden = false;
  win.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

startBtn.addEventListener("click", startGame);
againBtn.addEventListener("click", startGame);

// ---- Sharing ---------------------------------------------------------
shareBtn.addEventListener("click", async () => {
  const text = `I clicked the button you can't click ${clicks} times in ${GAME_SECONDS} seconds. Can you beat that? ${location.href}`;
  try {
    await navigator.clipboard.writeText(text);
    shareNote.textContent = "Copied! Paste it anywhere.";
  } catch (err) {
    shareNote.textContent = "Couldn't copy. Screenshot this instead!";
  }
});

// ---- Keep the button inside the arena if the window is resized ------
window.addEventListener("resize", () => {
  x = Math.min(x, maxX());
  y = Math.min(y, maxY());
  draw();
});

// Park the button in the middle before the game starts (it's hidden until Start)
x = maxX() / 2;
y = maxY() / 2;
draw();