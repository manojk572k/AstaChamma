// ------------------ PATHS ------------------
const PATH1 = ["e3","e4","e5","d5","c5","b5","a5","a4","a3","a2","a1","b1","c1","d1","e1","e2","d2","c2","b2","b3","b4","c4","d4","d3","c3"];
const PATH2 = ["c5","b5","a5","a4","a3","a2","a1","b1","c1","d1","e1","e2","e3","e4","e5","d5","d4","d3","d2","c2","b2","b3","b4","c4","c3"];
const PATH3 = ["a3","a2","a1","b1","c1","d1","e1","e2","e3","e4","e5","d5","c5","b5","a5","a4","b4","c4","d4","d3","d2","c2","b2","b3","c3"];
const PATH4 = ["c1","d1","e1","e2","e3","e4","e5","d5","c5","b5","a5","a4","a3","a2","a1","b1","b2","b3","b4","c4","d4","d3","d2","c2","c3"];

const PATHS = { p1: PATH1, p2: PATH2, p3: PATH3, p4: PATH4 };
const SYMBOL = { p1: "🐵", p2: "🐯", p3: "🦁", p4: "🐼" };
const COWRIE_VALUES = [1, 2, 3, 4, 8];
const SAFE_CELLS = new Set(["e3", "c5", "a3", "c1"]);

// ------------------ STATE ------------------
let activePlayers = [];
let turnIndex = 0;
let currentPlayer = null;

const posIndex = { p1: {1:-1,2:-1,3:-1,4:-1}, p2: {1:-1,2:-1,3:-1,4:-1}, p3: {1:-1,2:-1,3:-1,4:-1}, p4: {1:-1,2:-1,3:-1,4:-1} };
const cellOccupants = {};
const baseCellText = {};
let lastRoll = null;
let bonusStreak = 0;
let penaltyPending = false;
let endTurnRequired = false;

// ------------------ AUDIO ------------------
let audioCtx = null;
function ensureAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playTone(f, d=140, t="sine", g=0.05) {
  ensureAudio(); const now = audioCtx.currentTime;
  const o = audioCtx.createOscillator(), gN = audioCtx.createGain();
  o.type = t; o.frequency.value = f;
  gN.gain.setValueAtTime(0.0001, now); gN.gain.linearRampToValueAtTime(g, now+0.02); gN.gain.exponentialRampToValueAtTime(0.0001, now+d/1000);
  o.connect(gN); gN.connect(audioCtx.destination); o.start(now); o.stop(now+d/1000+0.02);
}
function playerTurnSound(p) { const m={p1:262,p2:330,p3:392,p4:294}; playTone(m[p]||330,160,"sine",0.06); }
function rollSound() { playTone(520,90,"triangle",0.04); }
function moveSound() { playTone(420,110,"sine",0.05); }
function captureSound() { playTone(180,160,"square",0.03); }
function finishSound() { playTone(660,170,"triangle",0.05); }

// ------------------ INIT ------------------
window.addEventListener("DOMContentLoaded", () => {
  initBoardLabels();
  initPanels();
  disableAllTokens();

  document.getElementById("rollBtn").addEventListener("click", rollCowries);
  document.getElementById("endTurnBtn").addEventListener("click", onEndTurn);
  document.getElementById("playBtn").addEventListener("click", configureGame);
  document.getElementById("aboutBtn").addEventListener("click", (e) => { e.preventDefault(); document.getElementById("aboutModal").classList.add("active"); });
  document.getElementById("closeAbout").addEventListener("click", () => document.getElementById("aboutModal").classList.remove("active"));

  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.body.className = `theme-${btn.dataset.theme}`;
    });
  });

  setStatus("🎮 Press PLAY to start");
});

function setStatus(msg) { 
  document.getElementById("status").textContent = msg; 
  const statusEl = document.getElementById("status");
  statusEl.classList.add("highlight");
  setTimeout(() => statusEl.classList.remove("highlight"), 300);
}

function initBoardLabels() {
  const all = [...PATH1, ...PATH2, ...PATH3, ...PATH4];
  [...new Set(all)].forEach(id => {
    const el = document.getElementById(id);
    if (el) baseCellText[id] = el.value || "";
  });
}

function initPanels() {
  ["p1","p2","p3","p4"].forEach(p => {
    document.getElementById(`sym-${p}`).textContent = SYMBOL[p];
    const row = document.getElementById(`tokens-${p}`);
    row.innerHTML = "";
    for (let t=1; t<=4; t++) {
      const btn = document.createElement("button");
      btn.className = "token-btn";
      btn.id = `btn-${p}-${t}`;
      btn.textContent = `T${t}`;
      btn.addEventListener("click", () => onTokenClick(p, t));
      row.appendChild(btn);
    }
  });
}

function disableAllTokens() {
  ["p1","p2","p3","p4"].forEach(p => {
    for (let t=1; t<=4; t++) {
      const btn = document.getElementById(`btn-${p}-${t}`);
      if (btn) btn.disabled = true;
    }
  });
}

function configureGame() {
  let numPlayers = prompt("How many players? (1-4)", "2");
  if (!numPlayers) return;
  numPlayers = parseInt(numPlayers);
  if (isNaN(numPlayers) || numPlayers < 1 || numPlayers > 4) {
    alert("Please enter a number between 1 and 4.");
    return;
  }

  let selected = [];
  for (let i=0; i<numPlayers; i++) {
    let p = prompt(`Player ${i+1} – enter player number (1-4)`, (i+1).toString());
    if (!p) return;
    let num = parseInt(p);
    if (isNaN(num) || num < 1 || num > 4) { alert("Invalid player number."); return; }
    let pid = "p" + num;
    if (selected.includes(pid)) { alert("Duplicate player not allowed."); return; }
    selected.push(pid);
  }

  let startNum = prompt("Who starts? (enter player number, e.g., 1 for Player 1)", selected[0].substring(1));
  if (!startNum) return;
  let startP = "p" + parseInt(startNum);
  if (!selected.includes(startP)) { alert("Start player must be among the selected players."); return; }

  let idx = selected.indexOf(startP);
  activePlayers = [...selected.slice(idx), ...selected.slice(0, idx)];
  turnIndex = 0;
  currentPlayer = activePlayers[0];

  resetGameState();
  setStatus(`Turn: ${currentPlayer.toUpperCase()} | Roll cowries`);
  playerTurnSound(currentPlayer);
  highlightTurnPanel();
  updatePanels(null);
}

function resetGameState() {
  ["p1","p2","p3","p4"].forEach(p => {
    for (let t=1; t<=4; t++) posIndex[p][t] = -1;
  });
  for (let k in cellOccupants) delete cellOccupants[k];
  renderAllCells();
  lastRoll = null; bonusStreak = 0; penaltyPending = false; endTurnRequired = false;
  disableAllTokens();
  document.getElementById("rollBtn").disabled = false;
  document.getElementById("endTurnBtn").disabled = true;
  document.getElementById("endTurnBtn").classList.remove("highlight");
}

function highlightTurnPanel() {
  ["p1","p2","p3","p4"].forEach(p => {
    document.getElementById(`panel-${p}`)?.classList.toggle("turn-glow", p === currentPlayer);
  });
}

function updatePanels(legalMoves) {
  ["p1","p2","p3","p4"].forEach(p => {
    let home = 0, fin = 0;
    for (let t=1; t<=4; t++) {
      if (posIndex[p][t] === -1) home++;
      if (posIndex[p][t] === -2) fin++;
    }
    document.getElementById(`home-${p}`).textContent = `🏠 ${home}  🏁 ${fin}`;
    for (let t=1; t<=4; t++) {
      const btn = document.getElementById(`btn-${p}-${t}`);
      if (!btn) continue;
      btn.classList.toggle("finished", posIndex[p][t] === -2);
      if (p !== currentPlayer || lastRoll == null || !legalMoves || !legalMoves.has(t)) {
        btn.disabled = true;
        btn.classList.remove("legal");
      } else {
        btn.disabled = false;
        btn.classList.add("legal");
      }
    }
  });
  const rollBtn = document.getElementById("rollBtn");
  rollBtn.disabled = (lastRoll != null) || endTurnRequired || !activePlayers.length;
  if (!rollBtn.disabled) rollBtn.classList.add("highlight");
  else rollBtn.classList.remove("highlight");
  
  const endBtn = document.getElementById("endTurnBtn");
  endBtn.disabled = !endTurnRequired;
  if (!endBtn.disabled) endBtn.classList.add("highlight");
  else endBtn.classList.remove("highlight");
}

function renderCell(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const occ = cellOccupants[id] || [];
  if (occ.length === 0) el.value = baseCellText[id] ?? "";
  else el.value = occ.map(o => SYMBOL[o.player]).join("");
}
function renderAllCells() { [...new Set([...PATH1,...PATH2,...PATH3,...PATH4])].forEach(renderCell); }
function addToCell(cellId, player, token) {
  if (!cellOccupants[cellId]) cellOccupants[cellId] = [];
  cellOccupants[cellId].push({player,token});
  renderCell(cellId);
}
function removeFromCell(cellId, player, token) {
  cellOccupants[cellId] = (cellOccupants[cellId] || []).filter(o => !(o.player===player && o.token===token));
  renderCell(cellId);
}
function findOccupants(cellId) { return (cellOccupants[cellId] || []).slice(); }

function isBonusRoll(v) { return v===4 || v===8; }
function canLandOn(cellId, player) {
  const occ = findOccupants(cellId);
  if (occ.length===0) return true;
  return SAFE_CELLS.has(cellId) ? true : occ.every(o=>o.player!==player);
}
function sendHome(player, token) {
  const idx = posIndex[player][token];
  if (idx>=0) removeFromCell(PATHS[player][idx], player, token);
  posIndex[player][token] = -1;
}
function finishToken(player, token) {
  const idx = posIndex[player][token];
  if (idx>=0) removeFromCell(PATHS[player][idx], player, token);
  posIndex[player][token] = -2;
}
function applyLanding(player, token, cellId) {
  const occ = findOccupants(cellId);
  let didCapture = false;
  if (!SAFE_CELLS.has(cellId)) {
    occ.forEach(o => { if (o.player !== player) { sendHome(o.player, o.token); didCapture = true; } });
    cellOccupants[cellId] = [];
  }
  addToCell(cellId, player, token);
  return didCapture;
}
function computeLegalMoves(player, roll) {
  const legal = new Set(), path = PATHS[player], lastIdx = path.length-1;
  for (let t=1; t<=4; t++) {
    const idx = posIndex[player][t];
    if (idx === -2) continue;
    if (idx === -1) {
      if (isBonusRoll(roll) && canLandOn(path[0], player)) legal.add(t);
      continue;
    }
    const target = idx + roll;
    if (target > lastIdx) continue;
    if (target === lastIdx) { legal.add(t); continue; }
    if (canLandOn(path[target], player)) legal.add(t);
  }
  return legal;
}

function nextTurn() {
  if (!activePlayers.length) return;
  turnIndex = (turnIndex + 1) % activePlayers.length;
  currentPlayer = activePlayers[turnIndex];
  lastRoll = null; penaltyPending = false; endTurnRequired = false; bonusStreak = 0;
  highlightTurnPanel();
  updatePanels(null);
  setStatus(`Turn: ${currentPlayer.toUpperCase()} | Roll cowries`);
  playerTurnSound(currentPlayer);
}
function requireEndTurn(msg) { lastRoll = null; endTurnRequired = true; setStatus(msg); updatePanels(null); }
function onEndTurn() { if (endTurnRequired) { endTurnRequired = false; nextTurn(); } }

function rollCowries() {
  if (!activePlayers.length) { setStatus("No active players. Press PLAY."); return; }
  if (lastRoll != null || endTurnRequired) return;
  ensureAudio(); rollSound();
  lastRoll = COWRIE_VALUES[Math.floor(Math.random()*COWRIE_VALUES.length)];
  if (isBonusRoll(lastRoll)) bonusStreak++; else bonusStreak = 0;

  if (bonusStreak >= 3) {
    penaltyPending = true;
    setStatus(`Turn: ${currentPlayer.toUpperCase()} | Roll: ${lastRoll} | PENALTY: click any token to cancel.`);
    const any = new Set();
    for (let t=1; t<=4; t++) if (posIndex[currentPlayer][t] !== -2) any.add(t);
    updatePanels(any);
    endTurnRequired = false;
    return;
  }

  const legal = computeLegalMoves(currentPlayer, lastRoll);
  if (legal.size === 0) {
    requireEndTurn(`Turn: ${currentPlayer.toUpperCase()} | Roll: ${lastRoll} | No move. Click End Turn.`);
    bonusStreak = 0;
    return;
  }
  setStatus(`Turn: ${currentPlayer.toUpperCase()} | Roll: ${lastRoll} | Click highlighted token`);
  updatePanels(legal);
}

function onTokenClick(player, token) {
  if (player !== currentPlayer) return;
  if (lastRoll == null && !penaltyPending) return;
  if (penaltyPending) {
    penaltyPending = false; bonusStreak = 0;
    requireEndTurn(`Turn: ${currentPlayer.toUpperCase()} | PENALTY applied. Click End Turn.`);
    return;
  }
  const roll = lastRoll;
  const legal = computeLegalMoves(currentPlayer, roll);
  if (!legal.has(token)) {
    setStatus(`Turn: ${currentPlayer.toUpperCase()} | T${token} cannot move with ${roll}. Choose highlighted.`);
    return;
  }
  const path = PATHS[currentPlayer];
  const lastIdx = path.length - 1;
  let didCapture = false;
  const idx = posIndex[currentPlayer][token];

  if (idx === -1) {
    const start = path[0];
    didCapture = applyLanding(currentPlayer, token, start);
    posIndex[currentPlayer][token] = 0;
    lastRoll = null;
    moveSound(); if (didCapture) captureSound();
    setStatus(`Turn: ${currentPlayer.toUpperCase()} | T${token} started. Extra chance: Roll again.`);
    updatePanels(null);
    return;
  }

  const from = path[idx];
  const targetIdx = idx + roll;
  removeFromCell(from, currentPlayer, token);

  if (targetIdx === lastIdx) {
    posIndex[currentPlayer][token] = lastIdx;
    finishToken(currentPlayer, token);
    lastRoll = null;
    finishSound();
    if (isBonusRoll(roll)) {
      setStatus(`Turn: ${currentPlayer.toUpperCase()} | T${token} finished. Extra chance: Roll again.`);
      updatePanels(null);
    } else {
      requireEndTurn(`Turn: ${currentPlayer.toUpperCase()} | T${token} finished. Click End Turn.`);
    }
    return;
  }

  const to = path[targetIdx];
  didCapture = applyLanding(currentPlayer, token, to);
  posIndex[currentPlayer][token] = targetIdx;
  lastRoll = null;
  moveSound(); if (didCapture) captureSound();

  if (isBonusRoll(roll) || didCapture) {
    const reason = didCapture ? "Captured. Extra chance: Roll again." : "Rolled 4/8. Extra chance: Roll again.";
    setStatus(`Turn: ${currentPlayer.toUpperCase()} | T${token} moved to ${to}. ${reason}`);
    updatePanels(null);
  } else {
    requireEndTurn(`Turn: ${currentPlayer.toUpperCase()} | T${token} moved to ${to}. Click End Turn.`);
  }
}