/* Life Architect — Tree of Life (Deluxe) */
(() => {
  "use strict";

  // ---------- Helpers ----------
  const $ = (s) => document.querySelector(s);
  const uuid = () =>
    (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

  const LS_KEY = "treeOfLife.v2";
  const LS_SEASON = "treeOfLife.season";
  const nodesEl = $("#nodes");
  const branchCanvas = $("#branches");
  const auraCanvas = $("#bgAuras");

  let data;
  function load() {
    try {
      data = JSON.parse(localStorage.getItem(LS_KEY) || '{"structures":[]}');
      if (!data || !Array.isArray(data.structures)) data = { structures: [] };
      data.structures.forEach(s => {
        if (typeof s.collapsed !== "boolean") s.collapsed = false;
        if (!Array.isArray(s.goals)) s.goals = [];
      });
    } catch { data = { structures: [] }; }
  }
  function save() { localStorage.setItem(LS_KEY, JSON.stringify(data)); }

  // ---------- Sound ----------
  let audioCtx = null;
  $("#soundToggle").addEventListener("change", e => {
    if (!e.target.checked && audioCtx) { audioCtx.close(); audioCtx = null; }
  });
  function chime(){
    if (!$("#soundToggle").checked) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const o1 = audioCtx.createOscillator(), g1 = audioCtx.createGain();
      const o2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();
      o1.type="sine"; o2.type="sine";
      o1.frequency.setValueAtTime(784, now); // G5
      o2.frequency.setValueAtTime(988, now); // B5
      g1.gain.setValueAtTime(0.0001, now); g1.gain.exponentialRampToValueAtTime(0.15, now+0.01);
      g1.gain.exponentialRampToValueAtTime(0.0001, now+0.6);
      g2.gain.setValueAtTime(0.0001, now); g2.gain.exponentialRampToValueAtTime(0.08, now+0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, now+0.6);
      o1.connect(g1).connect(audioCtx.destination);
      o2.connect(g2).connect(audioCtx.destination);
      o1.start(); o2.start(); o1.stop(now+0.65); o2.stop(now+0.65);
    } catch {}
  }

  // ---------- Seasons ----------
  function applySeason(season){
    document.body.classList.remove("spring","summer","autumn","winter");
    document.body.classList.add(season);
    localStorage.setItem(LS_SEASON, season);
  }
  const seasonSel = $("#seasonSelect");
  const savedSeason = localStorage.getItem(LS_SEASON) || "spring";
  seasonSel.value = savedSeason; applySeason(savedSeason);
  seasonSel.addEventListener("change", e => applySeason(e.target.value));

  // ---------- Controls ----------
  const sel = $("#structureSelect");
  $("#addStructureBtn").addEventListener("click", addStructure);
  $("#addGoalBtn").addEventListener("click", addGoal);
  $("#clearAllBtn").addEventListener("click", clearAll);
  $("#exportPngBtn").addEventListener("click", exportPNG);

  function addStructure(){
    const name = ($("#structureName").value || "").trim();
    if (!name) return alert("Name your branch.");
    data.structures.push({ id:uuid(), name, collapsed:false, goals:[] });
    save(); renderAll();
    $("#structureName").value = "";
  }
  function addGoal(){
    const sid = sel.value;
    const s = data.structures.find(x=>x.id===sid);
    const name = ($("#goalName").value || "").trim();
    if (!s || !name) return alert("Pick a branch and name your leaf.");
    s.goals.push({ id:uuid(), name, complete:false });
    save(); renderAll();
    $("#goalName").value = "";
  }
  function clearAll(){
    if(!confirm("Prune your whole tree? This cannot be undone.")) return;
    data = { structures:[] }; save(); renderAll();
  }

  // ---------- Layout ----------
  function layout(){
    // full-bleed canvas sizing
    const rect = $("#stage").getBoundingClientRect();
    branchCanvas.width = rect.width; branchCanvas.height = rect.height;
    nodesEl.style.width = rect.width + "px"; nodesEl.style.height = rect.height + "px";
    // positions for branches & leaves
    const cols = data.structures.length || 1;
    const padX = 120, padTop = 110, trunkY = 70;
    const colWidth = (branchCanvas.width - padX*2) / cols;
    const positions = { branches:[], leaves:[] };

    data.structures.forEach((s, i) => {
      const x = Math.round(padX + colWidth*(i+0.5));
      const y = padTop;
      positions.branches.push({ id:s.id, name:s.name, x, y, collapsed:s.collapsed });

      if (!s.collapsed) {
        s.goals.forEach((g, gi) => {
          const gx = x;
          const gy = y + 150 + gi*130;
          positions.leaves.push({ sid:s.id, gid:g.id, name:g.name, complete:g.complete, x:gx, y:gy });
        });
      }
    });

    positions.trunk = { x:branchCanvas.width/2, y:trunkY };
    positions.height = Math.max(...positions.leaves.map(l=>l.y).concat(padTop+200), branchCanvas.height);
    return positions;
  }

  // ---------- Drawing ----------
  function drawBranches(pos){
    const ctx = branchCanvas.getContext("2d");
    ctx.clearRect(0,0,branchCanvas.width, branchCanvas.height);

    // trunk
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--branch').trim() || "#3bd28b";
    ctx.lineWidth = 6; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(pos.trunk.x, pos.trunk.y);
    ctx.lineTo(pos.trunk.x, pos.branches.length ? pos.branches[0].y - 40 : 140); ctx.stroke();

    // animated growth: draw segments with dash offset
    const t = (performance.now()/700)%1;

    pos.branches.forEach(b=>{
      // trunk to branch
      dashedBezier(ctx, pos.trunk.x, pos.branches[0].y - 40, b.x, b.y-60, t);
    });

    pos.leaves.forEach(l=>{
      // branch to leaf
      dashedBezier(ctx, pos.branches.find(b=>b.id===l.sid).x, pos.branches.find(b=>b.id===l.sid).y+60, l.x, l.y-60, t, l.complete);
    });
  }

  function dashedBezier(ctx, x1,y1, x2,y2, t, complete=false){
    const ctrlx = x1 + (x2-x1)*0.0;
    const ctrly = (y1+y2)/2;
    ctx.save();
    ctx.setLineDash([8,8]);
    ctx.lineDashOffset = -t*40;
    ctx.strokeStyle = complete
      ? getComputedStyle(document.documentElement).getPropertyValue('--leaf').trim() || "#5cf5a2"
      : getComputedStyle(document.documentElement).getPropertyValue('--leaf-dim').trim() || "#3eb574";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.quadraticCurveTo(ctrlx, ctrly, x2,y2);
    ctx.stroke();
    ctx.restore();
  }

  // Node DOM render
  function renderNodes(pos){
    nodesEl.innerHTML = "";
    // branches
    pos.branches.forEach(b=>{
      const n = document.createElement("div");
      n.className = "node branch" + (b.collapsed ? " collapsed" : "");
      n.style.left = b.x+"px"; n.style.top = b.y+"px";
      n.textContent = b.name;
      n.title = b.collapsed ? "Expand leaves" : "Collapse leaves";
      n.addEventListener("click", ()=>{ toggleCollapsed(b.id); });
      nodesEl.appendChild(n);
    });
    // leaves
    pos.leaves.forEach(l=>{
      const n = document.createElement("div");
      n.className = "node leaf" + (l.complete ? " complete" : "");
      n.style.left = l.x+"px"; n.style.top = l.y+"px";
      n.textContent = l.name;
      n.title = "Toggle completion";
      n.addEventListener("click", ()=>{ toggleLeaf(l.sid, l.gid); });
      nodesEl.appendChild(n);
    });
  }

  function toggleLeaf(sid, gid){
    const s = data.structures.find(x=>x.id===sid); if(!s) return;
    const g = s.goals.find(x=>x.id===gid); if(!g) return;
    g.complete = !g.complete; if(g.complete) chime();
    save(); renderAll();
  }
  function toggleCollapsed(sid){
    const s = data.structures.find(x=>x.id===sid); if(!s) return;
    s.collapsed = !s.collapsed; save(); renderAll();
  }

  // Background auras
  function drawAuras(){
    const c=auraCanvas, ctx=c.getContext("2d"); c.width=innerWidth; c.height=innerHeight;
    let t=0;
    (function loop(){
      ctx.clearRect(0,0,c.width,c.height);
      const cx = c.width*0.7, cy=c.height*0.25;
      for(let r=80;r<520;r+=70){
        ctx.beginPath();
        const wob = Math.sin((t+r)/40)*4;
        ctx.arc(cx,cy,r+wob,0,Math.PI*2);
        ctx.strokeStyle="rgba(255,255,255,.04)";
        ctx.lineWidth=1;
        ctx.stroke();
      }
      t++; requestAnimationFrame(loop);
    })();
  }

  // Snapshot PNG
  function exportPNG(){
    const pos = layout();
    // draw onto an offscreen canvas
    const out = $("#exportCanvas");
    out.width = branchCanvas.width; out.height = Math.max(branchCanvas.height, pos.height+120);
    const ctx = out.getContext("2d");
    // bg
    const cs = getComputedStyle(document.body);
    const grad = ctx.createLinearGradient(0,0,0,out.height);
    grad.addColorStop(0, cs.getPropertyValue("--bg1").trim() || "#07140a");
    grad.addColorStop(1, cs.getPropertyValue("--bg2").trim() || "#021006");
    ctx.fillStyle = grad; ctx.fillRect(0,0,out.width,out.height);

    // redraw branches
    const tmp = document.createElement("canvas");
    tmp.width = out.width; tmp.height = out.height;
    const tctx = tmp.getContext("2d");
    // lift drawing helpers
    function drawAll(){
      // trunk
      tctx.strokeStyle = cs.getPropertyValue('--branch').trim() || "#3bd28b";
      tctx.lineWidth = 6; tctx.lineCap="round";
      tctx.beginPath(); tctx.moveTo(pos.trunk.x, pos.trunk.y);
      tctx.lineTo(pos.trunk.x, pos.branches.length ? pos.branches[0].y - 40 : 140); tctx.stroke();
      // branches
      pos.branches.forEach(b=>solidBezier(tctx, pos.trunk.x, pos.branches[0].y - 40, b.x, b.y-60, false));
      pos.leaves.forEach(l=>solidBezier(tctx, pos.branches.find(b=>b.id===l.sid).x, pos.branches.find(b=>b.id===l.sid).y+60, l.x, l.y-60, l.complete));
    }
    function solidBezier(ctx2, x1,y1, x2,y2, complete){
      const ctrlx = x1;
      const ctrly = (y1+y2)/2;
      ctx2.strokeStyle = complete ? cs.getPropertyValue('--leaf').trim() || "#5cf5a2" : cs.getPropertyValue('--leaf-dim').trim() || "#3eb574";
      ctx2.lineWidth = 2.2;
      ctx2.beginPath(); ctx2.moveTo(x1,y1);
      ctx2.quadraticCurveTo(ctrlx, ctrly, x2,y2); ctx2.stroke();
    }
    drawAll();
    ctx.drawImage(tmp,0,0);

    // draw nodes
    ctx.textAlign="center"; ctx.textBaseline="middle";
    pos.branches.forEach(b=>{
      drawCircle(ctx, b.x, b.y, 75, cs.getPropertyValue('--branch').trim(), true, b.name);
    });
    pos.leaves.forEach(l=>{
      drawCircle(ctx, l.x, l.y, 55, l.complete ? cs.getPropertyValue('--leaf').trim() : cs.getPropertyValue('--leaf-dim').trim(), l.complete, l.name);
    });

    function drawCircle(c2, x,y,r, stroke, bright, label){
      // glow
      c2.beginPath(); c2.arc(x,y,r,0,Math.PI*2);
      c2.fillStyle = bright ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)";
      c2.fill();
      c2.lineWidth=2; c2.strokeStyle=stroke; c2.stroke();
      // label
      c2.fillStyle = cs.getPropertyValue('--ink').trim() || "#e9ffef";
      c2.font = "bold 14px system-ui,Segoe UI";
      wrapText(c2,label,x,y, r*1.6, 16);
    }
    function wrapText(ctx2, text, x,y, maxWidth, lineHeight){
      const words = String(text).split(/\s+/), lines=[];
      let line = "";
      words.forEach(w=>{
        const test = line ? line+" "+w : w;
        if (ctx2.measureText(test).width < maxWidth) { line = test; }
        else { lines.push(line); line = w; }
      });
      if (line) lines.push(line);
      const startY = y - (lines.length-1)*lineHeight/2;
      lines.forEach((ln,i)=> ctx2.fillText(ln, x, startY + i*lineHeight));
    }

    const link = document.createElement("a");
    link.href = out.toDataURL("image/png");
    link.download = `LifeTree_${new Date().toISOString().slice(0,10)}.png`;
    link.click();
  }

  // ---------- Render Orchestrator ----------
  function renderAll(){
    // populate select
    sel.innerHTML = "";
    data.structures.forEach(s=>{
      const o=document.createElement("option"); o.value=s.id; o.textContent=s.name; sel.appendChild(o);
    });

    // layout + draw
    const pos = layout();
    renderNodes(pos);
    drawBranches(pos);
  }

  // ---------- Init ----------
  function initBgAuras(){
    const c=auraCanvas, ctx=c.getContext("2d");
    function size(){ c.width=innerWidth; c.height=innerHeight; }
    size(); addEventListener("resize", size);
    let t=0;
    (function loop(){
      ctx.clearRect(0,0,c.width,c.height);
      // floating pollen dots
      for(let i=0;i<120;i++){
        const x=(i*73 + t*0.9)%c.width;
        const y=(i*131 + t*0.5)%c.height;
        ctx.fillStyle="rgba(255,255,255,.035)";
        ctx.beginPath(); ctx.arc(x,y,1.2,0,Math.PI*2); ctx.fill();
      }
      t++; requestAnimationFrame(loop);
    })();
  }

  function init(){
    load(); renderAll(); initBgAuras();
    addEventListener("resize", renderAll);
  }

  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();

})();
