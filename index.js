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

const posIndex = {
  p1: {1:-1,2:-1,3:-1,4:-1},
  p2: {1:-1,2:-1,3:-1,4:-1},
  p3: {1:-1,2:-1,3:-1,4:-1},
  p4: {1:-1,2:-1,3:-1,4:-1}
};

const cellOccupants = {};
const baseCellText = {};
let lastRoll = null;
let bonusStreak = 0;
let penaltyPending = false;
let endTurnRequired = false;

// ------------------ MODAL SETUP STATE ------------------
const setupState = {
  selectedPlayers: ["p1", "p2"]
};

// ------------------ AUDIO ------------------
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playTone(f, d = 140, t = "sine", g = 0.05) {
  ensureAudio();
  const now = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const gN = audioCtx.createGain();

  o.type = t;
  o.frequency.value = f;

  gN.gain.setValueAtTime(0.0001, now);
  gN.gain.linearRampToValueAtTime(g, now + 0.02);
  gN.gain.exponentialRampToValueAtTime(0.0001, now + d / 1000);

  o.connect(gN);
  gN.connect(audioCtx.destination);
  o.start(now);
  o.stop(now + d / 1000 + 0.02);
}

function playerTurnSound(p) {
  const m = { p1: 262, p2: 330, p3: 392, p4: 294 };
  playTone(m[p] || 330, 160, "sine", 0.06);
}

function rollSound() { playTone(520, 90, "triangle", 0.04); }
function moveSound() { playTone(420, 110, "sine", 0.05); }
function captureSound() { playTone(180, 160, "square", 0.03); }
function finishSound() { playTone(660, 170, "triangle", 0.05); }

// ------------------ INIT ------------------
window.addEventListener("DOMContentLoaded", () => {
  initBoardLabels();
  initPanels();
  disableAllTokens();
  bindUI();
  initSetupModal();
  setStatus("🎮 Press New Game to start");
  updateLastRollPill();
});

function bindUI() {
  document.getElementById("rollBtn").addEventListener("click", rollCowries);
  document.getElementById("endTurnBtn").addEventListener("click", onEndTurn);

  document.getElementById("playBtn").addEventListener("click", openSetupModal);

  document.getElementById("aboutBtn").addEventListener("click", () => {
    document.getElementById("aboutModal").classList.add("active");
  });

  document.getElementById("closeAbout").addEventListener("click", () => {
    document.getElementById("aboutModal").classList.remove("active");
  });

  document.getElementById("cancelSetupBtn").addEventListener("click", () => {
    document.getElementById("setupModal").classList.remove("active");
  });

  document.getElementById("startGameBtn").addEventListener("click", startConfiguredGame);

  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.body.className = `theme-${btn.dataset.theme}`;

      document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  const countSelect = document.getElementById("playerCountSelect");
  countSelect.addEventListener("change", onPlayerCountChange);
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
    const symEl = document.getElementById(`sym-${p}`);
    if (symEl) symEl.textContent = SYMBOL[p];

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

function disableAllTokens() {
  ["p1","p2","p3","p4"].forEach(p => {
    for (let t = 1; t <= 4; t++) {
      const btn = document.getElementById(`btn-${p}-${t}`);
      if (btn) btn.disabled = true;
    }
  });
}

// ------------------ MODAL FUNCTIONS ------------------
function initSetupModal() {
  renderPlayerPicker();
  syncStartPlayerOptions();
}

function openSetupModal() {
  document.getElementById("setupModal").classList.add("active");
  renderPlayerPicker();
  syncStartPlayerOptions();
}

function onPlayerCountChange() {
  const count = Number(document.getElementById("playerCountSelect").value);

  if (setupState.selectedPlayers.length > count) {
    setupState.selectedPlayers = setupState.selectedPlayers.slice(0, count);
  }

  while (setupState.selectedPlayers.length < count) {
    const next = ["p1","p2","p3","p4"].find(p => !setupState.selectedPlayers.includes(p));
    if (next) setupState.selectedPlayers.push(next);
  }

  renderPlayerPicker();
  syncStartPlayerOptions();
}

function renderPlayerPicker() {
  const picker = document.getElementById("playerPicker");
  const count = Number(document.getElementById("playerCountSelect").value);

  picker.innerHTML = "";

  ["p1","p2","p3","p4"].forEach((p, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "player-toggle";
    if (setupState.selectedPlayers.includes(p)) btn.classList.add("selected");

    btn.innerHTML = `
      <span class="emoji">${SYMBOL[p]}</span>
      <span>Player ${index + 1}</span>
    `;

    btn.addEventListener("click", () => {
      const isSelected = setupState.selectedPlayers.includes(p);

      if (isSelected) {
        if (setupState.selectedPlayers.length === 1) return;
        setupState.selectedPlayers = setupState.selectedPlayers.filter(x => x !== p);
      } else {
        if (setupState.selectedPlayers.length >= count) return;
        setupState.selectedPlayers.push(p);
      }

      setupState.selectedPlayers.sort((a, b) => Number(a[1]) - Number(b[1]));
      renderPlayerPicker();
      syncStartPlayerOptions();
    });

    picker.appendChild(btn);
  });

  while (setupState.selectedPlayers.length > count) {
    setupState.selectedPlayers.pop();
  }
}

function syncStartPlayerOptions() {
  const startSelect = document.getElementById("startPlayerSelect");
  const count = Number(document.getElementById("playerCountSelect").value);

  setupState.selectedPlayers = setupState.selectedPlayers
    .slice(0, count)
    .sort((a, b) => Number(a[1]) - Number(b[1]));

  startSelect.innerHTML = "";

  setupState.selectedPlayers.forEach(pid => {
    const option = document.createElement("option");
    option.value = pid;
    option.textContent = `Player ${pid[1]}`;
    startSelect.appendChild(option);
  });

  if (setupState.selectedPlayers.length > 0) {
    startSelect.value = setupState.selectedPlayers[0];
  }
}

function startConfiguredGame() {
  const count = Number(document.getElementById("playerCountSelect").value);
  const selected = setupState.selectedPlayers.slice(0, count);
  const startP = document.getElementById("startPlayerSelect").value;

  if (selected.length !== count) {
    alert(`Please select exactly ${count} player(s).`);
    return;
  }

  if (!selected.includes(startP)) {
    alert("Please choose a valid starting player.");
    return;
  }

  const idx = selected.indexOf(startP);
  activePlayers = [...selected.slice(idx), ...selected.slice(0, idx)];
  turnIndex = 0;
  currentPlayer = activePlayers[0];

  resetGameState();
  setStatus(`Turn: ${currentPlayer.toUpperCase()} | Roll cowries`);
  playerTurnSound(currentPlayer);
  highlightTurnPanel();
  updatePanels(null);

  document.getElementById("setupModal").classList.remove("active");
}

// ------------------ UI HELPERS ------------------
function setStatus(msg) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = msg;
  statusEl.classList.add("highlight");

  setTimeout(() => statusEl.classList.remove("highlight"), 300);
}

function updateLastRollPill() {
  const pill = document.getElementById("lastRollPill");
  if (!pill) return;
  pill.textContent = `Last roll: ${lastRoll == null ? "—" : lastRoll}`;
}

function highlightTurnPanel() {
  ["p1","p2","p3","p4"].forEach(p => {
    document.getElementById(`panel-${p}`)?.classList.toggle("turn-glow", p === currentPlayer);
  });
}

function updatePanels(legalMoves) {
  ["p1","p2","p3","p4"].forEach(p => {
    let home = 0;
    let fin = 0;

    for (let t = 1; t <= 4; t++) {
      if (posIndex[p][t] === -1) home++;
      if (posIndex[p][t] === -2) fin++;
    }

    document.getElementById(`home-${p}`).textContent = `🏠 ${home}  🏁 ${fin}`;

    for (let t = 1; t <= 4; t++) {
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
  rollBtn.classList.toggle("highlight", !rollBtn.disabled);

  const endBtn = document.getElementById("endTurnBtn");
  endBtn.disabled = !endTurnRequired;
  endBtn.classList.toggle("highlight", !endBtn.disabled);

  updateLastRollPill();
}

// ------------------ BOARD RENDER ------------------
function renderCell(id) {
  const el = document.getElementById(id);
  if (!el) return;

  const occ = cellOccupants[id] || [];
  if (occ.length === 0) {
    el.value = baseCellText[id] ?? "";
  } else {
    el.value = occ.map(o => SYMBOL[o.player]).join("");
  }
}

function renderAllCells() {
  [...new Set([...PATH1, ...PATH2, ...PATH3, ...PATH4])].forEach(renderCell);
}

function addToCell(cellId, player, token) {
  if (!cellOccupants[cellId]) cellOccupants[cellId] = [];
  cellOccupants[cellId].push({ player, token });
  renderCell(cellId);
}

function removeFromCell(cellId, player, token) {
  cellOccupants[cellId] = (cellOccupants[cellId] || []).filter(
    o => !(o.player === player && o.token === token)
  );
  renderCell(cellId);
}

function findOccupants(cellId) {
  return (cellOccupants[cellId] || []).slice();
}

// ------------------ GAME LOGIC ------------------
function resetGameState() {
  ["p1","p2","p3","p4"].forEach(p => {
    for (let t = 1; t <= 4; t++) posIndex[p][t] = -1;
  });

  for (let k in cellOccupants) delete cellOccupants[k];

  renderAllCells();

  lastRoll = null;
  bonusStreak = 0;
  penaltyPending = false;
  endTurnRequired = false;

  disableAllTokens();

  document.getElementById("rollBtn").disabled = false;
  document.getElementById("endTurnBtn").disabled = true;
  document.getElementById("endTurnBtn").classList.remove("highlight");

  updateLastRollPill();
}

function isBonusRoll(v) {
  return v === 4 || v === 8;
}

function canLandOn(cellId, player) {
  const occ = findOccupants(cellId);
  if (occ.length === 0) return true;
  return SAFE_CELLS.has(cellId) ? true : occ.every(o => o.player !== player);
}

function sendHome(player, token) {
  const idx = posIndex[player][token];
  if (idx >= 0) removeFromCell(PATHS[player][idx], player, token);
  posIndex[player][token] = -1;
}

function finishToken(player, token) {
  const idx = posIndex[player][token];
  if (idx >= 0) removeFromCell(PATHS[player][idx], player, token);
  posIndex[player][token] = -2;
}

function applyLanding(player, token, cellId) {
  const occ = findOccupants(cellId);
  let didCapture = false;

  if (!SAFE_CELLS.has(cellId)) {
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

    if (idx === -2) continue;

    if (idx === -1) {
      if (isBonusRoll(roll) && canLandOn(path[0], player)) legal.add(t);
      continue;
    }

    const target = idx + roll;
    if (target > lastIdx) continue;

    if (target === lastIdx) {
      legal.add(t);
      continue;
    }

    if (canLandOn(path[target], player)) legal.add(t);
  }

  return legal;
}

function nextTurn() {
  if (!activePlayers.length) return;

  turnIndex = (turnIndex + 1) % activePlayers.length;
  currentPlayer = activePlayers[turnIndex];
  lastRoll = null;
  penaltyPending = false;
  endTurnRequired = false;
  bonusStreak = 0;

  highlightTurnPanel();
  updatePanels(null);
  setStatus(`Turn: ${currentPlayer.toUpperCase()} | Roll cowries`);
  playerTurnSound(currentPlayer);
}

function requireEndTurn(msg) {
  lastRoll = null;
  endTurnRequired = true;
  setStatus(msg);
  updatePanels(null);
}

function onEndTurn() {
  if (endTurnRequired) {
    endTurnRequired = false;
    nextTurn();
  }
}

function rollCowries() {
  if (!activePlayers.length) {
    setStatus("No active players. Press New Game.");
    return;
  }

  if (lastRoll != null || endTurnRequired) return;

  ensureAudio();
  rollSound();

  lastRoll = COWRIE_VALUES[Math.floor(Math.random() * COWRIE_VALUES.length)];
  updateLastRollPill();

  if (isBonusRoll(lastRoll)) bonusStreak++;
  else bonusStreak = 0;

  if (bonusStreak >= 3) {
    penaltyPending = true;
    setStatus(`Turn: ${currentPlayer.toUpperCase()} | Roll: ${lastRoll} | PENALTY: click any token to cancel.`);
    const any = new Set();
    for (let t = 1; t <= 4; t++) {
      if (posIndex[currentPlayer][t] !== -2) any.add(t);
    }
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
    penaltyPending = false;
    bonusStreak = 0;
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

    moveSound();
    if (didCapture) captureSound();

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

  moveSound();
  if (didCapture) captureSound();

  if (isBonusRoll(roll) || didCapture) {
    const reason = didCapture
      ? "Captured. Extra chance: Roll again."
      : "Rolled 4/8. Extra chance: Roll again.";

    setStatus(`Turn: ${currentPlayer.toUpperCase()} | T${token} moved to ${to}. ${reason}`);
    updatePanels(null);
  } else {
    requireEndTurn(`Turn: ${currentPlayer.toUpperCase()} | T${token} moved to ${to}. Click End Turn.`);
  }
}