// ============================================================
//  Day 6: Simon Says
//  The pattern plays, you repeat it. One wrong pad ends the run.
// ============================================================

// ---- Tuning ----
const BEST_KEY = "day6-best";
const WIN_ROUND = 20;                              // clear this many rounds to win
const TONES = [261.63, 329.63, 392.0, 523.25];   // C4, E4, G4, C5, one per pad
const NAMES = ["fire", "water", "wind", "earth"];
const KEYS = { q: 0, w: 1, a: 2, s: 3, "1": 0, "2": 1, "3": 2, "4": 3 };

// How long each light stays on, and the gap between lights. Both shrink as rounds go up.
const litTime = (round) => Math.max(240, 600 - (round - 1) * 28);
const gapTime = (round) => Math.max(110, 260 - (round - 1) * 12);

// ---- Elements ----
const padsBox = document.getElementById("pads");
const padEls = [...document.querySelectorAll(".pad")];
const statusEl = document.getElementById("status");
const roundEl = document.getElementById("round");
const bestEl = document.getElementById("best");
const startBtn = document.getElementById("start");
const overEl = document.getElementById("over");
const overText = document.getElementById("over-text");
const againBtn = document.getElementById("again");
const overTitle = document.getElementById("over-title");
const overSeal = document.getElementById("over-seal");
// Safe even if an older index.html is missing these elements
const setText = (node, text) => { if (node) node.textContent = text; };

// ---- State ----
let sequence = [];
let position = 0;              // how far into the pattern the player is
let state = "idle";            // idle | watching | input | between | over
let runId = 0;                 // bumps on every new game so old async loops stop
const offTimers = [];

// ---- Helpers ----
// The tip for the video: await + a tiny promise = a pause you can read top to bottom
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function saveBest(n) {
  try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* private mode: fine */ }
}
let best = loadBest();
bestEl.textContent = best;

function setStatus(html) { statusEl.innerHTML = html; }

// ---- Sound (Web Audio, no files) ----
let audioCtx = null;
function getAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep(freq, ms, type = "sine", volume = 0.25) {
  const ctx = getAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);        // quick fade in, no click
  gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);   // smooth fade out
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.05);
}

// ---- Lights ----
function lightOn(i) {
  clearTimeout(offTimers[i]);
  padEls[i].classList.add("lit");
  beep(TONES[i], 380);
}
function lightOff(i) {
  padEls[i].classList.remove("lit");
}
// Used when the computer plays a step: on, wait, off
async function flash(i, ms) {
  lightOn(i);
  await sleep(ms);
  lightOff(i);
}
// Used when the player taps: on now, off shortly after (so fast taps still feel right)
function tapFlash(i) {
  lightOn(i);
  offTimers[i] = setTimeout(() => lightOff(i), 220);
}

function lockPads(locked) {
  padsBox.classList.toggle("locked", locked);
}

// ---- Game flow ----
function startGame() {
  getAudio();                  // unlock audio on a real tap
  runId++;
  sequence = [];
  position = 0;
  overEl.hidden = true;
  padEls.forEach((_, i) => lightOff(i));
  roundEl.textContent = 0;
  startBtn.disabled = true;
  nextRound(runId);
}

async function nextRound(id) {
  sequence.push(Math.floor(Math.random() * 4));   // add one random pad
  const round = sequence.length;
  roundEl.textContent = round;
  position = 0;
  state = "watching";
  lockPads(true);

  setStatus("Round " + round + ". Watch closely.");

  await sleep(round === 1 ? 600 : 700);
  for (const pad of sequence) {
    if (id !== runId) return;                     // a new game started, stop this one
    await flash(pad, litTime(round));
    await sleep(gapTime(round));
  }
  if (id !== runId) return;

  state = "input";
  lockPads(false);
  setStatus("Your turn. Repeat all " + round + ".");
}

async function handlePress(i) {
  if (state !== "input") return;
  const id = runId;
  tapFlash(i);

  if (i !== sequence[position]) {
    gameOver(i);
    return;
  }

  position++;
  if (position === sequence.length) {
    state = "between";
    lockPads(true);
    const done = sequence.length;
    if (done > best) {
      best = done;
      saveBest(best);
      bestEl.textContent = best;
    }
    if (done === WIN_ROUND) { win(); return; }
    setStatus("Nice. Round " + done + " cleared.");
    await sleep(900);
    if (id === runId) nextRound(id);
  }
}

async function gameOver() {
  state = "over";
  lockPads(true);
  runId++;                                        // cancels anything still waiting
  const id = runId;
  const reached = sequence.length;
  const cleared = reached - 1;

  beep(110, 600, "sawtooth", 0.2);                // the buzzer
  setStatus("Wrong pad.");

  // Show the right pad so you can see what you missed
  await sleep(350);
  if (id !== runId) return;
  await flash(sequence[position], 500);
  if (id !== runId) return;

  setText(overTitle, "Wrong pad");
  setText(overSeal, "失");
  overText.textContent = cleared > 0
    ? "You cleared " + cleared + (cleared === 1 ? " round." : " rounds.")
    : "You missed the first one.";
  overEl.hidden = false;
  setStatus("Game over.");
  againBtn.focus();
}

async function win() {
  state = "over";
  lockPads(true);
  runId++;
  const id = runId;
  setStatus("You did it.");

  // Little victory run up the four notes
  for (const i of [0, 1, 2, 3, 3]) {
    if (id !== runId) return;
    await flash(i, 140);
    await sleep(75);
  }

  setText(overTitle, "You win!");
  setText(overSeal, "勝");
  overText.textContent = "You cleared " + WIN_ROUND + " rounds.";
  overEl.hidden = false;
  againBtn.focus();
}

// Try again only resets the board. Nothing plays until you press Start.
function resetGame() {
  runId++;
  sequence = [];
  position = 0;
  state = "idle";
  overEl.hidden = true;
  padEls.forEach((_, i) => lightOff(i));
  roundEl.textContent = 0;
  setStatus("Press start when you're ready.");
  startBtn.disabled = false;
  startBtn.focus();
}

// ---- Input ----
// pointerdown (not click) so taps register the instant a finger lands
padEls.forEach((pad, i) => {
  pad.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handlePress(i);
  });
  // Keyboard users: Enter or Space on a focused pad
  pad.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
      e.preventDefault();
      handlePress(i);
    }
  });
});

document.addEventListener("keydown", (e) => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  const i = KEYS[e.key.toLowerCase()];
  if (i !== undefined) handlePress(i);
});

startBtn.addEventListener("click", startGame);
againBtn.addEventListener("click", resetGame);
lockPads(true);