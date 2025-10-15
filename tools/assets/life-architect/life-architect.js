const treeArea = document.getElementById("treeCanvas");
const structureSelect = document.getElementById("structureSelect");
const addStructureBtn = document.getElementById("addStructureBtn");
const addGoalBtn = document.getElementById("addGoalBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

let tree = JSON.parse(localStorage.getItem("treeOfLife")) || {};

function saveTree() {
  localStorage.setItem("treeOfLife", JSON.stringify(tree));
}

function renderTree() {
  treeArea.innerHTML = "";
  Object.entries(tree).forEach(([structure, goals]) => {
    const branch = document.createElement("div");
    branch.classList.add("branch");
    branch.textContent = structure;

    const goalContainer = document.createElement("div");
    goalContainer.classList.add("goal-container");

    goals.forEach(goal => {
      const leaf = document.createElement("div");
      leaf.classList.add("goal");
      leaf.textContent = goal.name;
      if (goal.done) leaf.classList.add("completed");
      leaf.onclick = () => {
        goal.done = !goal.done;
        saveTree();
        renderTree();
      };
      goalContainer.appendChild(leaf);
    });

    branch.onclick = () => goalContainer.classList.toggle("open");
    treeArea.append(branch, goalContainer);
  });
}

addStructureBtn.onclick = () => {
  const name = document.getElementById("structureName").value.trim();
  if (!name || tree[name]) return;
  tree[name] = [];
  structureSelect.innerHTML += `<option value="${name}">${name}</option>`;
  saveTree();
  renderTree();
};

addGoalBtn.onclick = () => {
  const struct = structureSelect.value;
  const goal = document.getElementById("goalName").value.trim();
  if (!struct || !goal) return;
  tree[struct].push({ name: goal, done: false });
  saveTree();
  renderTree();
};

clearAllBtn.onclick = () => {
  if (confirm("Are you sure you want to prune your Tree of Life? 🌳")) {
    tree = {};
    localStorage.removeItem("treeOfLife");
    structureSelect.innerHTML = "";
    renderTree();
  }
};

window.onload = () => {
  Object.keys(tree).forEach(name => {
    structureSelect.innerHTML += `<option value="${name}">${name}</option>`;
  });
  renderTree();
};
