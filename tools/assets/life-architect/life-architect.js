/* Life Architect — Blueprint Tree with SVG links */
(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  const LS_KEY = "lifeArchitect.data";

  // State
  let data;
  function load() {
    try {
      data = JSON.parse(localStorage.getItem(LS_KEY) || '{"structures":[]}');
      if (!data || !Array.isArray(data.structures)) data = { structures: [] };
      // add collapsed flag
      data.structures.forEach(s => { if (typeof s.collapsed !== "boolean") s.collapsed = false; });
    } catch { data = { structures: [] }; }
  }
  function save() { localStorage.setItem(LS_KEY, JSON.stringify(data)); }

  // DOM cache
  const els = {};
  function cache() {
    els.bg = $("#background");
    els.grid = $("#holoGrid");
    els.svg = $("#links");
    els.sel = $("#structureSelect");
    els.inStruct = $("#structureName");
    els.btnStruct = $("#addStructureBtn");
    els.inGoal = $("#goalName");
    els.btnGoal = $("#addGoalBtn");
    els.btnClear = $("#clearAllBtn");
    els.treeWrap = $("#treeWrap");
  }

  // Controls
  function addStructure() {
    const name = (els.inStruct.value || "").trim();
    if (!name) return alert("Enter a structure name.");
    data.structures.push({ id: uuid(), name, goals: [], collapsed: false });
    els.inStruct.value = "";
    save(); renderAll();
  }
  function addGoal() {
    const sid = els.sel.value;
    const s = data.structures.find(x => x.id === sid);
    const name = (els.inGoal.value || "").trim();
    if (!s || !name) return alert("Select a structure and enter a goal.");
    s.goals.push({ id: uuid(), name, complete: false });
    els.inGoal.value = "";
    save(); renderAll();
  }
  function toggleGoal(sid, gid) {
    const s = data.structures.find(x => x.id === sid); if (!s) return;
    const g = s.goals.find(x => x.id === gid); if (!g) return;
    g.complete = !g.complete; save(); renderAll();
  }
  function toggleCollapsed(sid) {
    const s = data.structures.find(x => x.id === sid); if (!s) return;
    s.collapsed = !s.collapsed; save(); renderAll();
  }
  function clearAll() {
    if (!confirm("Clear your entire life blueprint?")) return;
    data = { structures: [] }; save(); renderAll();
  }

  // Layout: columns per structure; goals below structure in that column.
  function layoutAndRender() {
    els.grid.innerHTML = "";
    els.svg.setAttribute("width", els.treeWrap.scrollWidth);
    els.svg.setAttribute("height", Math.max(els.treeWrap.clientHeight, 600));
    while (els.svg.firstChild) els.svg.removeChild(els.svg.firstChild);

    const colWidth = 240; // horizontal spacing per structure
    const topY = 120;     // structure Y
    const goalGap = 150;  // vertical gap between goals
    const startX = 140;

    const positions = new Map(); // nodeId -> {x,y,type}

    data.structures.forEach((s, idx) => {
      const x = startX + idx * colWidth;
      const y = topY;

      // structure node
      const hub = document.createElement("div");
      hub.className = "node structure" + (s.collapsed ? " collapsed" : "");
      hub.style.left = x + "px"; hub.style.top = y + "px";
      hub.textContent = s.name;
      hub.title = s.collapsed ? "Expand goals" : "Collapse goals";
      hub.addEventListener("click", () => toggleCollapsed(s.id));
      els.grid.appendChild(hub);
      positions.set(s.id, { x, y, type: "structure" });

      if (!s.collapsed) {
        s.goals.forEach((g, gi) => {
          const gx = x;
          const gy = y + goalGap * (gi + 1);
          const node = document.createElement("div");
          node.className = "node goal" + (g.complete ? " complete" : "");
          node.style.left = gx + "px"; node.style.top = gy + "px";
          node.textContent = g.name;
          node.title = "Toggle completion";
          node.addEventListener("click", () => toggleGoal(s.id, g.id));
          els.grid.appendChild(node);
          positions.set(`${s.id}:${g.id}`, { x: gx, y: gy, type: "goal" });

          // link line s -> g
          drawLink(x, y, gx, gy, g.complete);
        });
      }
    });

    // resize SVG to fit content height
    const contentHeight = computeContentHeight(positions);
    els.svg.setAttribute("height", Math.max(contentHeight + 120, 600));
  }

  function drawLink(x1, y1, x2, y2, complete) {
    // slight curve: use quadratic path
    const midY = (y1 + y2) / 2;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = `M ${x1} ${y1+60} Q ${x1} ${midY} ${x2} ${y2-60}`;
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", complete ? "#59ffc9" : "#5b8cff");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("opacity", "0.9");

    // animated dash
    path.setAttribute("stroke-dasharray", "6 6");
    path.style.animation = "dash 4s linear infinite";
    els.svg.appendChild(path);
  }

  // compute max y to size the SVG
  function computeContentHeight(posMap){
    let max = 0;
    posMap.forEach(({y}) => { if (y>max) max = y; });
    return max;
  }

  // Populate select + render
  function renderSelect() {
    els.sel.innerHTML = "";
    data.structures.forEach(s => {
      const op = document.createElement("option");
      op.value = s.id; op.textContent = s.name; els.sel.appendChild(op);
    });
  }
  function renderAll() {
    renderSelect();
    layoutAndRender();
  }

  // Background blueprint lines
  function initBG(){
    const bg = els.bg; if (!bg) return;
    const ctx = bg.getContext("2d", { alpha:true });
    function size(){ bg.width = innerWidth; bg.height = innerHeight; }
    size(); addEventListener("resize", size);
    let t=0;
    (function loop(){
      ctx.clearRect(0,0,bg.width,bg.height);
      // faint moving rings
      ctx.strokeStyle = "rgba(66,232,255,.18)";
      ctx.lineWidth = 1;
      const cx = bg.width*0.7, cy = bg.height*0.25;
      for(let r=60;r<420;r+=60){
        ctx.beginPath(); ctx.arc(cx, cy, r + Math.sin((t+r)/25)*4, 0, Math.PI*2); ctx.stroke();
      }
      t++;
      requestAnimationFrame(loop);
    })();
  }

  // Wire events
  function bind(){
    els.btnStruct.addEventListener("click", addStructure);
    els.btnGoal.addEventListener("click", addGoal);
    els.btnClear.addEventListener("click", clearAll);
  }

  // Init
  function init(){
    cache(); load(); bind(); renderAll(); initBG();

    // CSS keyframes for dashed path (inject once)
    if (!document.getElementById("dash-anim-style")) {
      const st = document.createElement("style");
      st.id = "dash-anim-style";
      st.textContent = `@keyframes dash { to { stroke-dashoffset: -200; } }`;
      document.head.appendChild(st);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else { init(); }
})();
