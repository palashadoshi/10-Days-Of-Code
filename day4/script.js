(function () {
  'use strict';

  // ---------- Tuning ----------
  const ROUNDS     = 5;    // movies per game
  const SECONDS    = 30;   // time per movie
  const MAX_MISSES = 6;    // wrong letters allowed
  const LOW_TIME   = 10;   // seconds left when the timer turns yellow
  const BEST_KEY   = 'day4-best';

  // ---------- Movies (emoji are separate items so none get split) ----------
  const MOVIES = [
    { title: "The Lion King", emoji: ["🦁", "👑"] },
    { title: "Frozen", emoji: ["❄️", "👸", "⛄"] },
    { title: "Jaws", emoji: ["🦈", "🌊", "😱"] },
    { title: "Finding Nemo", emoji: ["🐠", "🔍", "🌊"] },
    { title: "Titanic", emoji: ["🚢", "🧊", "💔"] },
    { title: "Jurassic Park", emoji: ["🦖", "🌴", "🚙"] },
    { title: "Ghostbusters", emoji: ["👻", "🚫", "🚐"] },
    { title: "Ratatouille", emoji: ["🐀", "🍲", "🥖"] },
    { title: "Toy Story", emoji: ["🧸", "🤠", "🚀"] },
    { title: "Kung Fu Panda", emoji: ["🐼", "🥋", "🍜"] },
    { title: "Aladdin", emoji: ["🧞", "🏜️", "🐒"] },
    { title: "Harry Potter", emoji: ["⚡", "👓", "🧙"] },
    { title: "Batman", emoji: ["🦇", "🌃", "🦸"] },
    { title: "King Kong", emoji: ["🦍", "🏙️", "🏢"] },
    { title: "Up", emoji: ["🏠", "🎈", "👴"] },
    { title: "Shrek", emoji: ["👹", "🧅", "🐴"] },
    { title: "Moana", emoji: ["🌺", "🌊", "🛶"] },
    { title: "Inside Out", emoji: ["🧠", "😀", "😢"] },
    { title: "Star Wars", emoji: ["⭐", "⚔️", "🌌"] },
    { title: "Dumbo", emoji: ["🐘", "🎪", "👂"] },
    { title: "Cars", emoji: ["🚗", "⚡", "🏁"] },
    { title: "Spider-Man", emoji: ["🕷️", "🕸️", "🏙️"] },
    { title: "WALL-E", emoji: ["🤖", "🗑️", "🌱"] },
    { title: "The Little Mermaid", emoji: ["🧜", "🐚", "🦀"] },
    { title: "Coco", emoji: ["💀", "🎸", "🌼"] },
    { title: "Encanto", emoji: ["🏠", "🦋", "🕯️"] },
    { title: "Zootopia", emoji: ["🐰", "🦊", "🏙️"] },
    { title: "Mulan", emoji: ["🐉", "⚔️", "🏯"] },
    { title: "Pinocchio", emoji: ["🤥", "🧚", "🐳"] },
    { title: "Cinderella", emoji: ["👠", "🎃", "🕛"] },
    { title: "Snow White", emoji: ["🍎", "⛏️", "👸"] },
    { title: "Beauty and the Beast", emoji: ["🌹", "🕰️", "👹"] },
    { title: "Despicable Me", emoji: ["🍌", "👓", "🌙"] },
    { title: "Monsters Inc", emoji: ["👾", "🚪", "😱"] },
    { title: "The Incredibles", emoji: ["👶", "🔥", "🦸"] },
    { title: "Madagascar", emoji: ["🦓", "🦒", "🏝️"] },
    { title: "Ice Age", emoji: ["🧊", "🐿️", "🌰"] },
    { title: "Bambi", emoji: ["🦌", "🌲", "🐰"] },
    { title: "Jumanji", emoji: ["🎲", "🦏", "🌴"] },
    { title: "Avengers", emoji: ["🛡️", "🔨", "💥"] },
    { title: "Black Panther", emoji: ["⬛", "🐆", "👑"] },
    { title: "Iron Man", emoji: ["🤖", "🔴", "✈️"] },
    { title: "Home Alone", emoji: ["🏠", "🎄", "😱"] },
    { title: "Minecraft", emoji: ["⛏️", "🧟", "🌳"] },
    { title: "Sonic", emoji: ["🦔", "💨", "💍"] },
    { title: "Super Mario", emoji: ["🍄", "🐢", "👑"] },
    { title: "Paddington", emoji: ["🐻", "🥪", "🎩"] },
    { title: "Pokemon", emoji: ["🔴", "⚪", "⚡"] },
  ];

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const screens = { start: $('screenStart'), game: $('screenGame'), end: $('screenEnd') };
  const roundLabel = $('roundLabel'), timeLabel = $('timeLabel');
  const winsLabel = $('winsLabel'), lossesLabel = $('lossesLabel');
  const timeFill = $('timeFill'), emojisEl = $('emojis'), wordEl = $('word');
  const keyboardEl = $('keyboard'), resultEl = $('result'), resultSeal = $('resultSeal');
  const resultMsg = $('resultMsg'), nextBtn = $('nextBtn'), missLabel = $('missLabel');
  const popcornEl = $('popcorn');
  const kernels = [];
  for (let i = 0; i < MAX_MISSES; i++) {
    const k = document.createElement('span');
    k.className = 'kernel';
    k.textContent = '🍿';
    kernels.push(k);
    popcornEl.append(k);
  }

  $('ruleMisses').textContent = MAX_MISSES;
  $('ruleSeconds').textContent = SECONDS;
  $('ruleRounds').textContent = ROUNDS;

  // ---------- State ----------
  const state = {
    order: [], round: 0, wins: 0, losses: 0,
    movie: null, needed: new Set(), guessed: new Set(),
    misses: 0, active: false, deadline: 0, timerId: null
  };

  function showScreen(name) {
    for (const k in screens) screens[k].hidden = (k !== name);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- Best score (localStorage can fail, so always guard it) ----------
  function loadBest() {
    try {
      const v = parseInt(localStorage.getItem(BEST_KEY), 10);
      return Number.isFinite(v) ? v : null;
    } catch (e) { return null; }
  }
  function saveBest(v) {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* ignore */ }
  }

  // ---------- On-screen keyboard ----------
  const keys = {};
  ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].forEach((letters) => {
    const row = document.createElement('div');
    row.className = 'krow';
    for (const ch of letters) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'key';
      b.textContent = ch;
      b.setAttribute('aria-label', 'Letter ' + ch);
      b.addEventListener('click', () => guess(ch));
      keys[ch] = b;
      row.append(b);
    }
    keyboardEl.append(row);
  });

  function resetKeys() {
    Object.values(keys).forEach((b) => { b.disabled = false; b.className = 'key'; });
  }

  // ---------- Rendering ----------
  function renderEmojis() {
    emojisEl.textContent = '';
    state.movie.emoji.forEach((e) => {
      const s = document.createElement('span');
      s.textContent = e;
      emojisEl.append(s);
    });
  }

  function renderWord(revealAll) {
    wordEl.textContent = '';
    const spoken = [];
    state.movie.title.split(' ').forEach((word) => {
      const w = document.createElement('span');
      w.className = 'w';
      const letters = [];
      for (const ch of word) {
        const up = ch.toUpperCase();
        const c = document.createElement('span');
        if (/^[A-Z]$/.test(up)) {
          const known = state.guessed.has(up);
          c.className = 'cell letter' + (!known && revealAll ? ' reveal' : '');
          c.textContent = (known || revealAll) ? up : '';
          letters.push((known || revealAll) ? up : 'blank');
        } else {
          c.className = 'cell punct';
          c.textContent = ch;
          letters.push(ch);
        }
        w.append(c);
      }
      wordEl.append(w);
      spoken.push(letters.join(' '));
    });
    wordEl.setAttribute('aria-label', 'Movie title: ' + spoken.join(', '));
  }

  function renderPopcorn(misses) {
    const left = Math.max(0, MAX_MISSES - misses);
    kernels.forEach((k, i) => k.classList.toggle('gone', i >= left));
    popcornEl.setAttribute('aria-label', left + ' of ' + MAX_MISSES + ' popcorn left');
    missLabel.textContent = 'Popcorn ' + left + '/' + MAX_MISSES;
  }

  function renderTime(remainingMs) {
    const secs = Math.max(0, Math.ceil(remainingMs / 1000));
    const pct = Math.max(0, Math.min(100, (remainingMs / (SECONDS * 1000)) * 100));
    timeLabel.textContent = secs + 's';
    timeLabel.classList.toggle('low', secs <= LOW_TIME);
    timeFill.style.width = pct + '%';
  }

  function renderScore() {
    winsLabel.textContent = 'Wins ' + state.wins;
    lossesLabel.textContent = 'Losses ' + state.losses;
  }

  // ---------- Game flow ----------
  function startGame() {
    state.order = shuffle(MOVIES).slice(0, ROUNDS);
    state.round = 0;
    state.wins = 0;
    state.losses = 0;
    showScreen('game');
    startRound();
  }

  function startRound() {
    state.movie = state.order[state.round];
    state.needed = new Set(
      state.movie.title.toUpperCase().split('').filter((ch) => /^[A-Z]$/.test(ch))
    );
    state.guessed = new Set();
    state.misses = 0;
    state.active = true;

    roundLabel.textContent = 'Movie ' + (state.round + 1) + ' of ' + state.order.length;
    renderScore();
    renderEmojis();
    wordEl.classList.remove('won');
    renderWord(false);
    renderPopcorn(0);
    resetKeys();
    keyboardEl.hidden = false;
    resultEl.hidden = true;

    clearInterval(state.timerId);
    state.deadline = Date.now() + SECONDS * 1000;
    renderTime(SECONDS * 1000);
    state.timerId = setInterval(tick, 100);
  }

  function tick() {
    if (!state.active) return;
    const remaining = state.deadline - Date.now();
    if (remaining <= 0) {
      renderTime(0);
      endRound(false, 'time');
    } else {
      renderTime(remaining);
    }
  }

  function guess(letter) {
    if (!state.active) return;
    if (state.guessed.has(letter)) return;
    state.guessed.add(letter);

    const btn = keys[letter];
    btn.disabled = true;

    if (state.needed.has(letter)) {
      btn.classList.add('hit');
      renderWord(false);
      let allFound = true;
      state.needed.forEach((l) => { if (!state.guessed.has(l)) allFound = false; });
      if (allFound) endRound(true, 'solved');
    } else {
      btn.classList.add('miss');
      state.misses++;
      renderPopcorn(state.misses);
      if (state.misses >= MAX_MISSES) endRound(false, 'misses');
    }
  }

  function endRound(won, reason) {
    if (!state.active) return;
    state.active = false;
    clearInterval(state.timerId);
    state.timerId = null;

    Object.values(keys).forEach((b) => { b.disabled = true; });

    if (won) {
      state.wins++;
    } else {
      state.losses++;
      renderPopcorn(MAX_MISSES);
    }
    renderScore();
    renderWord(!won);
    wordEl.classList.toggle('won', won);

    const lead = won ? 'Correct! It was '
      : (reason === 'time' ? "Time's up! It was " : 'The popcorn ran out! It was ');
    resultMsg.textContent = lead;
    const strong = document.createElement('strong');
    strong.textContent = state.movie.title;
    resultMsg.append(strong, '.');

    resultSeal.textContent = won ? '勝' : '負';
    nextBtn.textContent = (state.round >= state.order.length - 1) ? 'See results' : 'Next movie';
    keyboardEl.hidden = true;
    resultEl.hidden = false;
    nextBtn.focus({ preventScroll: true });
  }

  function nextRound() {
    if (state.active) return;
    state.round++;
    if (state.round >= state.order.length) showEnd();
    else startRound();
  }

  function showEnd() {
    const total = state.order.length;
    const previous = loadBest();
    const isNewBest = state.wins > 0 && (previous === null || state.wins > previous);
    if (isNewBest) saveBest(state.wins);
    const best = isNewBest ? state.wins : previous;

    const scoreEl = $('endScore');
    scoreEl.textContent = 'You solved ';
    const num = document.createElement('span');
    num.textContent = state.wins + ' of ' + total;
    scoreEl.append(num, '.');

    const ratio = state.wins / total;
    let line;
    if (ratio === 1) line = 'A perfect run. Film critic energy.';
    else if (ratio >= 0.75) line = 'Serious movie buff.';
    else if (ratio >= 0.375) line = 'Not bad. You earned some popcorn.';
    else line = 'Time to watch more movies.';
    $('endLine').textContent = line;

    $('endBest').textContent = isNewBest
      ? 'New best on this device!'
      : (best !== null ? 'Best on this device: ' + best + ' of ' + total + '.' : '');

    showScreen('end');
  }

  // ---------- Events ----------
  $('startBtn').addEventListener('click', startGame);
  $('againBtn').addEventListener('click', startGame);
  nextBtn.addEventListener('click', nextRound);

  // Physical keyboard: letters only. Enter/Space are left to the focused button.
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!e.key || e.key.length !== 1) return;
    const L = e.key.toUpperCase();
    if (/^[A-Z]$/.test(L)) guess(L);
  });
})();