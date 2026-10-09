// ============================================================
//  STOP AT 10.00
//  How it works:
//   1. Start saves the current time (Date.now()).
//   2. setInterval redraws the clock many times a second.
//   3. After HIDE_AT seconds, the numbers vanish.
//   4. Stop: (now - start) is how long you really waited.
// ============================================================

const TARGET = 10;      // seconds you are trying to hit
const HIDE_AT = 2;      // numbers vanish after this many seconds. Try 0 for hard mode!

const clock    = document.getElementById("clock");
const action   = document.getElementById("action");
const result   = document.getElementById("result");
const bestEl   = document.getElementById("best");
const triesEl  = document.getElementById("tries");
const shareBtn = document.getElementById("share");
const resetBtn = document.getElementById("reset");

let startTime = 0;      // the moment you pressed Start
let timerId = null;     // the id setInterval gives us, so we can stop it later
let running = false;
let lastTime = null;    // your most recent result, used by the share button

// ---- Saved stats (localStorage keeps them after you close the tab) ----
let best  = loadNumber("day1-best", null);   // smallest miss, in seconds
let tries = loadNumber("day1-tries", 0);

function loadNumber(key, fallback) {
  try {
    const value = parseFloat(localStorage.getItem(key));
    return Number.isFinite(value) ? value : fallback;
  } catch (e) {
    return fallback;   // storage can be blocked, the game still works
  }
}
function saveNumber(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch (e) { /* ignore */ }
}

function showStats() {
  bestEl.textContent = best === null ? "None yet" : "Off by " + best.toFixed(2) + "s";
  triesEl.textContent = tries.toLocaleString();   // toLocaleString adds commas to big numbers
}

// ---- Game ----
function start() {
  running = true;
  startTime = Date.now();
  result.innerHTML = "";
  shareBtn.hidden = true;
  clock.className = "clock";
  action.textContent = "Stop";
  action.classList.add("running");
  // Redraw the clock every 10 milliseconds
  timerId = setInterval(tick, 10);
  tick();
}

function tick() {
  const seconds = (Date.now() - startTime) / 1000;
  if (seconds < HIDE_AT) {
    clock.textContent = seconds.toFixed(2);
    clock.classList.remove("hidden-time");
  } else {
    clock.textContent = "?.??";
    clock.classList.add("hidden-time");   // CSS fades the colour. One class, one line.
  }
}

function stop() {
  clearInterval(timerId);                 // stop the redraw loop
  running = false;
  const seconds = (Date.now() - startTime) / 1000;
  lastTime = seconds;

  const miss = Math.abs(seconds - TARGET);
  tries++;
  saveNumber("day1-tries", tries);

  const isNewBest = best === null || miss < best;
  if (isNewBest) {
    best = miss;
    saveNumber("day1-best", best);
  }

  clock.textContent = seconds.toFixed(2);
  clock.className = "clock reveal";
  action.textContent = "Try again";
  action.classList.remove("running");
  showResult(seconds, miss, isNewBest);
  showStats();
  shareBtn.hidden = false;
}

function showResult(seconds, miss, isNewBest) {
  const perfect = seconds.toFixed(2) === TARGET.toFixed(2);
  const direction = seconds < TARGET ? "too early" : "too late";
  let verdict;

  if (perfect)           verdict = "Exactly 10.00. Unreal.";
  else if (miss <= 0.05) verdict = "So close!";
  else if (miss <= 0.25) verdict = "Nice instincts.";
  else if (miss <= 1)    verdict = "Not bad.";
  else                   verdict = "Way off. Again?";

  let html = "";
  if (perfect) html += '<div class="seal" aria-hidden="true">10</div>';
  html += '<p class="verdict">' + verdict + "</p>";
  if (!perfect) html += '<p class="detail">' + miss.toFixed(2) + "s " + direction + "." + "</p>";
  if (isNewBest && tries > 1) html += '<p class="detail"><strong>New personal best!</strong></p>';
  result.innerHTML = html;
}

function toggle() {
  if (running) stop();
  else start();
}

// ---- Controls ----
// pointerdown fires the instant a finger or mouse presses down. A "click" only fires
// when you let go, which adds a little delay. For a timing game, faster is better.
action.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;   // ignore right-clicks
  toggle();
});

// Space bar and Enter work too. preventDefault stops the page from scrolling down.
// (We don't listen for "click" on purpose: it would fire along with pointerdown
// and the game would start and stop on the same tap.)
document.addEventListener("keydown", (event) => {
  if ((event.code === "Space" || event.code === "Enter") && !event.repeat) {
    event.preventDefault();
    toggle();
  }
});

shareBtn.addEventListener("click", async () => {
  const text = "I stopped at " + lastTime.toFixed(2) + " on Stop at 10.00. Can you get closer? " + location.href;
  try {
    await navigator.clipboard.writeText(text);
    shareBtn.textContent = "Copied!";
  } catch (e) {
    shareBtn.textContent = "Couldn't copy";
  }
  setTimeout(() => { shareBtn.textContent = "Copy my score"; }, 1500);
});

resetBtn.addEventListener("click", () => {
  best = null;
  tries = 0;
  saveNumber("day1-best", null);
  saveNumber("day1-tries", 0);
  showStats();
});

showStats();
