// ============================================================
//  SILLY TYPING TEST
//  EDIT THIS LIST to add more ridiculous sentences.
//  Tip: keep them under about 55 characters so they fit on one row.
// ============================================================
const SENTENCES = [
  "The penguin filed his taxes in a hurry.",
  "My goldfish is writing a very long novel.",
  "A grumpy llama refused to pay for parking.",
  "Seven pickles were sitting on the royal throne.",
  "The toaster apologized to the sleepy giraffe.",
  "Grandma taught the robot how to moonwalk.",
  "A squirrel lost his keys inside the volcano.",
  "Please do not feed the dragon after midnight.",
  "The wizard ordered a pizza with no magic.",
  "Three ducks opened a tiny bakery on the moon.",
  "My cat just joined the school marching band.",
  "The banana quietly won the chess tournament.",
  "A polite ghost asked for directions to Mars.",
  "Nobody told the octopus that socks were optional.",
  "The snowman ran for mayor and lost by one carrot.",
  "The sleepy robot knitted a sweater for the moon.",
  "A brave potato applied for a job at the zoo.",
  "My neighbor trained a seagull to deliver pizza.",
  "The vampire was scared of the tiny hamster.",
  "Our teacher turned into a raccoon during lunch.",
  "A confused turtle won the great sprinting race.",
  "The cheese sandwich demanded a better pillow.",
  "Eight monkeys held a very serious meeting about hats.",
];

const BEST_KEY = "day5-best-wpm";

// ---- Elements ----
const targetEl = document.getElementById("target");
const typer    = document.getElementById("typer");
const clockEl  = document.getElementById("clock");
const clockBox = clockEl.parentElement;
const countEl  = document.getElementById("count");
const bestEl   = document.getElementById("best");
const hintEl   = document.getElementById("hint");

const overlay  = document.getElementById("overlay");
const popupTag = document.getElementById("popup-tag");
const popupTitle = document.getElementById("popup-title");
const popupLine  = document.getElementById("popup-line");
const rWpm  = document.getElementById("r-wpm");
const rAcc  = document.getElementById("r-acc");
const rTime = document.getElementById("r-time");
const btnNext  = document.getElementById("btn-next");
const btnHome  = document.getElementById("btn-home");

// ---- State ----
let sentence = "";
let chars = [];            // one <span> per character of the sentence
let deck = [];             // shuffled sentences we haven't used yet
let lastSentence = "";
let sentenceNumber = 0;

let startTime = null;      // set on the first keystroke
let timerId = null;
let prevLen = 0;
let totalTyped = 0;        // every character you typed (including ones you later deleted)
let totalWrong = 0;        // how many of those were wrong when you typed them
let finished = false;

// ---- Best score (per device) ----
function loadBest() {
  try {
    const v = parseFloat(localStorage.getItem(BEST_KEY));
    return Number.isFinite(v) ? v : 0;
  } catch (e) { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* private mode */ }
}
let best = loadBest();
function showBest() { bestEl.textContent = best ? Math.round(best) + " wpm" : "–"; }
showBest();

// ---- Picking sentences ----
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function nextSentence() {
  if (deck.length === 0) {
    deck = shuffle(SENTENCES.slice());
    // don't show the same sentence twice in a row when the deck refills
    if (deck.length > 1 && deck[deck.length - 1] === lastSentence) {
      deck.unshift(deck.pop());
    }
  }
  lastSentence = deck.pop();
  return lastSentence;
}

// ---- Drawing the sentence row ----
function buildTarget() {
  targetEl.textContent = "";
  chars = [];
  for (const ch of sentence) {
    const span = document.createElement("span");
    span.className = "ch";
    span.textContent = ch;
    targetEl.append(span);
    chars.push(span);
  }
}

function paint() {
  const typed = typer.value;
  let hasError = false;
  for (let i = 0; i < chars.length; i++) {
    let cls = "ch";
    if (i < typed.length) {
      if (typed[i] === sentence[i]) cls += " ok";
      else { cls += " bad"; hasError = true; }
    } else if (i === typed.length) {
      cls += " cur";
    }
    chars[i].className = cls;
  }
  typer.classList.toggle("has-error", hasError);
}

// ---- Stopwatch ----
function elapsedMs() { return startTime === null ? 0 : performance.now() - startTime; }
function tick() { clockEl.textContent = (elapsedMs() / 1000).toFixed(1) + "s"; }
function startClock() {
  startTime = performance.now();
  clockBox.classList.add("running");
  timerId = setInterval(tick, 50);
}
function stopClock() {
  clearInterval(timerId);
  timerId = null;
  clockBox.classList.remove("running");
}

// ---- Round control ----
function resetRound() {
  stopClock();
  startTime = null;
  prevLen = 0;
  totalTyped = 0;
  totalWrong = 0;
  finished = false;
  typer.disabled = false;
  typer.value = "";
  typer.maxLength = sentence.length;
  clockEl.textContent = "0.0s";
  hintEl.textContent = "The clock starts on your first key. Fix every mistake to finish.";
  paint();
  typer.focus();
}

function newSentence() {
  sentence = nextSentence();
  sentenceNumber++;
  countEl.textContent = String(sentenceNumber);
  buildTarget();
  resetRound();
}

// ---- Typing ----
typer.addEventListener("input", (e) => {
  if (finished || e.isComposing) return;
  const v = typer.value;

  if (startTime === null && v.length > 0) startClock();

  // Count only characters that were just added
  for (let i = prevLen; i < v.length; i++) {
    totalTyped++;
    if (v[i] !== sentence[i]) totalWrong++;
  }
  prevLen = v.length;

  paint();

  if (v === sentence) finish();
});

// No copy-pasting the answer
["paste", "drop"].forEach((evt) =>
  typer.addEventListener(evt, (e) => e.preventDefault())
);

// Clicking the sentence row jumps into the box
targetEl.addEventListener("click", () => typer.focus());

// ---- Finishing ----
function finish() {
  finished = true;
  const ms = elapsedMs();
  stopClock();
  clockEl.textContent = (ms / 1000).toFixed(1) + "s";
  typer.disabled = true;

  const minutes = ms / 60000;
  // Standard rule: one "word" is five characters
  const wpm = minutes > 0 ? (sentence.length / 5) / minutes : 0;
  const accuracy = totalTyped > 0
    ? Math.max(0, Math.round(((totalTyped - totalWrong) / totalTyped) * 100))
    : 100;

  const isBest = wpm > best;
  if (isBest) { best = wpm; saveBest(best); showBest(); }

  showPopup(wpm, accuracy, ms, isBest);
}

function verdict(wpm, accuracy) {
  if (accuracy < 80) return ["Speedy, but sloppy", "Slow down a little and the red goes away."];
  if (wpm >= 80) return ["Absurdly fast", "Even the penguin is impressed."];
  if (wpm >= 55) return ["Quick fingers", "That was smooth."];
  if (wpm >= 35) return ["Nicely done", "Solid. Can you go faster?"];
  return ["Slow and steady", "The sentence was silly. Your pace was fine."];
}

function showPopup(wpm, accuracy, ms, isBest) {
  const [title, line] = verdict(wpm, accuracy);
  popupTitle.textContent = title;
  popupLine.textContent = line;
  popupTag.hidden = !isBest;
  rWpm.textContent = String(Math.round(wpm));
  rAcc.textContent = accuracy + "%";
  rTime.textContent = (ms / 1000).toFixed(2) + "s";
  overlay.hidden = false;
  btnNext.focus();
}

function closePopup() { overlay.hidden = true; }

btnNext.addEventListener("click", () => { closePopup(); newSentence(); });

// Keep Tab inside the popup while it is open
overlay.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const order = [btnNext, btnHome];
  const i = order.indexOf(document.activeElement);
  e.preventDefault();
  const step = e.shiftKey ? -1 : 1;
  order[(i + step + order.length) % order.length].focus();
});

// ---- Go ----
newSentence();