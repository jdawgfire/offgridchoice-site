// Life Architect - Holographic Goal Builder
const $ = s => document.querySelector(s);
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

// Local storage keys
const LS_KEY = "lifeArchitect.data";

let data = JSON.parse(localStorage.getItem(LS_KEY) || '{"structures":[]}');

function saveData() {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function renderStructures() {
  const select = $("#structureSelect");
  select.innerHTML = "";
  data.structures.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
  renderGrid();
}

function renderGrid() {
  const grid = $("#holoGrid");
  grid.innerHTML = "";

  data.structures.forEach(structure => {
    const div = document.createElement("div");
    div.className = "node";
    div.dataset.id = structure.id;
    div.textContent = structure.name;
    div.onclick = () => toggleStructure(structure.id);
    grid.appendChild(div);

    structure.goals.forEach(goal => {
      const g = document.createElement("div");
      g.className = "node" + (goal.complete ? " complete" : "");
      g.textContent = goal.name;
      g.dataset.sid = structure.id;
      g.dataset.gid = goal.id;
      g.onclick = () => toggleGoal(structure.id, goal.id);
      grid.appendChild(g);
    });
  });
}

function addStructure() {
  const name = $("#structureName").value.trim();
  if (!name) return alert("Enter a structure name.");
  data.structures.push({ id: uuid(), name, goals: [] });
  $("#structureName").value = "";
  saveData();
  renderStructures();
}

function addGoal() {
  const sid = $("#structureSelect").value;
  const s = data.structures.find(x => x.id === sid);
  const name = $("#goalName").value.trim();
  if (!s || !name) return alert("Select structure and enter goal.");
  s.goals.push({ id: uuid(), name, complete: false });
  $("#goalName").value = "";
  saveData();
  renderGrid();
}

function toggleGoal(sid, gid) {
  const s = data.structures.find(x => x.id === sid);
  const g = s.goals.find(x => x.id === gid);
  g.complete = !g.complete;
  saveData();
  renderGrid();
}

function toggleStructure(id) {
  const s = data.structures.find(x => x.id === id);
  const allDone = s.goals.every(g => g.complete);
  s.goals.forEach(g => g.complete = !allDone);
  saveData();
  renderGrid();
}

function clearAll() {
  if (confirm("Clear your entire life blueprint?")) {
    data = { structures: [] };
    saveData();
    renderStructures();
  }
}

// Floating background grid
const bg = document.getElementById("background");
const ctx = bg.getContext("2d");
function resizeBG() { bg.width = innerWidth; bg.height = innerHeight; }
window.addEventListener("resize", resizeBG);
resizeBG();

function animateBG() {
  ctx.clearRect(0, 0, bg.width, bg.height);
  const spacing = 60;
  ctx.strokeStyle = "#0ff2";
  ctx.lineWidth = 1;
  for (let x = 0; x < bg.width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, bg.height);
    ctx.stroke();
  }
  for (let y = 0; y < bg.height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(bg.width, y);
    ctx.stroke();
  }
  requestAnimationFrame(animateBG);
}
animateBG();

// Events
$("#addStructureBtn").onclick = addStructure;
$("#addGoalBtn").onclick = addGoal;
$("#clearAllBtn").onclick = clearAll;

// Initialize
renderStructures();
