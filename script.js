// ============================================================
//  EDIT THIS LIST as you finish each day.
//  1. Make the folder (e.g. day3/) with its own index.html inside.
//  2. Fill in the title and blurb.
//  3. Change live: false to live: true.
//  Locked panels never show their title, so it stays a surprise.
// ============================================================
const GAMES = [
  { day: 1,  title: "Stop at 10.00",              blurb: "Stop the clock at exactly ten seconds. No peeking.",   path: "day1/",  live: false },
  { day: 2,  title: "The Button You Can't Click", blurb: "It wants to be clicked. But it won't be that easy.",   path: "day2/",  live: false },
  { day: 3,  title: "Unbeatable Tic-Tac-Toe",     blurb: "", path: "day3/",  live: false },
  { day: 4,  title: "Emoji Hangman",              blurb: "", path: "day4/",  live: false },
  { day: 5,  title: "", blurb: "", path: "day5/",  live: false },
  { day: 6,  title: "", blurb: "", path: "day6/",  live: false },
  { day: 7,  title: "", blurb: "", path: "day7/",  live: false },
  { day: 8,  title: "", blurb: "", path: "day8/",  live: false },
  { day: 9,  title: "", blurb: "", path: "day9/",  live: false },
  { day: 10, title: "", blurb: "", path: "day10/", live: false },
];

const KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

// Small helper to make an element with a class and text
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const lockIcon =
  '<svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">' +
  '<rect x="1" y="7" width="12" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
  '<path d="M4 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

// ---- Work out which game is newest ----
// The newest game is the highest day number that is live.
// It gets the yellow highlighter treatment automatically.
const liveDays = GAMES.filter((g) => g.live).map((g) => g.day);
const newestDay = liveDays.length ? Math.max(...liveDays) : null;
const liveCount = liveDays.length;

// ---- Build the board ----
const board = document.getElementById("board");
let stampIndex = 0;

GAMES.forEach((game) => {
  const li = document.createElement("li");
  const num = String(game.day).padStart(2, "0");

  if (game.live) {
    const isNewest = game.day === newestDay;
    const a = el("a", isNewest ? "panel live newest" : "panel live");
    a.href = game.path;
    a.append(el("span", "panel-num", num));

    const seal = el("span", "seal", KANJI[game.day - 1]);
    seal.setAttribute("aria-hidden", "true");
    seal.style.animationDelay = (0.3 + stampIndex * 0.14) + "s"; // stamps land one after another
    a.append(seal);
    stampIndex++;

    if (isNewest) a.append(el("span", "tag", "Newest"));
    const title = el("h2", "panel-title");
    title.append(el("span", "", game.title));   // span lets the highlighter wrap across lines
    a.append(title);
    if (game.blurb) a.append(el("p", "panel-blurb", game.blurb));
    a.append(el("span", "panel-cta", "Play"));
    a.setAttribute("aria-label",
      `Day ${game.day}: ${game.title}.${isNewest ? " Newest game." : ""} Play`);
    li.append(a);
  } else {
    // Locked: the visible text ("01", "Opens on day 1") already tells screen readers what this is
    const div = el("div", "panel locked");
    div.append(el("span", "plate panel-num", num));
    const note = el("span", "plate note");
    note.innerHTML = lockIcon;
    note.append(`Opens on day ${game.day}`);
    div.append(note);
    li.append(div);
  }
  board.append(li);
});

// ---- Shoji progress bar ----
const shoji = document.getElementById("shoji");
GAMES.forEach((game) => {
  let cls = "pane";
  if (game.day === newestDay) cls = "pane newest";
  else if (game.live) cls = "pane filled";
  shoji.append(el("div", cls));
});
document.getElementById("progress-label").textContent =
  `${liveCount} of ${GAMES.length} games live`;
