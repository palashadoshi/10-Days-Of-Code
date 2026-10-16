// ============================================================
//  THE RULES. Each one has:
//    text  - what the player reads
//    test  - returns true when the password passes
//    hint  - (optional) live help shown under the rule
//  To add a rule, add one object to the list. That's it.
// ============================================================
const PLANETS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const now = new Date();
const TODAY = DAYS[now.getDay()];
const YEAR = String(now.getFullYear());

const length = (pw) => Array.from(pw).length;   // emoji count as 1
const digitSum = (pw) => (pw.match(/\d/g) || []).reduce((sum, d) => sum + Number(d), 0);
const has = (pw, word) => pw.toLowerCase().includes(word);

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "black", "white"];
const ANIMALS = ["cat", "dog", "fish", "lion", "tiger", "bear", "wolf", "fox", "owl", "frog", "duck", "panda"];
const LANGS = ["html", "css", "javascript", "python"];
const GREEK = ["alpha", "beta", "gamma", "delta", "sigma", "theta", "lambda", "omega"];
const anyOf = (pw, words) => words.some((w) => has(pw, w));
const upperCount = (pw) => (pw.match(/[A-Z]/g) || []).length;

// Is there a palindrome of letters/digits at least `min` long hiding in here?
function hasPalindrome(pw, min) {
  const s = pw.toLowerCase();
  const ok = (c) => /[a-z0-9]/.test(c);
  const grow = (l, r) => {
    while (l >= 0 && r < s.length && ok(s[l]) && s[l] === s[r]) { l--; r++; }
    return r - l - 1;
  };
  for (let i = 0; i < s.length; i++) {
    if (grow(i, i) >= min || grow(i, i + 1) >= min) return true;
  }
  return false;
}

const COUNTRIES = ["japan", "brazil", "india", "canada", "egypt", "france", "mexico", "peru", "chile", "kenya", "spain", "italy"];
const NUMBER_WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const emojiCount = (pw) => (pw.match(/\p{Extended_Pictographic}/gu) || []).length;
const vowelCount = (pw) => (pw.match(/[aeiou]/gi) || []).length;

// First pair of identical neighbors, or null. The current year is allowed to
// contain doubles (like 2033), otherwise some years would be impossible.
function findDouble(pw) {
  for (const part of pw.split(YEAR)) {
    const m = part.match(/(.)\1/su);
    if (m) return m[0];
  }
  return null;
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

const RULES = [
  { text: "Your password must be at least 5 characters.",
    test: (pw) => length(pw) >= 5 },
  { text: "Your password must include a number.",
    test: (pw) => /\d/.test(pw) },
  { text: "Your password must include an uppercase letter.",
    test: (pw) => /[A-Z]/.test(pw) },
  { text: "Your password must include a special character, like ! or # or $.",
    test: (pw) => /[^A-Za-z0-9\s\p{Extended_Pictographic}]/u.test(pw) },
  { text: "The digits in your password must add up to 20.",
    test: (pw) => digitSum(pw) === 20,
    hint: (pw) => `Right now they add up to ${digitSum(pw)}.` },
  { text: "Your password must include a planet.",
    test: (pw) => PLANETS.some((p) => has(pw, p)),
    hint: () => "Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, or Neptune." },
  { text: "Your password must include today's day of the week.",
    test: (pw) => has(pw, TODAY) },
  { text: "Your password must include an emoji.",
    test: (pw) => /\p{Extended_Pictographic}/u.test(pw),
    hint: () => "Windows: press the Windows key + period. Mac: press Control + Command + Space." },
  { text: `Your password must include the current year.`,
    test: (pw) => pw.includes(YEAR),
    hint: () => "Careful. Remember rule 5." },
  { text: "Your password must include a month of the year.",
    test: (pw) => anyOf(pw, MONTHS),
    hint: () => "Spell the whole month out." },
  { text: "Your password must include a color.",
    test: (pw) => anyOf(pw, COLORS),
    hint: () => "Red, blue, green, yellow, purple, orange, pink, black, or white." },
  { text: "Your password must include an animal.",
    test: (pw) => anyOf(pw, ANIMALS),
    hint: () => "Cat, dog, fish, lion, tiger, bear, wolf, fox, owl, frog, duck, or panda." },
  { text: "Your password must include a coding language.",
    test: (pw) => anyOf(pw, LANGS),
    hint: () => "HTML, CSS, JavaScript, or Python." },
  { text: "Your password must include a Greek letter.",
    test: (pw) => anyOf(pw, GREEK),
    hint: () => "Alpha, beta, gamma, delta, sigma, theta, lambda, or omega." },
  { text: "Your password must have at least 3 uppercase letters.",
    test: (pw) => upperCount(pw) >= 3,
    hint: (pw) => `Right now it has ${upperCount(pw)}.` },
  { text: "Your password must include a plus sign (+).",
    test: (pw) => pw.includes("+") },
  { text: "Your password must include the word \"please\".",
    test: (pw) => has(pw, "please"),
    hint: () => "Manners matter." },
  { text: "Your password must contain a palindrome at least 5 characters long.",
    test: (pw) => hasPalindrome(pw, 5),
    hint: () => "It reads the same backwards. Like \"level\" or \"radar\"." },
  { text: "Your password must be at least 30 characters.",
    test: (pw) => length(pw) >= 30,
    hint: (pw) => `Right now it is ${length(pw)} characters.` },
  { text: "Your password must include at least 2 emoji.",
    test: (pw) => emojiCount(pw) >= 2,
    hint: (pw) => `Right now it has ${emojiCount(pw)}.` },
  { text: "Your password must include a country.",
    test: (pw) => anyOf(pw, COUNTRIES),
    hint: () => "Japan, Brazil, India, Canada, Egypt, France, Mexico, Peru, Chile, Kenya, Spain, or Italy." },
  { text: "Your password must include a number spelled out, from one to ten.",
    test: (pw) => anyOf(pw, NUMBER_WORDS) },
  { text: "Your password must never repeat the same character twice in a row.",
    test: (pw) => findDouble(pw) === null,
    hint: (pw) => `Look at "${findDouble(pw)}".` },
  { text: "Your password must have at least 8 vowels.",
    test: (pw) => vowelCount(pw) >= 8,
    hint: (pw) => `Right now it has ${vowelCount(pw)}. (A, E, I, O, U)` },
  { text: "Your password must include the digit 7.",
    test: (pw) => pw.includes("7"),
    hint: () => "And the digits still have to add up to 20." },
  { text: "Your password must include 5 consonants in a row.",
    test: (pw) => /[bcdfghjklmnpqrstvwxz]{5}/i.test(pw),
    hint: () => "Every letter except A, E, I, O, U, and Y." },
  { text: "Your password must start with an uppercase letter.",
    test: (pw) => /^[A-Z]/.test(pw) },
  { text: "Your password must end with an exclamation mark (!).",
    test: (pw) => pw.endsWith("!") },
  { text: "Your password must be no longer than 60 characters.",
    test: (pw) => length(pw) <= 60,
    hint: (pw) => `Right now it is ${length(pw)} characters.` },
  { text: "The length of your password must be a prime number.",
    test: (pw) => isPrime(length(pw)),
    hint: (pw) => `Right now it is ${length(pw)} characters.` },
];

// ---------- Page elements ----------
const input = document.getElementById("pw");
const list = document.getElementById("rules");
const countEl = document.getElementById("count");
const progressEl = document.getElementById("progress");
const timerEl = document.getElementById("timer");
const winEl = document.getElementById("win");
const winText = document.getElementById("win-text");
const againBtn = document.getElementById("again");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// ---------- Game state ----------
let revealed = 0;       // how many rules are showing
let won = false;
let startTime = null;
let timerId = null;

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function startTimer() {
  if (startTime !== null) return;
  startTime = Date.now();
  timerId = setInterval(() => {
    timerEl.textContent = formatTime(Date.now() - startTime);
  }, 250);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function render(pw, popFrom) {
  list.textContent = "";

  const items = RULES.slice(0, revealed).map((rule, i) => ({ rule, i, ok: rule.test(pw) }));
  // broken rules first, newest on top
  items.sort((a, b) => (a.ok - b.ok) || (b.i - a.i));

  items.forEach(({ rule, i, ok }) => {
    const isNewest = i === revealed - 1 && !ok;
    let cls = "rule " + (ok ? "ok" : "bad");
    if (isNewest) cls += " newest";
    if (i >= popFrom) cls += " pop";

    const li = el("li", cls);
    li.append(el("span", "badge", ok ? "✓" : "!"));

    const body = el("div");
    body.append(el("p", "rule-label", "Rule " + (i + 1)));
    const text = el("p", "rule-text");
    text.append(el("span", "", rule.text));
    body.append(text);
    if (rule.hint && !ok) body.append(el("p", "rule-hint", rule.hint(pw)));
    li.append(body);
    list.append(li);
  });
}

function update() {
  const pw = input.value;
  if (pw.length > 0) startTimer();

  // Reveal the next rule whenever every visible rule passes
  const before = revealed;
  while (revealed < RULES.length && RULES.slice(0, revealed).every((r) => r.test(pw))) {
    revealed++;
  }

  render(pw, before);
  countEl.textContent = length(pw) + (length(pw) === 1 ? " character" : " characters");
  progressEl.textContent = "Rule " + Math.max(revealed, 1) + " of " + RULES.length;

  if (!won && revealed === RULES.length && RULES.every((r) => r.test(pw))) {
    won = true;
    stopTimer();
    const time = formatTime(Date.now() - startTime);
    winText.textContent = `You beat all ${RULES.length} rules in ${time}. Your password is ${length(pw)} characters long.`;
    winEl.hidden = false;
    input.readOnly = true;   // lock it so the winning password stays
    timerEl.textContent = time;
  }
}

function reset() {
  stopTimer();
  startTime = null;
  revealed = 0;
  won = false;
  input.value = "";
  input.readOnly = false;
  timerEl.textContent = "0:00";
  winEl.hidden = true;
  update();
  input.focus();
}

input.addEventListener("input", update);
againBtn.addEventListener("click", reset);
update();
input.focus();