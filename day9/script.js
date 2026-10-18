(() => {
  // ---- Tuning knobs: change these to rebalance the game ----
  const N = 20, CELL = 20;                 // 20 x 20 board
  const START_DELAY = 140, MIN_DELAY = 70, SPEEDUP = 3;   // ms per move
  const GHOST = { visible: 30, warn: 6, hidden: 18 };     // in moves
  const RUNAWAY_EVERY = 4;                 // food steps away every N moves
  const WALL_WARN = 12, WALL_CAP = 30;     // moves a new wall blinks, max wall cells

  const $ = (id) => document.getElementById(id);
  const canvas = $("c"), ctx = canvas.getContext("2d");
  const DIRS = { up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0} };
  const KEYS = { ArrowUp:"up", w:"up", W:"up", ArrowDown:"down", s:"down", S:"down",
                 ArrowLeft:"left", a:"left", A:"left", ArrowRight:"right", d:"right", D:"right" };

  let mode = null, snake, prev, dir, queue, food, walls, score, ticks, state, timer;
  let lastStep = 0, stepMs = START_DELAY;   // used to glide the snake between moves

  // ---- Best scores (one per mode) ----
  const getBest = (m) => { try { return +localStorage.getItem("day9-best-" + m) || 0; } catch (e) { return 0; } };
  const setBest = (m, v) => { try { localStorage.setItem("day9-best-" + m, v); } catch (e) {} };

  function showMenu() {
    clearTimeout(timer); state = "menu";
    document.querySelectorAll(".mode").forEach((b) => {
      const best = getBest(b.dataset.mode);
      b.querySelector(".mode-best").textContent = best ? "Best: " + best : "";
    });
    $("game").hidden = true; $("menu").hidden = false;
  }

  function start(m) {
    mode = m; clearTimeout(timer);
    snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    prev = snake.map((p) => ({ ...p }));
    dir = DIRS.right; queue = []; walls = []; score = 0; ticks = 0; state = "ready";
    food = null; food = freeCell();
    $("score").textContent = 0; $("best").textContent = getBest(mode);
    $("overlay").hidden = true; $("menu").hidden = true; $("game").hidden = false;
    draw();
  }

  // ---- Helpers ----
  const same = (a, b) => a.x === b.x && a.y === b.y;
  const taken = (c) => snake.some((s) => same(s, c)) || walls.some((w) => same(w, c)) || (food && same(food, c));
  const inside = (c) => c.x >= 0 && c.y >= 0 && c.x < N && c.y < N;
  function freeCell(minDist = 0) {
    for (let i = 0; i < 300; i++) {
      const c = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
      if (!taken(c) && Math.abs(c.x - snake[0].x) + Math.abs(c.y - snake[0].y) >= minDist) return c;
    }
    return null;
  }
  const delay = () => Math.max(MIN_DELAY, START_DELAY - score * SPEEDUP);

  // ---- Mode twists ----
  function moveFood() {
    const opts = Object.values(DIRS).map((d) => ({ x: food.x + d.x, y: food.y + d.y }))
      .filter((c) => inside(c) && !taken(c));
    if (opts.length) food = opts[Math.floor(Math.random() * opts.length)];
  }
  function addWall() {
    if (walls.length >= WALL_CAP) return;
    const a = freeCell(5);
    if (!a) return;
    walls.push({ x: a.x, y: a.y, t: WALL_WARN });
    const n = Object.values(DIRS).map((d) => ({ x: a.x + d.x, y: a.y + d.y }))
      .filter((c) => inside(c) && !taken(c));
    if (n.length) walls.push({ ...n[Math.floor(Math.random() * n.length)], t: WALL_WARN });
  }
  function ghostPhase() {
    const p = ticks % (GHOST.visible + GHOST.warn + GHOST.hidden);
    if (p < GHOST.visible) return "visible";
    return p < GHOST.visible + GHOST.warn ? "warn" : "hidden";
  }

  // ---- Game loop ----
  function step() {
    ticks++;
    if (queue.length) dir = queue.shift();
    const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const eating = food && same(h, food);
    const body = eating ? snake : snake.slice(0, -1);
    if (!inside(h) || body.some((s) => same(s, h)) || walls.some((w) => w.t <= 0 && same(w, h))) return end(false);

    prev = positions();
    snake.unshift(h);
    if (!eating) snake.pop();
    walls.forEach((w) => { if (w.t > 0) w.t--; });

    if (eating) {
      score++; $("score").textContent = score;
      food = null; food = freeCell();
      if (!food) return end(true);
      if (mode === "walls") addWall();
    } else if (mode === "runaway" && ticks % RUNAWAY_EVERY === 0) {
      moveFood();
    }
    lastStep = performance.now(); stepMs = delay();
    timer = setTimeout(step, stepMs);
  }

  function end(won) {
    state = "over"; draw();
    const best = getBest(mode), isBest = score > best;
    if (isBest) setBest(mode, score);
    $("best").textContent = Math.max(score, best);
    $("ov-title").textContent = won ? "You filled the board!" : "Game over";
    $("ov-msg").textContent = "Score " + score + (isBest && score > 0 ? ". New best!" : ". Best " + best);
    $("overlay").hidden = false;
  }

  // ---- Input ----
  function turn(name) {
    if (state !== "ready" && state !== "playing") return;
    const d = DIRS[name], last = queue.length ? queue[queue.length - 1] : dir;
    if ((d.x === -last.x && d.y === -last.y) || same(d, last)) return;
    if (state === "ready" && d.x === -dir.x && d.y === -dir.y) return;  // can't start by reversing into yourself
    if (queue.length < 2) queue.push(d);
    if (state === "ready") { state = "playing"; stepMs = delay(); step(); return; }   // first move is instant
    // Past a third of the current move? Take the turn now instead of waiting for the timer.
    if (queue.length === 1 && performance.now() - lastStep >= stepMs * 0.35) { clearTimeout(timer); step(); }
  }
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (KEYS[e.key] && !$("game").hidden) { e.preventDefault(); turn(KEYS[e.key]); }
  });
  document.querySelectorAll(".dpad button").forEach((b) =>
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); turn(b.dataset.d); }));

  // Swipe: finger or pen only, and only while pressed.
  // (Before, plain mouse movement over the board steered the snake and filled the move queue,
  // which is why arrow keys sometimes got ignored.)
  let swiping = false, sx = 0, sy = 0;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    swiping = true; sx = e.clientX; sy = e.clientY;
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!swiping) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    sx = e.clientX; sy = e.clientY;
  });
  ["pointerup", "pointercancel"].forEach((t) => canvas.addEventListener(t, () => { swiping = false; }));

  document.querySelectorAll(".mode").forEach((b) => b.addEventListener("click", () => start(b.dataset.mode)));
  $("again").addEventListener("click", () => start(mode));
  $("change").addEventListener("click", showMenu);

  // ---- Drawing ----
  // Match the canvas pixels to the screen pixels so lines and text stay sharp
  function fit() {
    const w = Math.round(canvas.getBoundingClientRect().width * (window.devicePixelRatio || 1));
    if (w > 0 && canvas.width !== w) canvas.width = canvas.height = w;
  }

  // Where each segment is drawn right now: gliding from its old cell to its new one
  function positions() {
    const a = state === "playing" ? Math.min(1, (performance.now() - lastStep) / stepMs) : 1;
    return snake.map((s, i) => {
      const p = prev[i] || prev[prev.length - 1] || s;
      return { x: p.x + (s.x - p.x) * a, y: p.y + (s.y - p.y) * a };
    });
  }

  function draw() {
    fit();
    const W = N * CELL, k = canvas.width / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);          // keep drawing in 400 x 400 units
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = "rgba(0,0,0,.13)";           // faint paper dots
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      ctx.beginPath(); ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 1, 0, 7); ctx.fill();
    }

    walls.forEach((w) => {
      const x = w.x * CELL, y = w.y * CELL;
      if (w.t > 0) {                             // warning: blinking dashed box
        if (ticks % 2) return;
        ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.strokeStyle = "#000";
        ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4); ctx.setLineDash([]);
      } else {
        ctx.fillStyle = "#ececea"; ctx.fillRect(x, y, CELL, CELL);
        ctx.lineWidth = 2; ctx.strokeStyle = "#000"; ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + CELL - 4, y + CELL - 4);
        ctx.moveTo(x + CELL - 4, y + 4); ctx.lineTo(x + 4, y + CELL - 4); ctx.stroke();
      }
    });

    if (food) {                                  // red seal-style food
      ctx.fillStyle = "#c8352b"; ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
      ctx.lineWidth = 2; ctx.strokeStyle = "#000"; ctx.strokeRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
    }

    const pos = positions();

    const phase = mode === "ghost" && state === "playing" ? ghostPhase() : "visible";
    const showBody = phase === "visible" || (phase === "warn" && ticks % 2 === 0);
    pos.forEach((p, i) => {
      const x = p.x * CELL, y = p.y * CELL;
      if (showBody) { ctx.fillStyle = "#000"; ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2); }
      else if (i === 0) {                        // ghost: only a dashed head outline
        ctx.setLineDash([3, 3]); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(0,0,0,.5)";
        ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4); ctx.setLineDash([]);
      }
    });
    if (showBody) {                              // eyes
      const cx = pos[0].x * CELL + CELL / 2, cy = pos[0].y * CELL + CELL / 2;
      ctx.fillStyle = "#fff";
      [-1, 1].forEach((k) => {
        ctx.beginPath(); ctx.arc(cx + dir.x * 4 - dir.y * 4 * k, cy + dir.y * 4 + dir.x * 4 * k, 2, 0, 7); ctx.fill();
      });
    }

    if (state === "ready") {
      ctx.fillStyle = "#fff"; ctx.fillRect(40, 150, 320, 100);
      ctx.lineWidth = 3; ctx.strokeStyle = "#000"; ctx.strokeRect(40, 150, 320, 100);
      ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.font = "800 22px Nunito, sans-serif";
      ctx.fillText("Press an arrow key", W / 2, 192); ctx.fillText("or swipe to start", W / 2, 224);
    }
  }

  // Redraw every screen frame so the motion is smooth, not just once per move
  (function frame() {
    if (!$("game").hidden) draw();
    requestAnimationFrame(frame);
  })();

  showMenu();
})();