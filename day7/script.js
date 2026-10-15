// ============================================================
//  Life Calculator. Everything here is a rough average.
//  Tweak the numbers in RATES to change the estimates.
// ============================================================
const RATES = {
  heartPerMin: 75,      // resting heartbeats per minute
  breathsPerMin: 16,    // breaths per minute
  blinksPerMin: 15,     // blinks per minute while awake
  sleepShare: 8 / 24,   // fraction of life spent asleep
  mealsPerDay: 3,
  stepsPerDay: 5000,    // walking starts around age 1
  daysPerSlice: 4,      // one slice of pizza every four days
  moonCycleDays: 29.53,
};

const MS_MIN = 60 * 1000;
const MS_DAY = 24 * 60 * MS_MIN;

const dobInput = document.getElementById("dob");
const goBtn = document.getElementById("go");
const errorBox = document.getElementById("error");
const results = document.getElementById("results");
const beatsEl = document.getElementById("beats");
const statsEl = document.getElementById("stats");
const nextEl = document.getElementById("next");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt = (n) => Math.floor(n).toLocaleString("en-US");

// Today as YYYY-MM-DD in local time, so you can't pick the future
function todayString() {
  const t = new Date();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${m}-${d}`;
}
dobInput.max = todayString();

let tickTimer = null;
let countTimer = null;

function stats(ageMs) {
  const mins = ageMs / MS_MIN;
  const days = ageMs / MS_DAY;
  return [
    { value: days,                                              label: "days alive" },
    { value: mins * RATES.breathsPerMin,                        label: "breaths taken" },
    { value: mins * (1 - RATES.sleepShare) * RATES.blinksPerMin, label: "blinks" },
    { value: (days * 24) * RATES.sleepShare,                    label: "hours spent asleep" },
    { value: days * RATES.mealsPerDay,                          label: "meals eaten" },
    { value: Math.max(0, days - 365) * RATES.stepsPerDay,       label: "steps walked" },
    { value: days / RATES.daysPerSlice,                         label: "slices of pizza (probably)" },
    { value: days / RATES.moonCycleDays,                        label: "full moons since you were born" },
    { value: days * 24 * 60 * 60 / 1,                           label: "seconds you have been here", seconds: true },
  ];
}

function showError(msg) {
  errorBox.textContent = msg;
}

function parseDob(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysToNextBirthday(dob) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  return Math.round((next - today) / MS_DAY);
}

function calculate() {
  showError("");
  const dob = parseDob(dobInput.value);

  if (!dob || isNaN(dob)) {
    showError("Pick your birthday first.");
    return;
  }
  const ageMs = Date.now() - dob.getTime();
  if (ageMs < 0) {
    showError("That date is in the future. Pick the day you were born.");
    return;
  }
  if (ageMs > 120 * 365.25 * MS_DAY) {
    showError("That would make you over 120. Check the year.");
    return;
  }

  clearInterval(tickTimer);
  clearInterval(countTimer);

  // Build the stat cards
  statsEl.textContent = "";
  const list = stats(ageMs);
  const numEls = list.map((s) => {
    const li = document.createElement("li");
    li.className = "stat";
    const num = document.createElement("p");
    num.className = "stat-num";
    const label = document.createElement("p");
    label.className = "stat-label";
    label.textContent = s.label;
    li.append(num, label);
    statsEl.append(li);
    return num;
  });

  // Birthday line
  const left = daysToNextBirthday(dob);
  nextEl.textContent =
    left === 0 ? "Today is your birthday. Happy birthday!"
    : left === 1 ? "Your next birthday is tomorrow."
    : `Your next birthday is in ${fmt(left)} days.`;

  results.hidden = false;
  results.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

  const beatsNow = () => ((Date.now() - dob.getTime()) / MS_MIN) * RATES.heartPerMin;
  const setBeats = (n) => { beatsEl.textContent = ""; const s = document.createElement("span"); s.textContent = fmt(n); beatsEl.append(s); };

  // After the count-up, keep everything live
  const goLive = () => {
    tickTimer = setInterval(() => {
      const age = Date.now() - dob.getTime();
      setBeats(beatsNow());
      stats(age).forEach((s, i) => { numEls[i].textContent = fmt(s.value); });
    }, 800);
  };

  if (reduceMotion) {
    setBeats(beatsNow());
    stats(ageMs).forEach((s, i) => { numEls[i].textContent = fmt(s.value); });
    goLive();
    return;
  }

  // Count up from zero with an ease-out curve
  const start = performance.now();
  const DURATION = 1600;
  countTimer = setInterval(() => {
    const t = Math.min(1, (performance.now() - start) / DURATION);
    const eased = 1 - Math.pow(1 - t, 3);
    setBeats(beatsNow() * eased);
    stats(Date.now() - dob.getTime()).forEach((s, i) => { numEls[i].textContent = fmt(s.value * eased); });
    if (t >= 1) {
      clearInterval(countTimer);
      goLive();
    }
  }, 30);
}

goBtn.addEventListener("click", calculate);
dobInput.addEventListener("keydown", (e) => { if (e.key === "Enter") calculate(); });