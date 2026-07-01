/* ===================== STRIKE ZONE - game.js =====================
   Top-down shooter. Offline missions (bot AI) + Online PvP (PeerJS/WebRTC).
   No coins/currency. Pure objective-based missions.
==================================================================== */

// ---------- Canvas setup ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener('resize', resize); resize();

// ---------- Screens ----------
const screens = {
  menu: document.getElementById('menu'),
  missionMenu: document.getElementById('missionMenu'),
  mpMenu: document.getElementById('mpMenu'),
  result: document.getElementById('resultScreen'),
};
const hud = document.getElementById('hud');
function show(id){ Object.values(screens).forEach(s=>s.classList.add('hidden')); if(screens[id]) screens[id].classList.remove('hidden'); }
function backToMenu(){ stopGame(); hud.classList.add('hidden'); show('menu'); checkOrientation(); }
function showMissions(){ buildMissionGrid(); show('missionMenu'); }
function showMultiplayer(){ show('mpMenu'); }

// ---------- Missions (no currency, just objectives) ----------
const MISSIONS = [
  { name:'First Contact', type:'eliminate', target:8,  spawnRate:1600, enemySpeed:1.0, desc:'Eliminate 8 hostiles' },
  { name:'Hold The Line', type:'survive',   target:45,  spawnRate:1300, enemySpeed:1.15, desc:'Survive 45 seconds' },
  { name:'Perimeter',     type:'defend',    target:3,   spawnRate:1100, enemySpeed:1.2, desc:'Defend the beacon — 3 waves', waves:3 },
  { name:'Deep Strike',   type:'eliminate', target:16,  spawnRate:900,  enemySpeed:1.3, desc:'Eliminate 16 hostiles' },
  { name:'Last Stand',    type:'survive',   target:90,  spawnRate:750,  enemySpeed:1.4, desc:'Survive 90 seconds' },
];
function buildMissionGrid(){
  const grid = document.getElementById('missionGrid');
  grid.innerHTML='';
  MISSIONS.forEach((m,i)=>{
    const el = document.createElement('div');
    el.className='missionCard';
    el.innerHTML = `<div class="mNum">MISSION ${i+1}</div><div class="mName">${m.name}</div><div class="mDesc">${m.desc}</div>`;
    el.onclick = ()=>{ enterImmersive(); startOfflineMission(i); };
    grid.appendChild(el);
  });
}

// ---------- Shared game state ----------
let state = null; // active game state object
let mode = null;  // 'offline' | 'mp-host' | 'mp-join'
let rafId = null;
let paused = false;

function makePlayer(x,y,color){
  return { x,y, angle:0, hp:100, maxHp:100, speed:3.1, radius:16, color, fireCd:0, alive:true,
    rapidUntil:0, multiUntil:0 };
}

function newState(){
  return {
    player: makePlayer(innerWidth*0.3, innerHeight*0.5, '#39ff88'),
    bullets: [],       // {x,y,vx,vy,owner:'p'|'e'|'mp',dmg,life}
    enemies: [],        // offline bots
    particles: [],
    pickups: [],         // power-ups on the map {id,x,y,type}
    remote: null,       // opponent avatar for multiplayer
    remoteBullets: [],
    t0: performance.now(),
    elapsed: 0,
    kills: 0,
    wave: 1,
    missionIdx: 0,
    spawnTimer: 0,
    pickupTimer: 300,
    finished:false,
  };
}

const PICKUP_TYPES = {
  health: { color:'#39ff88', label:'+30 HP' },
  rapid:  { color:'#ffb238', label:'RAPID FIRE!' },
  multi:  { color:'#ff5fd6', label:'MULTI SHOT!' },
};
function randomPickupType(){
  const keys = Object.keys(PICKUP_TYPES);
  return keys[Math.floor(Math.random()*keys.length)];
}
function applyPickup(p, type){
  const now = performance.now();
  if(type==='health'){ p.hp = Math.min(p.maxHp, p.hp+30); }
  else if(type==='rapid'){ p.rapidUntil = now+8000; }
  else if(type==='multi'){ p.multiUntil = now+8000; }
  toast(PICKUP_TYPES[type].label);
}

// ---------- Input: keyboard + mouse (desktop) ----------
const keys = {};
addEventListener('keydown', e=> keys[e.key.toLowerCase()]=true);
addEventListener('keyup', e=> keys[e.key.toLowerCase()]=false);
let mouse = {x:0,y:0,down:false};
canvas.addEventListener('mousemove', e=>{ mouse.x=e.clientX; mouse.y=e.clientY; });
canvas.addEventListener('mousedown', ()=> mouse.down=true);
addEventListener('mouseup', ()=> mouse.down=false);

// ---------- Touch controls ----------
const joystick = document.getElementById('joystick');
const stick = document.getElementById('stick');
const fireBtn = document.getElementById('fireBtn');
let joyVec = {x:0,y:0,active:false};
let touchFire = false;
let isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints>0;

function setupJoystick(){
  let jTouchId=null, center=null;
  joystick.addEventListener('touchstart', e=>{
    e.preventDefault();
    const t=e.changedTouches[0]; jTouchId=t.identifier;
    const r=joystick.getBoundingClientRect(); center={x:r.left+r.width/2,y:r.top+r.height/2};
    joyVec.active=true;
  }, {passive:false});
  joystick.addEventListener('touchmove', e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(t.identifier===jTouchId){
        let dx=t.clientX-center.x, dy=t.clientY-center.y;
        const max=40; const d=Math.hypot(dx,dy);
        if(d>max){ dx=dx/d*max; dy=dy/d*max; }
        stick.style.left=(32+dx)+'px'; stick.style.top=(32+dy)+'px';
        joyVec.x=dx/max; joyVec.y=dy/max;
      }
    }
  }, {passive:false});
  function endJ(e){
    for(const t of e.changedTouches){ if(t.identifier===jTouchId){ jTouchId=null; joyVec.x=0; joyVec.y=0; joyVec.active=false; stick.style.left='32px'; stick.style.top='32px'; } }
  }
  joystick.addEventListener('touchend', endJ);
  joystick.addEventListener('touchcancel', endJ);

  let fTouchId=null;
  fireBtn.addEventListener('touchstart', e=>{
    e.preventDefault();
    const t=e.changedTouches[0]; fTouchId=t.identifier; touchFire=true;
  }, {passive:false});
  fireBtn.addEventListener('touchend', e=>{ touchFire=false; fTouchId=null; });
  fireBtn.addEventListener('touchcancel', ()=> touchFire=false);
}
setupJoystick();

// ---------- Toast ----------
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg; el.style.opacity=1; el.style.transition='none';
  requestAnimationFrame(()=>{
    el.style.transition='opacity 1.2s ease .4s';
    el.style.opacity=0;
  });
}

// ---------- Offline mission flow ----------
function startOfflineMission(idx){
  mode='offline';
  state = newState();
  state.missionIdx = idx;
  hud.classList.remove('hidden');
  document.getElementById('enemyBarWrap').classList.add('hidden');
  const m = MISSIONS[idx];
  document.getElementById('objectiveText').textContent = m.desc;
  updateWaveTag();
  show(null);
  paused=false;
  loop();
  checkOrientation();
}
function updateWaveTag(){
  const m = MISSIONS[state.missionIdx];
  let txt='';
  if(m.type==='eliminate') txt = `Eliminated ${state.kills}/${m.target}`;
  if(m.type==='survive') txt = `Time ${Math.floor(state.elapsed)}s / ${m.target}s`;
  if(m.type==='defend') txt = `Wave ${state.wave}/${m.waves}`;
  document.getElementById('waveTag').textContent = txt;
}

function spawnEnemy(){
  const m = MISSIONS[state.missionIdx];
  const edge = Math.floor(Math.random()*4);
  let x,y;
  const W=innerWidth,H=innerHeight;
  if(edge===0){x=-30;y=Math.random()*H;}
  else if(edge===1){x=W+30;y=Math.random()*H;}
  else if(edge===2){x=Math.random()*W;y=-30;}
  else {x=Math.random()*W;y=H+30;}
  state.enemies.push({x,y,hp:30,maxHp:30,speed:m.enemySpeed*(1.5+Math.random()*0.6),radius:14,fireCd:60+Math.random()*60,angle:0});
}

function endMission(win){
  if(state.finished) return;
  state.finished = true;
  paused = true;
  const rt = document.getElementById('resultTitle');
  const rd = document.getElementById('resultDesc');
  rt.textContent = win ? 'MISSION COMPLETE' : 'MISSION FAILED';
  rt.style.color = win ? 'var(--accent)' : 'var(--accent2)';
  rd.textContent = win ? 'Objective secured.' : 'You were eliminated. Try again.';
  document.getElementById('resultScreen').dataset.win = win ? '1':'0';
  hud.classList.add('hidden');
  show('result');
}
function retryOrNext(){
  const win = document.getElementById('resultScreen').dataset.win === '1';
  if(mode==='offline'){
    let idx = state.missionIdx;
    if(win && idx < MISSIONS.length-1) idx++;
    startOfflineMission(idx);
  } else {
    backToMenu();
  }
}

// ---------- Pause ----------
function togglePause(){
  if(!state || state.finished) return;
  paused = !paused;
  toast(paused?'PAUSED':'GO');
}

// ---------- Physics / update ----------
function movePlayer(dt, p){
  let dx=0, dy=0;
  if(keys['w']||keys['arrowup']) dy-=1;
  if(keys['s']||keys['arrowdown']) dy+=1;
  if(keys['a']||keys['arrowleft']) dx-=1;
  if(keys['d']||keys['arrowright']) dx+=1;
  if(joyVec.active){ dx=joyVec.x; dy=joyVec.y; }
  const len = Math.hypot(dx,dy);
  if(len>0){ dx/=len; dy/=len; }
  p.x += dx*p.speed*dt;
  p.y += dy*p.speed*dt;
  p.x = Math.max(p.radius, Math.min(innerWidth-p.radius, p.x));
  p.y = Math.max(p.radius, Math.min(innerHeight-p.radius, p.y));

  // AUTO-AIM: gun always tracks the nearest live target on its own.
  // Falls back to movement heading if nothing is around to shoot at.
  const target = findAutoAimTarget(p);
  if(target){
    p.angle = Math.atan2(target.y-p.y, target.x-p.x);
  } else if(len>0.1){
    p.angle = Math.atan2(dy,dx);
  }
}

function findAutoAimTarget(p){
  if(mode==='offline'){
    let best=null, bd=Infinity;
    state.enemies.forEach(en=>{
      const d=Math.hypot(en.x-p.x, en.y-p.y);
      if(d<bd){ bd=d; best=en; }
    });
    return best;
  } else if(state && state.remote){
    return state.remote;
  }
  return null;
}

function tryFire(p, ownerTag, dt){
  p.fireCd -= dt;
  const wantFire = mouse.down || touchFire;
  const now = performance.now();
  const rapid = p.rapidUntil > now;
  const multi = p.multiUntil > now;
  if(wantFire && p.fireCd<=0){
    p.fireCd = rapid ? 4 : 9;
    const speed = 9;
    const angles = multi ? [p.angle-0.14, p.angle+0.14] : [p.angle];
    angles.forEach(a=>{
      state.bullets.push({
        x:p.x+Math.cos(a)*p.radius, y:p.y+Math.sin(a)*p.radius,
        vx:Math.cos(a)*speed, vy:Math.sin(a)*speed,
        owner:ownerTag, life:70
      });
    });
    spawnMuzzle(p.x,p.y,p.angle);
    if(mode!=='offline' && netSend) netSend({t:'shot', x:p.x,y:p.y,angle:p.angle, multi});
  }
}

function spawnMuzzle(x,y,angle){
  for(let i=0;i<4;i++){
    state.particles.push({x:x+Math.cos(angle)*20,y:y+Math.sin(angle)*20,
      vx:Math.cos(angle)*2+((Math.random()-0.5)*2), vy:Math.sin(angle)*2+((Math.random()-0.5)*2),
      life:14, color:'#ffb238'});
  }
}
function spawnExplosion(x,y,color){
  for(let i=0;i<16;i++){
    const a=Math.random()*Math.PI*2, sp=1+Math.random()*3;
    state.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:26,color});
  }
}

function updateOffline(dt){
  const m = MISSIONS[state.missionIdx];
  const p = state.player;

  movePlayer(dt,p);
  tryFire(p,'p',dt);

  // spawn logic
  state.spawnTimer -= dt*16.6;
  const activeCap = m.type==='defend' ? 5+state.wave : 6;
  if(state.spawnTimer<=0 && state.enemies.length < activeCap){
    spawnEnemy();
    state.spawnTimer = m.spawnRate;
  }

  // enemies AI
  state.enemies.forEach(en=>{
    const dx=p.x-en.x, dy=p.y-en.y, d=Math.hypot(dx,dy)||1;
    const desiredDist = 220;
    if(d>desiredDist){ en.x += (dx/d)*en.speed*dt; en.y += (dy/d)*en.speed*dt; }
    else if(d<desiredDist-60){ en.x -= (dx/d)*en.speed*0.6*dt; en.y -= (dy/d)*en.speed*0.6*dt; }
    en.angle = Math.atan2(dy,dx);
    en.fireCd -= dt*16.6;
    if(en.fireCd<=0 && d<520){
      en.fireCd = 900+Math.random()*500;
      const spd=6.4;
      state.bullets.push({x:en.x,y:en.y,vx:Math.cos(en.angle)*spd,vy:Math.sin(en.angle)*spd,owner:'e',life:90});
    }
  });

  // bullets
  state.bullets = state.bullets.filter(b=>{
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    if(b.x<-20||b.x>innerWidth+20||b.y<-20||b.y>innerHeight+20) return false;
    if(b.life<=0) return false;
    if(b.owner==='p'){
      for(const en of state.enemies){
        if(Math.hypot(en.x-b.x,en.y-b.y) < en.radius){
          en.hp -= 12;
          spawnExplosion(b.x,b.y,'#ffb238');
          if(en.hp<=0){
            en.dead=true; spawnExplosion(en.x,en.y,'#ff3b3b'); state.kills++;
            if(Math.random()<0.6) state.pickups.push({id:Math.random().toString(36).slice(2),x:en.x,y:en.y,type:randomPickupType()});
          }
          return false;
        }
      }
    } else if(b.owner==='e'){
      if(Math.hypot(p.x-b.x,p.y-b.y) < p.radius){
        p.hp -= 8; spawnExplosion(b.x,b.y,'#39ff88');
        return false;
      }
    }
    return true;
  });
  state.enemies = state.enemies.filter(en=>!en.dead);

  // pickups — walk over to collect
  state.pickups = state.pickups.filter(pu=>{
    if(Math.hypot(p.x-pu.x, p.y-pu.y) < p.radius+14){
      applyPickup(p, pu.type);
      return false;
    }
    return true;
  });

  // slow passive regen so offline missions don't feel unwinnable, without making health trivial
  p.hp = Math.min(p.maxHp, p.hp + 0.03*dt);

  // particles
  state.particles = state.particles.filter(pt=>{ pt.x+=pt.vx; pt.y+=pt.vy; pt.life--; return pt.life>0; });

  // hp bar
  document.getElementById('hpBar').style.width = Math.max(0,p.hp)+'%';

  state.elapsed = (performance.now()-state.t0)/1000;
  updateWaveTag();

  // objective checks
  if(p.hp<=0){ endMission(false); return; }
  if(m.type==='eliminate' && state.kills>=m.target) endMission(true);
  if(m.type==='survive' && state.elapsed>=m.target) endMission(true);
  if(m.type==='defend'){
    if(state.kills >= (state.wave*6)){
      state.wave++;
      if(state.wave>m.waves) endMission(true);
    }
  }
}

// ---------- Rendering ----------
function drawGrid(){
  ctx.fillStyle='#0d1420'; ctx.fillRect(0,0,innerWidth,innerHeight);
  ctx.strokeStyle='#ffffff08'; ctx.lineWidth=1;
  const gap=44;
  for(let x=0;x<innerWidth;x+=gap){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,innerHeight); ctx.stroke(); }
  for(let y=0;y<innerHeight;y+=gap){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(innerWidth,y); ctx.stroke(); }
}
function drawShip(x,y,angle,color,hpRatio){
  ctx.save();
  ctx.translate(x,y); ctx.rotate(angle);
  ctx.shadowColor=color; ctx.shadowBlur=16;
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(18,0); ctx.lineTo(-12,10); ctx.lineTo(-6,0); ctx.lineTo(-12,-10);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // tiny hp pip
  if(hpRatio!==undefined){
    ctx.fillStyle='#00000088'; ctx.fillRect(x-16,y-28,32,4);
    ctx.fillStyle=color; ctx.fillRect(x-16,y-28,32*Math.max(0,hpRatio),4);
  }
}
function render(){
  drawGrid();
  if(!state) return;
  const p=state.player;
  // bullets
  state.bullets.forEach(b=>{
    ctx.strokeStyle = b.owner==='e'?'#ff5555':'#9fffcf';
    ctx.lineWidth=3; ctx.beginPath();
    ctx.moveTo(b.x,b.y); ctx.lineTo(b.x-b.vx*1.6,b.y-b.vy*1.6); ctx.stroke();
  });
  state.remoteBullets && state.remoteBullets.forEach(b=>{
    ctx.strokeStyle='#ff5555'; ctx.lineWidth=3; ctx.beginPath();
    ctx.moveTo(b.x,b.y); ctx.lineTo(b.x-b.vx*1.6,b.y-b.vy*1.6); ctx.stroke();
  });
  // particles
  state.particles.forEach(pt=>{
    ctx.globalAlpha = Math.max(0,pt.life/26);
    ctx.fillStyle=pt.color; ctx.beginPath(); ctx.arc(pt.x,pt.y,3,0,7); ctx.fill();
    ctx.globalAlpha=1;
  });
  // enemies (offline)
  state.enemies.forEach(en=> drawShip(en.x,en.y,en.angle,'#ff3b3b',en.hp/en.maxHp));
  // power-up pickups
  if(state.pickups) state.pickups.forEach(pu=>{
    const c = PICKUP_TYPES[pu.type].color;
    const pulse = 5+Math.sin(performance.now()/150+pu.x)*2;
    ctx.save();
    ctx.shadowColor=c; ctx.shadowBlur=18;
    ctx.fillStyle=c;
    ctx.beginPath(); ctx.arc(pu.x,pu.y,10+pulse*0.3,0,7); ctx.fill();
    ctx.restore();
  });
  // remote player (mp)
  if(state.remote) drawShip(state.remote.x,state.remote.y,state.remote.angle,'#ffb238',state.remote.hp/100);
  // player
  if(p.hp>0) drawShip(p.x,p.y,p.angle,'#39ff88');
}

// ---------- Main loop ----------
function loop(){
  if(!paused && state && !state.finished){
    if(mode==='offline') updateOffline(1);
    else updateMultiplayer(1);
  }
  render();
  rafId = requestAnimationFrame(loop);
}
function stopGame(){
  if(rafId) cancelAnimationFrame(rafId);
  rafId=null; state=null; paused=false;
  if(peer){ try{peer.destroy();}catch(e){} peer=null; conn=null; }
}

/* ===================== MULTIPLAYER (PeerJS / WebRTC) =====================
   P2P — after the initial connection is made, traffic is light (position +
   shot events only), so it stays playable on weak/unstable internet.
============================================================================ */
let peer=null, conn=null, isHost=false;

function netSend(obj){
  if(conn && conn.open){ try{ conn.send(obj); }catch(e){} }
}

function hostGame(){
  enterImmersive();
  document.getElementById('hostBtn').disabled = true;
  peer = new Peer(); // uses PeerJS free public broker
  peer.on('open', id=>{
    isHost = true;
    const link = location.origin + location.pathname + '?room=' + id;
    document.getElementById('roomLink').textContent = link;
    document.getElementById('hostInfo').classList.remove('hidden');
    document.getElementById('hostStatus').textContent = 'Room code: ' + id + ' — waiting for opponent...';
  });
  peer.on('connection', c=>{
    conn = c;
    conn.on('open', ()=>{
      document.getElementById('hostStatus').textContent = 'Opponent connected! Starting...';
      setTimeout(()=> startMultiplayerMatch(true), 700);
    });
    attachConnHandlers();
  });
  peer.on('error', e=>{ document.getElementById('hostStatus').textContent = 'Error: '+e.type; });
}

function joinGame(){
  let code = document.getElementById('joinInput').value.trim();
  // allow pasting a full link
  const match = code.match(/room=([a-zA-Z0-9-]+)/);
  if(match) code = match[1];
  if(!code){ document.getElementById('joinStatus').textContent='Enter a room code first.'; return; }
  enterImmersive();
  document.getElementById('joinStatus').textContent='Connecting...';
  peer = new Peer();
  peer.on('open', ()=>{
    conn = peer.connect(code, {reliable:true});
    conn.on('open', ()=>{
      document.getElementById('joinStatus').textContent='Connected! Starting...';
      setTimeout(()=> startMultiplayerMatch(false), 700);
    });
    attachConnHandlers();
  });
  peer.on('error', e=>{ document.getElementById('joinStatus').textContent = 'Error: '+e.type; });
}

function attachConnHandlers(){
  conn.on('data', data=>{
    if(!state) return;
    if(data.t==='pos'){
      state.remote = state.remote || {x:0,y:0,angle:0,hp:100};
      state.remote.x=data.x; state.remote.y=data.y; state.remote.angle=data.angle; state.remote.hp=data.hp;
      document.getElementById('enemyHpBar').style.width = Math.max(0,data.hp)+'%';
    } else if(data.t==='shot'){
      const speed=9;
      state.remoteBullets.push({x:data.x,y:data.y,vx:Math.cos(data.angle)*speed,vy:Math.sin(data.angle)*speed,life:70});
    } else if(data.t==='hit'){
      state.player.hp -= data.dmg;
      document.getElementById('hpBar').style.width = Math.max(0,state.player.hp)+'%';
      if(state.player.hp<=0 && !state.finished) endMPMatch(false);
    } else if(data.t==='dead'){
      if(!state.finished) endMPMatch(true);
    } else if(data.t==='pickup_spawn'){
      state.pickups.push({id:data.id, x:data.x, y:data.y, type:data.type});
    } else if(data.t==='pickup_taken'){
      state.pickups = state.pickups.filter(pu=>pu.id!==data.id);
    }
  });
  conn.on('close', ()=>{ if(state && !state.finished){ toast('Opponent disconnected'); } });
}

function copyLink(){
  const txt = document.getElementById('roomLink').textContent;
  navigator.clipboard && navigator.clipboard.writeText(txt);
  toast('Link copied');
}

function startMultiplayerMatch(hostSide){
  mode = hostSide ? 'mp-host' : 'mp-join';
  state = newState();
  state.player = makePlayer(hostSide?innerWidth*0.25:innerWidth*0.75, innerHeight*0.5, hostSide?'#39ff88':'#39ff88');
  state.remote = {x:hostSide?innerWidth*0.75:innerWidth*0.25, y:innerHeight*0.5, angle:0, hp:100};
  document.getElementById('enemyBarWrap').classList.remove('hidden');
  document.getElementById('objectiveText').textContent = 'Eliminate your opponent';
  document.getElementById('waveTag').textContent='';
  hud.classList.remove('hidden');
  show(null);
  paused=false;
  loop();
  checkOrientation();
}

function updateMultiplayer(dt){
  const p = state.player;
  movePlayer(dt,p);
  tryFire(p,'mp',dt);

  // host spawns a random power-up on the map every ~9s (bullet contact collects it)
  if(isHost){
    state.pickupTimer -= dt;
    if(state.pickupTimer<=0 && state.pickups.length<2){
      state.pickupTimer = 480+Math.random()*220;
      const pu = {id:Math.random().toString(36).slice(2),
        x: 80+Math.random()*(innerWidth-160), y: 80+Math.random()*(innerHeight-160),
        type: randomPickupType()};
      state.pickups.push(pu);
      netSend({t:'pickup_spawn', id:pu.id, x:pu.x, y:pu.y, type:pu.type});
    }
  }

  // local bullets vs remote avatar (client-side hit report) + vs power-ups
  state.bullets = state.bullets.filter(b=>{
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    if(b.x<-20||b.x>innerWidth+20||b.y<-20||b.y>innerHeight+20) return false;
    if(b.life<=0) return false;
    if(state.remote && Math.hypot(state.remote.x-b.x, state.remote.y-b.y) < 16){
      netSend({t:'hit', dmg:12});
      spawnExplosion(b.x,b.y,'#ffb238');
      return false;
    }
    for(const pu of state.pickups){
      if(Math.hypot(pu.x-b.x, pu.y-b.y) < 16){
        applyPickup(p, pu.type);
        state.pickups = state.pickups.filter(x=>x.id!==pu.id);
        netSend({t:'pickup_taken', id:pu.id});
        return false;
      }
    }
    return true;
  });
  // incoming bullets are cosmetic only (actual damage applied via 'hit' messages)
  state.remoteBullets = (state.remoteBullets||[]).filter(b=>{
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    return b.life>0 && b.x>-20&&b.x<innerWidth+20&&b.y>-20&&b.y<innerHeight+20;
  });

  state.particles = state.particles.filter(pt=>{ pt.x+=pt.vx; pt.y+=pt.vy; pt.life--; return pt.life>0; });

  document.getElementById('hpBar').style.width = Math.max(0,p.hp)+'%';

  // broadcast position ~ every frame (small payload, fine even on weak connections)
  netSend({t:'pos', x:p.x, y:p.y, angle:p.angle, hp:p.hp});

  if(p.hp<=0 && !state.finished){
    netSend({t:'dead'});
    endMPMatch(false);
  }
}

function endMPMatch(won){
  if(state.finished) return;
  state.finished = true; paused = true;
  const rt = document.getElementById('resultTitle');
  const rd = document.getElementById('resultDesc');
  rt.textContent = won ? 'VICTORY' : 'DEFEATED';
  rt.style.color = won ? 'var(--accent)' : 'var(--accent2)';
  rd.textContent = won ? 'Opponent eliminated.' : 'You were eliminated.';
  document.getElementById('resultScreen').dataset.win='0';
  hud.classList.add('hidden');
  show('result');
}

// ---------- Fullscreen + landscape lock ----------
function enterImmersive(){
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
  if(req){ try{ req.call(el).catch(()=>{}); }catch(e){} }
  if(screen.orientation && screen.orientation.lock){
    screen.orientation.lock('landscape').catch(()=>{ /* not supported in plain browser tab — overlay below covers this */ });
  }
}

// ---------- Rotate-device fallback overlay ----------
// If landscape lock isn't available (plain browser tab, not installed PWA),
// show a clear "rotate your phone" prompt instead of a broken layout.
function checkOrientation(){
  const overlay = document.getElementById('rotateOverlay');
  if(isTouchDevice && innerWidth < innerHeight && state && !state.finished){
    overlay.classList.add('show');
  } else {
    overlay.classList.remove('show');
  }
}
addEventListener('resize', checkOrientation);
addEventListener('orientationchange', checkOrientation);

// ---------- Auto-join if link had ?room= ----------
window.addEventListener('load', ()=>{
  const params = new URLSearchParams(location.search);
  const room = params.get('room');
  if(room){
    showMultiplayer();
    document.getElementById('joinInput').value = room;
    setTimeout(joinGame, 400);
  }
  // register service worker for offline play
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
});