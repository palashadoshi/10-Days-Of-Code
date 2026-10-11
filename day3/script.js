// ============================================================
//  SETTINGS YOU CAN TWEAK
// ============================================================
const THINK_MS = 450;           // how long the machine "thinks" before moving
const HUMAN = "X";
const MACHINE = "O";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],   // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],   // columns
  [0, 4, 8], [2, 4, 6],              // diagonals
];

// ============================================================
//  THE BRAIN
//  Step 1 (dumb): pick any empty square.
//  Step 2 (smart): minimax, which plays out every possible game.
// ============================================================
function findWinner(b) {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { mark: b[a], line: [a, c, d] };
  }
  return null;
}

function emptySquares(b) {
  const out = [];
  b.forEach((v, i) => { if (!v) out.push(i); });
  return out;
}

// Score a position from the machine's point of view.
// Win = positive, loss = negative, draw = 0. "depth" makes quick wins score higher.
function minimax(b, machineTurn, depth) {
  const w = findWinner(b);
  if (w) return w.mark === MACHINE ? 10 - depth : depth - 10;
  const free = emptySquares(b);
  if (free.length === 0) return 0;

  let best = machineTurn ? -Infinity : Infinity;
  for (const i of free) {
    b[i] = machineTurn ? MACHINE : HUMAN;
    const score = minimax(b, !machineTurn, depth + 1);
    b[i] = null;
    best = machineTurn ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function pickRandom(b) {
  const free = emptySquares(b);
  return free[Math.floor(Math.random() * free.length)];
}

// Medium brain: grab a win if there is one, block your win if there is one, else guess.
function pickWinOrBlock(b) {
  for (const mark of [MACHINE, HUMAN]) {
    for (const i of emptySquares(b)) {
      b[i] = mark;
      const wins = !!findWinner(b);
      b[i] = null;
      if (wins) return i;
    }
  }
  return null;
}

function pickBest(b) {
  let bestScore = -Infinity;
  let bestMoves = [];
  for (const i of emptySquares(b)) {
    b[i] = MACHINE;
    const score = minimax(b, false, 1);
    b[i] = null;
    if (score > bestScore) { bestScore = score; bestMoves = [i]; }
    else if (score === bestScore) bestMoves.push(i);
  }
  // Among equally good moves, choose randomly so games feel different
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// How the machine plays at each level:
//   easy       - random squares only
//   medium     - takes wins and blocks yours, otherwise random
//   hard       - perfect minimax, but blunders (random move) this often
//   unbeatable - perfect minimax, every single move
const HARD_BLUNDER_CHANCE = 0.2;

function chooseMove(b) {
  let level = mode;
  if (mode === "unbeatable" && cheatOn) level = "medium";   // the secret Konami code

  if (level === "easy") return pickRandom(b);
  if (level === "medium") {
    const forced = pickWinOrBlock(b);
    return forced !== null ? forced : pickRandom(b);
  }
  if (level === "hard") {
    return Math.random() < HARD_BLUNDER_CHANCE ? pickRandom(b) : pickBest(b);
  }
  return pickBest(b);
}

// ============================================================
//  GAME STATE
// ============================================================
let board, turn, over, roundId = 0;
let players = "1p";        // "1p" = vs machine, "2p" = two people on one screen
let nextFirst2p = "X";     // in 2 player mode the starter swaps every round, to keep it fair
let mode = "unbeatable";
let cheatOn = false;
let starter = "you";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const sealEl = document.getElementById("seal");
const resultTextEl = document.getElementById("result-text");
const recordEl = document.getElementById("record");

const X_SVG =
  '<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="#000" stroke-width="12" stroke-linecap="round">' +
  '<path class="mark-draw" pathLength="100" d="M12 12 L88 88"/>' +
  '<path class="mark-draw" pathLength="100" d="M88 12 L12 88"/></svg>';
const O_SVG =
  '<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="#000" stroke-width="12" stroke-linecap="round">' +
  '<circle class="mark-draw" pathLength="100" cx="50" cy="50" r="38" transform="rotate(-90 50 50)"/></svg>';

// ---- Record, saved on this device ----
const RECORD_KEY = "day3-record";
const MODES = ["easy", "medium", "hard", "unbeatable"];
function loadRecord() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(RECORD_KEY)); } catch (e) {}
  const rec = {};
  MODES.forEach((m) => {
    const r = saved && saved[m];
    rec[m] = r ? { w: r.w | 0, d: r.d | 0, l: r.l | 0 } : { w: 0, d: 0, l: 0 };
  });
  const t = saved && saved.two;
  rec.two = t ? { x: t.x | 0, o: t.o | 0, d: t.d | 0 } : { x: 0, o: 0, d: 0 };
  return rec;
}
function saveRecord(r) {
  try { localStorage.setItem(RECORD_KEY, JSON.stringify(r)); } catch (e) {}
}
let record = loadRecord();

function renderRecord() {
  recordEl.innerHTML = "";
  const title = document.createElement("h2");
  title.className = "record-title";
  recordEl.append(title);

  if (players === "2p") {
    title.textContent = "Two-player record";
    const t = record.two;
    const p = document.createElement("p");
    p.textContent = `X won ${t.x}, O won ${t.o}, ${t.d} drawn.`;
    recordEl.append(p);
    return;
  }

  title.textContent = "Your record";
  MODES.forEach((m) => {
    const r = record[m];
    const p = document.createElement("p");
    const s = document.createElement("strong");
    s.textContent = m[0].toUpperCase() + m.slice(1) + ": ";
    p.append(s, `${r.w} won, ${r.d} drawn, ${r.l} lost`);
    recordEl.append(p);
  });
}

// ---- Build the 9 squares once ----
const cells = [];
for (let i = 0; i < 9; i++) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cell";
  btn.setAttribute("role", "gridcell");
  // pointerdown reacts faster than click on phones; click (detail 0) covers keyboard users
  btn.addEventListener("pointerdown", (e) => { e.preventDefault(); humanMove(i); });
  btn.addEventListener("click", (e) => { if (e.detail === 0) humanMove(i); });
  boardEl.append(btn);
  cells.push(btn);
}

function render(winLine) {
  cells.forEach((btn, i) => {
    const v = board[i];
    const html = v === "X" ? X_SVG : v === "O" ? O_SVG : "";
    if (btn.dataset.mark !== (v || "")) {      // only redraw squares that changed
      btn.innerHTML = html;
      btn.dataset.mark = v || "";
    }
    btn.disabled = over || !!v || (players === "1p" && turn !== HUMAN);
    btn.classList.toggle("win", !!winLine && winLine.includes(i));
    const where = `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}`;
    btn.setAttribute("aria-label", v ? `${where}: ${v}` : `${where}: empty`);
  });
}

function setStatus(text) { statusEl.textContent = text; }

// ---- Round flow ----
function newRound() {
  roundId++;
  board = Array(9).fill(null);
  over = false;
  resultEl.classList.remove("show");
  cells.forEach((c) => { c.dataset.mark = ""; c.innerHTML = ""; });
  if (players === "2p") {
    turn = nextFirst2p;
    nextFirst2p = nextFirst2p === "X" ? "O" : "X";
  } else {
    turn = starter === "you" ? HUMAN : MACHINE;
  }
  render();
  if (players === "1p" && turn === MACHINE) machineMove();
  else setStatus(players === "2p" ? `${turn}'s turn.` : "Your turn.");
}

function humanMove(i) {
  if (over || board[i]) return;
  if (players === "1p" && turn !== HUMAN) return;   // wait for the machine
  place(i, turn);                                   // 2 players: whoever's turn it is
}

function machineMove() {
  setStatus("Machine is thinking...");
  const myRound = roundId;
  setTimeout(() => {
    if (myRound !== roundId || over) return;     // round was reset while thinking
    const i = chooseMove(board);
    place(i, MACHINE);
  }, THINK_MS);
}

function place(i, mark) {
  board[i] = mark;
  const w = findWinner(board);
  if (w) return finish(w.mark === HUMAN || players === "2p" ? "win" : "lose", w.line, w.mark);
  if (emptySquares(board).length === 0) return finish("draw", null);
  turn = mark === "X" ? "O" : "X";
  render();
  if (players === "1p" && turn === MACHINE) machineMove();
  else setStatus(players === "2p" ? `${turn}'s turn.` : "Your turn.");
}

function finish(outcome, line, winMark) {
  over = true;
  turn = null;
  render(line);

  if (players === "2p") {
    // 2 player rounds have their own tally: X wins, O wins, draws
    if (outcome === "draw") record.two.d++;
    else if (winMark === "X") record.two.x++;
    else record.two.o++;
    saveRecord(record);
    renderRecord();
  } else if (!(mode === "unbeatable" && cheatOn)) {
    // Rounds played with the cheat code on don't count toward the Unbeatable record
    const slot = record[mode];
    if (outcome === "win") slot.w++;
    else if (outcome === "lose") slot.l++;
    else slot.d++;
    saveRecord(record);
    renderRecord();
  }

  const winText = players === "2p" ? `${winMark} wins!` : "You won!";
  const msg = {
    win:  { seal: "勝", text: winText,                         status: winText },
    lose: { seal: "負", text: "Machine wins.",                status: "Machine wins." },
    draw: { seal: "引", text: "A draw. That's the best anyone gets.", status: "A draw." },
  }[outcome];
  setStatus(msg.status);
  sealEl.textContent = msg.seal;
  resultTextEl.textContent = msg.text;
  // let the winning line sit on screen for a moment before the stamp lands
  const myRound = roundId;
  setTimeout(() => {
    if (myRound !== roundId) return;
    resultEl.classList.add("show");
    document.getElementById("again").focus({ preventScroll: true });
  }, line ? 900 : 500);
}

// ---- Buttons ----
document.getElementById("again").addEventListener("click", newRound);

function wireToggle(attr, apply) {
  document.querySelectorAll(`[data-${attr}]`).forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(`[data-${attr}]`).forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn)));
      apply(btn.dataset[attr]);
      newRound();
    });
  });
}
wireToggle("mode", (v) => { mode = v; });
wireToggle("players", (v) => {
  players = v;
  nextFirst2p = "X";
  // the machine settings make no sense with two humans
  document.getElementById("group-machine").hidden = v === "2p";
  document.getElementById("group-first").hidden = v === "2p";
  renderRecord();
});
wireToggle("starter", (v) => { starter = v; });

// ============================================================
//  SECRET: the Konami code
//  Up Up Down Down Left Right Left Right B A
//  Turns Unbeatable into a medium-level player. Enter it again to turn it off.
//
//  Keyboard: press the keys.
//  Phone: swipe the 8 directions on the title area, then a secret pad
//  pops up and you tap B, then A.
// ============================================================
const SEQ = ["up", "up", "down", "down", "left", "right", "left", "right", "b", "a"];
const SWIPE_STEPS = 8;           // the 8 direction moves before the B A pad appears
const SWIPE_MIN_PX = 40;         // how far a finger must travel to count as a swipe
const PAD_TIMEOUT_MS = 8000;     // the secret pad closes by itself after this long

let konamiProgress = 0;
let padTimer;
const toastEl = document.getElementById("toast");
const padEl = document.getElementById("secret-pad");
let toastTimer;

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
}

function openPad() {
  padEl.classList.add("show");
  clearTimeout(padTimer);
  padTimer = setTimeout(() => { closePad(); konamiProgress = 0; }, PAD_TIMEOUT_MS);
}

function closePad() {
  padEl.classList.remove("show");
  clearTimeout(padTimer);
}

function toggleCheat() {
  cheatOn = !cheatOn;
  showToast(cheatOn
    ? "Cheat code on. Unbeatable now plays like Medium."
    : "Cheat code off. Unbeatable is unbeatable again.");
}

// Every input (key, swipe, or pad button) becomes a token and comes through here.
// Returns true if the token was the next correct step.
function feedKonami(token, viaTouch) {
  if (token === SEQ[konamiProgress]) {
    konamiProgress++;
    if (konamiProgress === SEQ.length) {
      konamiProgress = 0;
      closePad();
      toggleCheat();
    } else if (konamiProgress === SWIPE_STEPS && viaTouch) {
      openPad();                 // eight swipes done: reveal the B and A buttons
    }
    return true;
  }
  konamiProgress = token === SEQ[0] ? 1 : 0;   // wrong key: start over (an Up can start a new try)
  closePad();
  return false;
}

// ---- Keyboard ----
const KEY_TOKENS = {
  arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right", b: "b", a: "a",
};
document.addEventListener("keydown", (e) => {
  const token = KEY_TOKENS[e.key.toLowerCase()];
  if (!token) { konamiProgress = 0; return; }
  const ok = feedKonami(token, false);
  if (ok && e.key.startsWith("Arrow")) e.preventDefault();   // stop the page scrolling mid-code
});

// ---- Swipes (touch and pen only; the mouse never counts) ----
const swipeZone = document.getElementById("swipe-zone");
let swipeStart = null;

swipeZone.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse") return;
  swipeStart = { x: e.clientX, y: e.clientY };
});
swipeZone.addEventListener("pointercancel", () => { swipeStart = null; });
swipeZone.addEventListener("pointerup", (e) => {
  if (!swipeStart) return;
  const dx = e.clientX - swipeStart.x;
  const dy = e.clientY - swipeStart.y;
  swipeStart = null;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (Math.max(ax, ay) < SWIPE_MIN_PX) return;           // too short: that was a tap
  const token = ay > ax ? (dy < 0 ? "up" : "down") : (dx < 0 ? "left" : "right");
  const ok = feedKonami(token, true);
  if (ok && navigator.vibrate) navigator.vibrate(10);    // tiny buzz on Android
});

// ---- The secret pad (B and A buttons) ----
padEl.querySelectorAll("[data-key]").forEach((btn) => {
  btn.addEventListener("click", () => feedKonami(btn.dataset.key, true));
});

renderRecord();
newRound();