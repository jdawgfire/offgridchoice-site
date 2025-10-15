/* Life Architect — Tree of Life (Organic, animated, buttons fixed) */
(() => {
  "use strict";

  // ---------- DOM ----------
  const $ = s => document.querySelector(s);
  const nodesEl = $("#nodes");
  const canvas = $("#branches");
  const aura = $("#bgAuras");
  const structSel = $("#structureSelect");
  const seasonSel = $("#seasonSelect");
  const soundToggle = $("#soundToggle");

  // ---------- State ----------
  const LS_KEY = "treeOfLife.organic.v1";
  const LS_SEASON = "treeOfLife.season";
  let data = null;  // {structures:[{id,name,collapsed,bool,goals:[{id,name,complete}]}]}
  let links = [];   // animated segments [{from:{x,y}, to:{x,y}, progress:0..1, color}]
  let particles = []; // ambient & growth particles

  // ---------- Utils ----------
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  const lerp = (a,b,t)=>a+(b-a)*t;
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
  const ease = t => 1-Math.pow(1-t,2); // fast out easing for growth

  // ---------- Storage ----------
  function load(){
    try{
      data = JSON.parse(localStorage.getItem(LS_KEY) || '{"structures":[]}');
      if (!data || !Array.isArray(data.structures)) data = {structures:[]};
      data.structures.forEach(s=>{ if(typeof s.collapsed!=="boolean") s.collapsed=false; if(!Array.isArray(s.goals)) s.goals=[]; });
    }catch{ data={structures:[]} }
  }
  function save(){ localStorage.setItem(LS_KEY, JSON.stringify(data)); }

  // ---------- Seasons ----------
  function setSeason(s){ document.body.classList.remove("spring","summer","autumn","winter"); document.body.classList.add(s); localStorage.setItem(LS_SEASON,s); }
  seasonSel.addEventListener("change", e=> setSeason(e.target.value));
  setSeason(localStorage.getItem(LS_SEASON) || "spring");

  // ---------- Audio ----------
  let audioCtx=null;
  function chime(){
    if(!soundToggle.checked) return;
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type="triangle"; o.frequency.setValueAtTime(784, now);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.18, now+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now+0.5);
      o.connect(g).connect(audioCtx.destination); o.start(); o.stop(now+0.52);
    }catch{}
  }

  // ---------- Layout ----------
  function stageRect(){ return $("#stage").getBoundingClientRect(); }
  function sizeCanvases(){
    const r = stageRect();
    canvas.width=r.width; canvas.height=r.height;
    aura.width=innerWidth; aura.height=innerHeight;
    nodesEl.style.width=r.width+"px"; nodesEl.style.height=r.height+"px";
  }
  function positions(){
    const r = canvas.getBoundingClientRect();
    const padX = 110, topY = 120, col = data.structures.length||1;
    const colW = (r.width - padX*2)/col;
    const trunk = {x:r.width/2, y:60};
    const branches=[], leaves=[];
    data.structures.forEach((s,i)=>{
      const x = Math.round(padX + colW*(i+0.5)), y = topY;
      branches.push({id:s.id, name:s.name, x, y, collapsed:s.collapsed});
      if(!s.collapsed){
        s.goals.forEach((g,gi)=>{
          leaves.push({sid:s.id, gid:g.id, name:g.name, complete:g.complete, x, y: y+150+gi*130});
        });
      }
    });
    return {trunk,branches,leaves};
  }

  // ---------- Render DOM nodes ----------
  function renderNodes(pos){
    nodesEl.innerHTML="";
    pos.branches.forEach(b=>{
      const n=document.createElement("div");
      n.className="node branch"+(b.collapsed?" collapsed":"");
      n.style.left=b.x+"px"; n.style.top=b.y+"px";
      n.textContent=b.name;
      n.title = b.collapsed ? "Expand leaves" : "Collapse leaves";
      n.addEventListener("click", ()=>{ toggleCollapsed(b.id); });
      nodesEl.appendChild(n);
    });
    pos.leaves.forEach(l=>{
      const n=document.createElement("div");
      n.className="node leaf"+(l.complete?" complete":"");
      n.style.left=l.x+"px"; n.style.top=l.y+"px";
      n.textContent=l.name;
      n.title="Toggle completion";
      n.addEventListener("click", ()=>{ toggleLeaf(l.sid, l.gid); });
      nodesEl.appendChild(n);
    });
  }

  // ---------- Animated branches (organic) ----------
  function queueGrowth(from, to, color){
    links.push({from, to, color, progress:0});
    // emit a few particles from root
    for(let i=0;i<12;i++){
      particles.push({x:from.x, y:from.y, vx:(Math.random()-0.5)*0.8, vy:(Math.random()-0.5)*0.8, life:60+Math.random()*40, color});
    }
  }

  function draw(){
    const ctx = canvas.getContext("2d");
    const cs = getComputedStyle(document.documentElement);
    const branchColor = cs.getPropertyValue('--branch').trim() || "#38c77f";
    const leafColor   = cs.getPropertyValue('--leaf').trim()   || "#66f0aa";
    const leafDim     = cs.getPropertyValue('--leaf-dim').trim()|| "#3eb574";

    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.lineCap="round";

    // draw trunk
    const pos = positions();
    ctx.strokeStyle = branchColor; ctx.lineWidth=6;
    ctx.beginPath(); ctx.moveTo(pos.trunk.x, pos.trunk.y);
    ctx.lineTo(pos.trunk.x, pos.branches.length? pos.branches[0].y-40 : 140); ctx.stroke();

    // animate each link (quadratic organic)
    links.forEach(seg=>{
      seg.progress = clamp(seg.progress + 0.02, 0, 1);
      const t = ease(seg.progress);
      const cx = lerp(seg.from.x, seg.to.x, 0.0);
      const cy = (seg.from.y + seg.to.y)/2 + Math.sin((seg.from.x+seg.to.x)*0.02)*20;
      const ex = lerp(seg.from.x, seg.to.x, t);
      const ey = lerp(seg.from.y, seg.to.y, t);

      ctx.save();
      ctx.strokeStyle = seg.color; ctx.lineWidth=2.6;
      ctx.setLineDash([8,8]); ctx.lineDashOffset = -(performance.now()/40)%16;
      ctx.beginPath(); ctx.moveTo(seg.from.x, seg.from.y);
      ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      ctx.restore();

      // energy bead moving along the path
      const bead = 0.85*t;
      const bx = lerp(seg.from.x, seg.to.x, bead);
      const by = lerp(seg.from.y, seg.to.y, bead);
      ctx.fillStyle = seg.color; ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI*2); ctx.fill();
    });

    // decay fully-grown links into solid lines for stability (optional)
    links = links.filter(seg => seg.progress < 1);

    // ambient particles (seasonal auras & growth motes)
    drawParticles();
    requestAnimationFrame(draw);
  }

  // ---------- Particles ----------
  function drawParticles(){
    const ctx = aura.getContext("2d");
    ctx.clearRect(0,0,aura.width,aura.height);

    // ambient seasonal
    const count = 90;
    const theme = document.body.classList.contains("winter") ? "snow"
                : document.body.classList.contains("autumn") ? "leaf"
                : document.body.classList.contains("summer") ? "mote"
                : "pollen";
    for(let i=0;i<count;i++){
      const x = (i*137 + performance.now()*0.03) % aura.width;
      const y = (i*83  + performance.now()*0.02) % aura.height;
      ctx.globalAlpha = 0.08 + (i%7)/60;
      if(theme==="snow"){
        ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.arc(x,y,1.2+(i%3)*0.3,0,Math.PI*2); ctx.fill();
      }else if(theme==="leaf"){
        ctx.fillStyle="rgba(255,200,120,.6)"; ctx.fillRect(x,y,1.2,1.2);
      }else if(theme==="mote"){
        ctx.fillStyle="rgba(255,255,200,.5)"; ctx.fillRect(x,y,1.2,1.2);
      }else{
        ctx.fillStyle="rgba(180,255,180,.45)"; ctx.fillRect(x,y,1.1,1.1);
      }
    }

    // growth particles
    particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.005; p.life--;
      ctx.globalAlpha = Math.max(0, p.life/100);
      ctx.fillStyle = p.color || "rgba(120,255,170,.8)";
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI*2); ctx.fill();
    });
    particles = particles.filter(p=>p.life>0);
    ctx.globalAlpha = 1;
  }

  // ---------- Actions ----------
  function addStructure(){
    const name = ($("#structureName").value||"").trim();
    if(!name) return alert("Name your branch.");
    const s = {id:uuid(), name, collapsed:false, goals:[]};
    data.structures.push(s); save();
    // animate root->branch growth
    const pos = positions();
    const from = {x:pos.trunk.x, y:pos.branches.length? pos.branches[0].y-40 : 140};
    const to   = {x: (canvas.width-220)/(data.structures.length||1)*(data.structures.length-0.5)+110, y:120-60};
    queueGrowth(from, {x:to.x, y:120-60}, (getComputedStyle(document.documentElement).getPropertyValue('--branch').trim() || "#38c77f"));
    renderAll();
    $("#structureName").value="";
  }

  function addGoal(){
    const sid = structSel.value;
    const s = data.structures.find(x=>x.id===sid);
    const name = ($("#goalName").value||"").trim();
    if(!s || !name) return alert("Pick a branch and name your leaf.");
    const g = {id:uuid(), name, complete:false};
    s.goals.push(g); save();
    // animate branch->leaf growth
    const pos = positions();
    const b = pos.branches.find(b=>b.id===sid);
    const from = {x:b.x, y:b.y+60};
    const gy = b.y + 150 + (s.goals.length-1)*130;
    const to = {x:b.x, y:gy-60};
    queueGrowth(from, to, (getComputedStyle(document.documentElement).getPropertyValue('--leaf-dim').trim() || "#3eb574"));
    renderAll();
    $("#goalName").value="";
  }

  function toggleLeaf(sid,gid){
    const s=data.structures.find(x=>x.id===sid); if(!s) return;
    const g=s.goals.find(x=>x.id===gid); if(!g) return;
    g.complete=!g.complete; save();
    if(g.complete) chime();
    renderAll();
  }
  function toggleCollapsed(sid){
    const s=data.structures.find(x=>x.id===sid); if(!s) return;
    s.collapsed=!s.collapsed; save(); renderAll();
  }
  function clearAll(){
    if(!confirm("Prune your whole tree? This cannot be undone.")) return;
    data={structures:[]}; save(); renderAll();
  }

  // ---------- Export PNG ----------
  function exportPNG(){
    const out=$("#exportCanvas");
    const r=canvas.getBoundingClientRect();
    out.width=r.width; out.height=r.height;
    const octx=out.getContext("2d");

    // background
    const cs = getComputedStyle(document.body);
    const g=octx.createLinearGradient(0,0,0,out.height);
    g.addColorStop(0, cs.getPropertyValue('--bg1').trim() || "#08140b");
    g.addColorStop(1, cs.getPropertyValue('--bg2').trim() || "#041006");
    octx.fillStyle=g; octx.fillRect(0,0,out.width,out.height);

    // copy current branches canvas
    octx.drawImage(canvas,0,0);

    // draw nodes (labels)
    const pos = positions();
    octx.textAlign="center"; octx.textBaseline="middle";
    octx.fillStyle=cs.getPropertyValue('--ink').trim() || "#e9ffef";
    octx.font="bold 14px system-ui,Segoe UI";
    function circle(x,y,r,stroke){
      octx.beginPath(); octx.arc(x,y,r,0,Math.PI*2); octx.strokeStyle=stroke; octx.lineWidth=2; octx.stroke();
    }
    const branchColor = cs.getPropertyValue('--branch').trim() || "#38c77f";
    const leafColor   = cs.getPropertyValue('--leaf').trim()   || "#66f0aa";
    const leafDim     = cs.getPropertyValue('--leaf-dim').trim()|| "#3eb574";

    pos.branches.forEach(b=>{ circle(b.x,b.y,75,branchColor); wrap(octx,b.name,b.x,b.y,130,18); });
    pos.leaves.forEach(l=>{ circle(l.x,l.y,55,l.complete?leafColor:leafDim); wrap(octx,l.name,l.x,l.y,110,16); });
    function wrap(ctx, text, x,y, maxW, lh){
      const words=String(text).split(/\s+/); let line="", lines=[];
      for(const w of words){ const t=line? line+" "+w : w; if(ctx.measureText(t).width<=maxW) line=t; else { lines.push(line); line=w; } }
      if(line) lines.push(line);
      const sy=y-(lines.length-1)*lh/2; lines.forEach((ln,i)=> ctx.fillText(ln,x,sy+i*lh));
    }

    const a=document.createElement("a");
    a.href=out.toDataURL("image/png"); a.download="LifeTree.png"; a.click();
  }

  // ---------- Wiring ----------
  function bindControls(){
    $("#addStructureBtn").addEventListener("click", addStructure);
    $("#addGoalBtn").addEventListener("click", addGoal);
    $("#clearAllBtn").addEventListener("click", clearAll);
    $("#exportPngBtn").addEventListener("click", exportPNG);
  }

  function renderAll(){
    // rebuild select
    structSel.innerHTML="";
    data.structures.forEach(s=>{ const o=document.createElement("option"); o.value=s.id; o.textContent=s.name; structSel.appendChild(o); });

    // lay out & render nodes
    const pos = positions();
    renderNodes(pos);

    // queue static links for any missing visuals on first render
    // (when there are no animations pending)
    if(links.length===0){
      // trunk->branches
      pos.branches.forEach(b=>{
        queueGrowth({x:pos.trunk.x, y:pos.branches[0].y-40}, {x:b.x, y:b.y-60}, (getComputedStyle(document.documentElement).getPropertyValue('--branch').trim() || "#38c77f"));
      });
      // branches->leaves
      pos.leaves.forEach(l=>{
        const bx = pos.branches.find(x=>x.id===l.sid).x, by = pos.branches.find(x=>x.id===l.sid).y;
        queueGrowth({x:bx, y:by+60}, {x:l.x, y:l.y-60}, l.complete ? (getComputedStyle(document.documentElement).getPropertyValue('--leaf').trim() || "#66f0aa") : (getComputedStyle(document.documentElement).getPropertyValue('--leaf-dim').trim() || "#3eb574"));
      });
    }
  }

  // ---------- Init ----------
  function init(){
    load(); sizeCanvases(); bindControls(); renderAll();
    addEventListener("resize", ()=>{ sizeCanvases(); renderAll(); });
    requestAnimationFrame(draw);
    // subtle aura loop
    (function auraLoop(){
      const ctx=aura.getContext("2d");
      // (already drawn per frame in drawParticles)
      requestAnimationFrame(auraLoop);
    })();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();

})();
