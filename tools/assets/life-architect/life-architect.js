// Life Architect — minimal working version with correct wiring
document.addEventListener("DOMContentLoaded", () => {
  // ---- Elements (IDs MUST match HTML) ----
  const canvas = document.getElementById('treeCanvas');
  const ctx = canvas.getContext('2d');
  const addBranchBtn = document.getElementById('addBranch');
  const addLeafBtn   = document.getElementById('addLeaf');
  const resetBtn     = document.getElementById('resetTree');
  const snapBtn      = document.getElementById('snapshotTree');
  const seasonSel    = document.getElementById('season');
  const soundToggle  = document.getElementById('soundToggle');
  const branchName   = document.getElementById('branchName');
  const leafName     = document.getElementById('leafName');
  const branchSelect = document.getElementById('branchSelect');

  // Guard: if something’s missing, bail early with a clear error
  if (!canvas || !addBranchBtn || !addLeafBtn || !resetBtn || !snapBtn) {
    console.error("Life Architect: missing required DOM elements.");
    return;
  }

  // ---- Canvas sizing ----
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redrawAll();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- State ----
  let season = seasonSel ? seasonSel.value : 'Summer';
  let soundOn = !!(soundToggle && soundToggle.checked);
  const branches = []; // [{ name, angle, len }]
  // simple persistence could be added later

  // ---- Audio (optional assets) ----
  let chime = null, rustle = null;
  try {
    chime = new Audio('assets/life-architect/sounds/chime.mp3');
    rustle = new Audio('assets/life-architect/sounds/rustle.mp3');
  } catch (e) {
    // If files not present, ignore; functions check for existence
  }

  // ---- Helpers ----
  const rand = (min, max) => Math.random() * (max - min) + min;

  function seasonColor() {
    switch (season) {
      case 'Spring': return '#7fffd4';
      case 'Summer': return '#00ff66';
      case 'Autumn': return '#ffcc33';
      case 'Winter': return '#66ccff';
      default: return '#00ff66';
    }
  }

  function drawLeaf(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = seasonColor();
    ctx.shadowBlur = 15;
    ctx.shadowColor = seasonColor();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawBranch(x, y, len, angle, depth) {
    if (depth <= 0) return;
    const x2 = x + len * Math.cos(angle);
    const y2 = y - len * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = seasonColor();
    ctx.lineWidth = Math.max(1, depth * 2);
    ctx.shadowBlur = 10;
    ctx.shadowColor = seasonColor();
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (depth < 3) drawLeaf(x2, y2);

    // grow child branches with a slight delay to feel organic
    setTimeout(() => {
      drawBranch(x2, y2, len * 0.7, angle - rand(0.3, 0.6), depth - 1);
      drawBranch(x2, y2, len * 0.7, angle + rand(0.3, 0.6), depth - 1);
    }, 80);
  }

  function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // redraw every saved branch (basic persistence of visuals)
    branches.forEach(b => {
      drawBranch(canvas.width / 2, canvas.height, b.len, b.angle, 8);
    });
  }

  // ---- Actions ----
  function handleAddBranch() {
    const name = (branchName.value || '').trim();
    if (!name) return;

    const angle = rand(-0.5, 0.5);
    const len = rand(100, 200);
    branches.push({ name, angle, len });

    drawBranch(canvas.width / 2, canvas.height, len, angle, 8);
    if (soundOn && rustle) try { rustle.currentTime = 0; rustle.play(); } catch {}
    // optionally add to select to attach leaves to a branch later
    const opt = document.createElement('option'); opt.value = name; opt.textContent = name;
    branchSelect.appendChild(opt);
    branchName.value = '';
  }

  function handleAddLeaf() {
    // For now, we just draw a leaf randomly near lower half.
    // Later, we can attach to a selected branch path.
    if (soundOn && chime) try { chime.currentTime = 0; chime.play(); } catch {}
    const x = rand(40, canvas.width - 40);
    const y = rand(canvas.height * 0.5, canvas.height - 60);
    drawLeaf(x, y);
    leafName.value = '';
  }

  function handleReset() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    branches.length = 0;
    branchSelect.innerHTML = '';
  }

  function handleSnapshot() {
    const a = document.createElement('a');
    a.download = 'tree_memory.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  // ---- Events ----
  addBranchBtn.addEventListener('click', handleAddBranch);
  addLeafBtn.addEventListener('click', handleAddLeaf);
  resetBtn.addEventListener('click', handleReset);
  snapBtn.addEventListener('click', handleSnapshot);

  if (seasonSel) {
    seasonSel.addEventListener('change', (e) => {
      season = e.target.value;
      redrawAll();
    });
  }
  if (soundToggle) {
    soundToggle.addEventListener('change', (e) => {
      soundOn = e.target.checked;
    });
  }
});
