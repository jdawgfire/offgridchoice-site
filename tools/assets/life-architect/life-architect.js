document.addEventListener("DOMContentLoaded", () => {
  const addBranchBtn = document.getElementById("addBranchBtn");
  const addLeafBtn = document.getElementById("addLeafBtn");
  const pruneTreeBtn = document.getElementById("pruneTreeBtn");
  const snapshotBtn = document.getElementById("snapshotBtn");

  // Guard: buttons may not exist yet
  if (!addBranchBtn || !addLeafBtn || !pruneTreeBtn || !snapshotBtn) {
    console.error("One or more buttons not found.");
    return;
  }

  // Add interactions
  addBranchBtn.addEventListener("click", addBranch);
  addLeafBtn.addEventListener("click", addLeaf);
  pruneTreeBtn.addEventListener("click", resetTree);
  snapshotBtn.addEventListener("click", saveSnapshot);
});
const canvas = document.getElementById('treeCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let branches = [];
let season = 'Summer';
let soundOn = true;

const chime = new Audio('assets/life-architect/sounds/chime.mp3');
const rustle = new Audio('assets/life-architect/sounds/rustle.mp3');

function rand(min, max) { return Math.random() * (max - min) + min; }

function drawBranch(x, y, len, angle, depth) {
  if (depth === 0) return;
  const x2 = x + len * Math.cos(angle);
  const y2 = y - len * Math.sin(angle);

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = seasonColor();
  ctx.lineWidth = depth * 2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = seasonColor();
  ctx.stroke();

  // leaf at the end
  if (depth < 3) drawLeaf(x2, y2);

  setTimeout(() => {
    drawBranch(x2, y2, len * 0.7, angle - rand(0.3, 0.6), depth - 1);
    drawBranch(x2, y2, len * 0.7, angle + rand(0.3, 0.6), depth - 1);
  }, 100);
}

function drawLeaf(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = seasonColor();
  ctx.shadowBlur = 15;
  ctx.shadowColor = seasonColor();
  ctx.fill();
}

function seasonColor() {
  switch (season) {
    case 'Spring': return '#7fffd4';
    case 'Summer': return '#00ff66';
    case 'Autumn': return '#ffcc33';
    case 'Winter': return '#66ccff';
  }
}

document.getElementById('addBranch').onclick = () => {
  const name = document.getElementById('branchName').value.trim();
  if (!name) return;
  const angle = rand(-0.5, 0.5);
  const len = rand(100, 200);
  branches.push({ name, angle, len });
  drawBranch(canvas.width / 2, canvas.height, len, angle, 8);
  if (soundOn) rustle.play();
};

document.getElementById('addLeaf').onclick = () => {
  if (soundOn) chime.play();
  drawLeaf(rand(0, canvas.width), rand(canvas.height / 2, canvas.height - 50));
};

document.getElementById('resetTree').onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.he
