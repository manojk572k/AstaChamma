// ------------------ PATHS ------------------
const PATH1 = ["e3","e4","e5","d5","c5","b5","a5","a4","a3","a2","a1","b1","c1","d1","e1","e2","d2","c2","b2","b3","b4","c4","d4","d3","c3"];
const PATH2 = ["c5","b5","a5","a4","a3","a2","a1","b1","c1","d1","e1","e2","e3","e4","e5","d5","d4","d3","d2","c2","b2","b3","b4","c4","c3"];
const PATH3 = ["a3","a2","a1","b1","c1","d1","e1","e2","e3","e4","e5","d5","c5","b5","a5","a4","b4","c4","d4","d3","d2","c2","b2","b3","c3"];
const PATH4 = ["c1","d1","e1","e2","e3","e4","e5","d5","c5","b5","a5","a4","a3","a2","a1","b1","b2","b3","b4","c4","d4","d3","d2","c2","c3"];

const PATHS = { p1: PATH1, p2: PATH2, p3: PATH3, p4: PATH4 };

// ------------------ SYMBOLS ------------------
const SYMBOL = { p1: "🐵", p2: "🐯", p3: "🦁", p4: "🐼" };

// ------------------ TURN ORDER ------------------
const TURN_ORDER = ["p1", "p2", "p3", "p4"];
let turnIndex = 0;
let currentPlayer = TURN_ORDER[turnIndex];

// ------------------ DICE / COWRIE VALUES (ONLY) ------------------
const COWRIE_VALUES = [1, 2, 3, 4, 8];

// ------------------ SAFE CELLS ------------------
// Add your safe squares here if you have them:
const SAFE_CELLS = new Set([
  "e3", "c5", "a3", "c1"
]);

// ------------------ STATE ------------------
// posIndex: -1 home, 0..len-1 on board, -2 finished
const posIndex = {
  p1: { 1: -1, 2: -1, 3: -1, 4: -1 },
  p2: { 1: -1, 2: -1, 3: -1, 4: -1 },
  p3: { 1: -1, 2: -1, 3: -1, 4: -1 },
  p4: { 1: -1, 2: -1, 3: -1, 4: -1 }
};

const cellOccupants = {};
const baseCellText = {};

let lastRoll = null;
let bonusStreak = 0;     // consecutive 4/8 for SAME player chain
let penaltyPending = false;

// Turn-flow clarity: do not auto-skip when no legal move.
// Instead enable End Turn button.
let endTurnRequired = false;

// ------------------ SOUND (Web Audio) ------------------
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(freq, durMs = 140, type = "sine", gainVal = 0.05) {
  ensureAudio();
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(gainVal, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

function playerTurnSound(p) {
  const map = { p1: 262, p2: 330, p3: 392, p4: 294 }; // pleasant notes
  playTone(map[p] || 330, 160, "sine", 0.06);
}

function rollSound() { playTone(520, 90, "triangle", 0.04); }
function moveSound() { playTone(420, 110, "sine", 0.05); }
function captureSound() { playTone(180, 160, "square", 0.03); }
function finishSound() { playTone(660, 170, "triangle", 0.05); }

// ------------------ INIT ------------------
window.addEventListener("DOMContentLoaded", () => {
  initBoardLabels();
  initPanels();
  renderAllCells();

  document.getElementById("rollBtn").addEventListener("click", rollCowries);
  document.getElementById("endTurnBtn").addEventListener("click", onEndTurn);

  updatePanels(null);
  highlightTurnPanel();
  setStatus(`Turn: ${currentPlayer.toUpperCase()} | Roll cowries`);
  playerTurnSound(currentPlayer);
});

function setStatus(msg) {
  document.getElementById("status").textContent = msg;
}

function initBoardLabels() {
  const all = [...PATH1, ...PATH2, ...PATH3, ...PATH4];
  const unique = [...new Set(all)];
  unique.forEach(id => {
    const el = document.getElementById(id);
    if (el && baseCellText[id] === undefined) baseCellText[id] = el.value || id;
  });
}

// ------------------ PANELS ------------------
function initPanels() {
  (["p1","p2","p3","p4"]).forEach(p => {
    document.getElementById(`sym-${p}`).textContent = SYMBOL[p];
    const row = document.getElementById(`tokens-${p}`);
    row.innerHTML = "";

    for (let t = 1; t <= 4; t++) {
      const btn = document.createElement("button");
      btn.className = "token-btn";
      btn.id = `btn-${p}-${t}`;
      btn.textContent = `T${t}`;
      btn.addEventListener("click", () => onTokenClick(p, t));
      row.appendChild(btn);
    }
  });
}

function highlightTurnPanel() {
  (["p1","p2","p3","p4"]).forEach(p => {
    const panel = document.getElementById(`panel-${p}`);
    if (!panel) return;
    panel.classList.toggle("turn-glow", p === currentPlayer);
  });
}

function updatePanels(legalMoves) {
  (["p1","p2","p3","p4"]).forEach(p => {
    // summary
    let homeCount = 0, finishedCount = 0;
    for (let t = 1; t <= 4; t++) {
      if (posIndex[p][t] === -1) homeCount++;
      if (posIndex[p][t] === -2) finishedCount++;
    }
    document.getElementById(`home-${p}`).textContent = `Home: ${homeCount} | Finished: ${finishedCount}`;

    for (let t = 1; t <= 4; t++) {
      const btn = document.getElementById(`btn-${p}-${t}`);
      btn.classList.toggle("finished", posIndex[p][t] === -2);

      // Default disable
      btn.disabled = true;
      btn.classList.remove("legal");

      // Only current player can click after roll, and only legal tokens
      if (p === currentPlayer && lastRoll != null && legalMoves && legalMoves.has(t)) {
        btn.disabled = false;
        btn.classList.add("legal");
      }
    }
  });

  // Roll button disabled when waiting player to click a token or when end-turn is required
  const rollBtn = document.getElementById("rollBtn");
  rollBtn.disabled = (lastRoll != null) || endTurnRequired;

  // End Turn enabled only when required
  const endBtn = document.getElementById("endTurnBtn");
  endBtn.disabled = !endTurnRequired;
}

// ------------------ BOARD RENDER ------------------
function renderCell(cellId) {
  const el = document.getElementById(cellId);
  if (!el) return;

  const occ = cellOccupants[cellId] || [];
  if (occ.length === 0) {
    el.value = baseCellText[cellId] ?? cellId;
    return;
  }
  el.value = occ.map(o => SYMBOL[o.player]).join("");
}

function renderAllCells() {
  const all = [...PATH1, ...PATH2, ...PATH3, ...PATH4];
  const unique = [...new Set(all)];
  unique.forEach(renderCell);
}

function addToCell(cellId, player, token) {
  if (!cellOccupants[cellId]) cellOccupants[cellId] = [];
  cellOccupants[cellId].push({ player, token });
  renderCell(cellId);
}

function removeFromCell(cellId, player, token) {
  const occ = cellOccupants[cellId] || [];
  cellOccupants[cellId] = occ.filter(o => !(o.player === player && o.token === token));
  renderCell(cellId);
}

function findOccupants(cellId) {
  return (cellOccupants[cellId] || []).slice();
}

// ------------------ RULE HELPERS ------------------
function isBonusRoll(v) {
  return v === 4 || v === 8;
}

function canLandOn(cellId, player) {
  const occ = findOccupants(cellId);
  if (occ.length === 0) return true;

  const isSafe = SAFE_CELLS.has(cellId);
  if (isSafe) return true; // allow stacking on safe squares

  // Not safe: disallow own stacking; allow opponent (capture)
  return occ.every(o => o.player !== player);
}

function sendHome(player, token) {
  const idx = posIndex[player][token];
  if (idx >= 0) {
    const cellId = PATHS[player][idx];
    removeFromCell(cellId, player, token);
  }
  posIndex[player][token] = -1;
}

function finishToken(player, token) {
  const idx = posIndex[player][token];
  if (idx >= 0) {
    const cellId = PATHS[player][idx];
    removeFromCell(cellId, player, token);
  }
  posIndex[player][token] = -2;
}

function applyLanding(player, token, cellId) {
  const occ = findOccupants(cellId);
  const isSafe = SAFE_CELLS.has(cellId);
  let didCapture = false;

  if (!isSafe) {
    occ.forEach(o => {
      if (o.player !== player) {
        sendHome(o.player, o.token);
        didCapture = true;
      }
    });
    cellOccupants[cellId] = [];
  }

  addToCell(cellId, player, token);
  return didCapture;
}

function computeLegalMoves(player, roll) {
  const legal = new Set();
  const path = PATHS[player];
  const lastIdx = path.length - 1;

  for (let t = 1; t <= 4; t++) {
    const idx = posIndex[player][t];
    if (idx === -2) continue; // finished

    if (idx === -1) {
      // start only with 4/8
      if (!isBonusRoll(roll)) continue;
      if (canLandOn(path[0], player)) legal.add(t);
      continue;
    }

    const targetIdx = idx + roll;

    // exact finish rule: cannot overshoot
    if (targetIdx > lastIdx) continue;

    if (targetIdx === lastIdx) {
      legal.add(t);
      continue;
    }

    const cellId = path[targetIdx];
    if (canLandOn(cellId, player)) legal.add(t);
  }

  return legal;
}

// ------------------ TURN FLOW ------------------
function nextTurn() {
  turnIndex = (turnIndex + 1) % TURN_ORDER.length;
  currentPlayer = TURN_ORDER[turnIndex];

  lastRoll = null;
  penaltyPending = false;
  endTurnRequired = false;

  // bonus streak resets when player changes
  bonusStreak = 0;

  highlightTurnPanel();
  updatePanels(null);
  setStatus(`Turn: ${currentPlayer.toUpperCase()} | Roll cowries`);
  playerTurnSound(currentPlayer);
}

function requireEndTurn(message) {
  // do not auto-skip; show End Turn button
  lastRoll = null;
  endTurnRequired = true;
  setStatus(message);
  updatePanels(null);
}

function onEndTurn() {
  if (!endTurnRequired) return;
  endTurnRequired = false;
  nextTurn();
}

// ------------------ ROLL ------------------
function rollCowries() {
  if (lastRoll != null || endTurnRequired) return;

  // required for audio on some browsers: this click unlocks audio
  ensureAudio();
  rollSound();

  lastRoll = COWRIE_VALUES[Math.floor(Math.random() * COWRIE_VALUES.length)];

  // bonus streak
  if (isBonusRoll(lastRoll)) bonusStreak++;
  else bonusStreak = 0;

  // penalty on 3rd consecutive 4/8
  if (bonusStreak >= 3) {
    penaltyPending = true;
    setStatus(`Turn: ${currentPlayer.toUpperCase()} | Roll: ${lastRoll} | PENALTY (3rd 4/8): click any token to cancel move, then End Turn.`);
    // allow any non-finished token to be clicked to consume penalty
    const any = new Set();
    for (let t = 1; t <= 4; t++) if (posIndex[currentPlayer][t] !== -2) any.add(t);
    updatePanels(any);
    endTurnRequired = false;
    return;
  }

  const legal = computeLegalMoves(currentPlayer, lastRoll);

  if (legal.size === 0) {
    // IMPORTANT FIX: do NOT auto-advance (this is what was confusing you)
    requireEndTurn(`Turn: ${currentPlayer.toUpperCase()} | Roll: ${lastRoll} | No valid move. Click End Turn.`);
    // reset streak because chain ended effectively
    bonusStreak = 0;
    return;
  }

  setStatus(`Turn: ${currentPlayer.toUpperCase()} | Roll: ${lastRoll} | Click a highlighted token`);
  updatePanels(legal);
}

// ------------------ TOKEN CLICK (MOVE EXECUTES IMMEDIATELY) ------------------
function onTokenClick(player, token) {
  if (player !== currentPlayer) return;
  if (lastRoll == null && !penaltyPending) return;

  // penalty consumption
  if (penaltyPending) {
    penaltyPending = false;
    bonusStreak = 0;
    requireEndTurn(`Turn: ${currentPlayer.toUpperCase()} | PENALTY applied: move cancelled. Click End Turn.`);
    return;
  }

  const roll = lastRoll;
  const legal = computeLegalMoves(currentPlayer, roll);
  if (!legal.has(token)) {
    setStatus(`Turn: ${currentPlayer.toUpperCase()} | T${token} cannot move with ${roll}. Choose highlighted token.`);
    return;
  }

  const path = PATHS[currentPlayer];
  const lastIdx = path.length - 1;

  let didCapture = false;

  const idx = posIndex[currentPlayer][token];

  // Start from home
  if (idx === -1) {
    const startCell = path[0];
    didCapture = applyLanding(currentPlayer, token, startCell);
    posIndex[currentPlayer][token] = 0;

    lastRoll = null;
    moveSound();
    if (didCapture) captureSound();

    // Extra chance: always yes because start requires 4/8; also yes on capture
    setStatus(`Turn: ${currentPlayer.toUpperCase()} | T${token} started at ${startCell}. Extra chance: Roll again.`);
    updatePanels(null);
    return;
  }

  // Move on board
  const fromCell = path[idx];
  const targetIdx = idx + roll;

  // remove from current
  removeFromCell(fromCell, currentPlayer, token);

  // Finish exact
  if (targetIdx === lastIdx) {
    posIndex[currentPlayer][token] = lastIdx;
    finishToken(currentPlayer, token);

    lastRoll = null;
    finishSound();

    // Extra chance only if roll was 4/8 (your rule)
    if (isBonusRoll(roll)) {
      setStatus(`Turn: ${currentPlayer.toUpperCase()} | T${token} finished at c3. Extra chance: Roll again.`);
      updatePanels(null);
    } else {
      requireEndTurn(`Turn: ${currentPlayer.toUpperCase()} | T${token} finished at c3. Click End Turn.`);
    }
    return;
  }

  // Normal landing
  const toCell = path[targetIdx];
  didCapture = applyLanding(currentPlayer, token, toCell);
  posIndex[currentPlayer][token] = targetIdx;

  lastRoll = null;
  moveSound();
  if (didCapture) captureSound();

  // Extra chance on 4/8 or capture
  if (isBonusRoll(roll) || didCapture) {
    const reason = didCapture ? "Captured. Extra chance: Roll again." : "Rolled 4/8. Extra chance: Roll again.";
    setStatus(`Turn: ${currentPlayer.toUpperCase()} | T${token} moved to ${toCell}. ${reason}`);
    updatePanels(null);
  } else {
    requireEndTurn(`Turn: ${currentPlayer.toUpperCase()} | T${token} moved to ${toCell}. Click End Turn.`);
  }
}
