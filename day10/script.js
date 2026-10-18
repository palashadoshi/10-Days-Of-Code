// GUESSES (every valid guess) and ANSWERS (possible secret words) come from words.js

const LEN = 5;
const TRIES = 6;
const PRAISE = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"];
const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

const boardEl = document.getElementById("board");
const msgEl = document.getElementById("msg");
const kbEl = document.getElementById("kb");
const againBtn = document.getElementById("again");
const statsEl = document.getElementById("stats");

let answer, row, col, over, busy;
let tiles = [];
let rows = [];
const keyEls = {};

// ---------- Stats (saved in the browser) ----------
function loadStats() {
  try {
    return Object.assign({ wins: 0, streak: 0, best: 0 }, JSON.parse(localStorage.getItem("day10-stats")));
  } catch (e) { return { wins: 0, streak: 0, best: 0 }; }
}
function saveStats(s) {
  try { localStorage.setItem("day10-stats", JSON.stringify(s)); } catch (e) {}
}
function showStats() {
  const s = loadStats();
  statsEl.textContent = `Wins: ${s.wins}   Streak: ${s.streak}   Best streak: ${s.best}`;
}

// ---------- Build the page ----------
function buildBoard() {
  boardEl.innerHTML = "";
  tiles = [];
  rows = [];
  for (let r = 0; r < TRIES; r++) {
    const rowEl = document.createElement("div");
    rowEl.className = "row";
    const rowTiles = [];
    for (let c = 0; c < LEN; c++) {
      const t = document.createElement("div");
      t.className = "tile";
      rowEl.append(t);
      rowTiles.push(t);
    }
    boardEl.append(rowEl);
    rows.push(rowEl);
    tiles.push(rowTiles);
  }
}

function buildKeyboard() {
  kbEl.innerHTML = "";
  KEY_ROWS.forEach((letters, i) => {
    const r = document.createElement("div");
    r.className = "kb-row";
    const keys = i === 2 ? ["ENTER", ...letters, "DEL"] : [...letters];
    keys.forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = k.length > 1 ? "key wide" : "key";
      b.textContent = k;
      b.dataset.key = k;
      b.setAttribute("aria-label", k === "DEL" ? "Delete" : k === "ENTER" ? "Enter" : k);
      keyEls[k] = b;
      r.append(b);
    });
    kbEl.append(r);
  });
}

// pointerdown feels faster than click on phones
kbEl.addEventListener("pointerdown", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  e.preventDefault();
  press(b.dataset.key);
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "Enter") {
    if (!againBtn.hidden && document.activeElement === againBtn) return; // let the button handle its own Enter
    e.preventDefault();
    press("ENTER");
  } else if (e.key === "Backspace") press("DEL");
  else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
});

// ---------- Game ----------
function say(text) { msgEl.textContent = text; }

function press(key) {
  if (over || busy) return;
  if (key === "ENTER") return submit();
  if (key === "DEL") {
    if (col > 0) {
      col--;
      tiles[row][col].textContent = "";
      tiles[row][col].classList.remove("filled");
    }
    return;
  }
  if (col < LEN) {
    const t = tiles[row][col];
    t.textContent = key;
    t.classList.add("filled");
    col++;
    say("");
  }
}

// Score a guess. Two passes so repeated letters are handled correctly.
function evaluate(guess, target) {
  const result = Array(LEN).fill("absent");
  const left = {};
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === target[i]) result[i] = "correct";
    else left[target[i]] = (left[target[i]] || 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (result[i] === "correct") continue;
    if (left[guess[i]] > 0) { result[i] = "present"; left[guess[i]]--; }
  }
  return result;
}

function submit() {
  if (col < LEN) {
    say("Need 5 letters.");
    rows[row].classList.remove("shake");
    void rows[row].offsetWidth; // restart the animation
    rows[row].classList.add("shake");
    return;
  }
  const guess = tiles[row].map((t) => t.textContent).join("");
  if (!GUESSES.has(guess)) {
    say("Not in word list.");
    rows[row].classList.remove("shake");
    void rows[row].offsetWidth;
    rows[row].classList.add("shake");
    return;
  }
  const result = evaluate(guess, answer);
  const thisRow = row;
  busy = true;

  tiles[thisRow].forEach((t, i) => {
    setTimeout(() => {
      t.classList.add("reveal");
      setTimeout(() => t.classList.add(result[i]), 250); // color lands mid-flip
    }, i * 300);
  });

  setTimeout(() => {
    guess.split("").forEach((ch, i) => paintKey(ch, result[i]));
    busy = false;
    if (guess === answer) return finish(true, thisRow);
    if (thisRow === TRIES - 1) return finish(false, thisRow);
    row++;
    col = 0;
  }, LEN * 300 + 300);
}

const RANK = { absent: 1, present: 2, correct: 3 };
function paintKey(ch, state) {
  const k = keyEls[ch];
  const current = ["absent", "present", "correct"].find((s) => k.classList.contains(s));
  if (current && RANK[current] >= RANK[state]) return;
  k.classList.remove("absent", "present", "correct");
  k.classList.add(state);
}

function finish(won, atRow) {
  over = true;
  const s = loadStats();
  if (won) {
    s.wins++; s.streak++; s.best = Math.max(s.best, s.streak);
    say(PRAISE[atRow]);
  } else {
    s.streak = 0;
    msgEl.innerHTML = "";
    msgEl.append("The word was ");
    const m = document.createElement("mark");
    m.textContent = answer;
    msgEl.append(m, ".");
  }
  saveStats(s);
  showStats();
  againBtn.hidden = false;
  againBtn.focus();
}

function newGame() {
  answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
  row = 0; col = 0; over = false; busy = false;
  buildBoard();
  Object.values(keyEls).forEach((k) => k.classList.remove("absent", "present", "correct"));
  say("");
  againBtn.hidden = true;
  againBtn.blur(); // so Enter goes to the game, not the hidden button
  showStats();
}

againBtn.addEventListener("click", newGame);

buildKeyboard();
newGame();