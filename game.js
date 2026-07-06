/* ===================== STRIKE ZONE - game.js =====================
   Modern Tactical Shooter — v3.0
   Weapon system, XP/Level, Score, Tactical HUD
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

function show(id){ 
  Object.values(screens).forEach(s=>s.classList.add('hidden')); 
  if(screens[id]) screens[id].classList.remove('hidden'); 
}

function backToMenu(){ 
  stopGame(); 
  hud.classList.add('hidden'); 
  show('menu'); 
  checkOrientation(); 
}

function showMissions(){ 
  buildMissionGrid(); 
  show('missionMenu'); 
}

function showMultiplayer(){ 
  show('mpMenu'); 
}

// ---------- MISSIONS ----------
const MISSIONS = [
  { name:'Alpha Guard', type:'eliminate', target:20, spawnRate:1400, enemySpeed:1.0, desc:'Eliminate 20 hostiles' },
  { name:'Hold The Line', type:'survive', target:60, spawnRate:1200, enemySpeed:1.15, desc:'Survive 60 seconds' },
  { name:'Perimeter Defense', type:'defend', target:3, spawnRate:1000, enemySpeed:1.2, desc:'Defend the base — 3 waves', waves:3 },
  { name:'Deep Strike', type:'eliminate', target:30, spawnRate:800, enemySpeed:1.35, desc:'Eliminate 30 hostiles' },
  { name:'Last Stand', type:'survive', target:120, spawnRate:650, enemySpeed:1.5, desc:'Survive 120 seconds' },
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

// ---------- WEAPON SYSTEM ----------
const WEAPONS = {
  'AR-X1': {
    name: 'AR-X1',
    type: 'assault',
    damage: 12,
    fireRate: 100,
    magSize: 30,
    maxAmmo: 120,
    reloadTime: 1500,
    icon: '🔫',
    color: '#00d4ff'
  },
  'SMG-9': {
    name: 'SMG-9',
    type: 'smg',
    damage: 8,
    fireRate: 60,
    magSize: 40,
    maxAmmo: 160,
    reloadTime: 1200,
    icon: '🔫',
    color: '#ff6b35'
  },
  'SNIPER-X': {
    name: 'SNIPER-X',
    type: 'sniper',
    damage: 45,
    fireRate: 400,
    magSize: 5,
    maxAmmo: 20,
    reloadTime: 2000,
    icon: '🎯',
    color: '#a855f7'
  }
};

let currentWeaponKey = 'AR-X1';
let currentWeapon = WEAPONS[currentWeaponKey];
let ammoInMag = 30;
let reserveAmmo = 90;
let isReloading = false;
let reloadTimer = 0;
let score = 0;
let level = 1;
let xp = 0;
let xpNeeded = 100;
let killCount = 0;
let comboCount = 0;
let comboTimer = 0;

function getWeaponStats() {
  return { 
    ...currentWeapon, 
    ammoInMag, 
    reserveAmmo,
    isReloading,
    maxAmmo: currentWeapon.maxAmmo,
    magSize: currentWeapon.magSize
  };
}

function reloadWeapon() {
  if (isReloading) return;
  if (ammoInMag === currentWeapon.magSize) return;
  if (reserveAmmo === 0) { toast('⚠️ NO AMMO'); return; }
  
  isReloading = true;
  reloadTimer = currentWeapon.reloadTime;
  toast('🔄 RELOADING...');
}

function updateReload(dt) {
  if (!isReloading) return;
  reloadTimer -= dt * 16.6;
  if (reloadTimer <= 0) {
    const needed = currentWeapon.magSize - ammoInMag;
    const available = Math.min(needed, reserveAmmo);
    ammoInMag += available;
    reserveAmmo -= available;
    isReloading = false;
    toast('✅ RELOAD COMPLETE');
    updateHUD();
  }
}

function canFire() {
  if (isReloading) return false;
  if (ammoInMag <= 0) {
    reloadWeapon();
    return false;
  }
  return true;
}

function consumeAmmo() {
  ammoInMag--;
  if (ammoInMag === 0) {
    setTimeout(() => reloadWeapon(), 300);
  }
  updateHUD();
}

// ---------- XP / LEVEL / SCORE ----------
function addScore(points) {
  score += points;
  xp += points;
  
  while (xp >= xpNeeded) {
    xp -= xpNeeded;
    level++;
    xpNeeded = Math.floor(xpNeeded * 1.5);
    toast(`🎉 LEVEL ${level}!`);
    // Level up bonus
    score += 50;
    // Heal on level up
    if (state && state.player) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20);
    }
  }
  updateHUD();
}

function addKill() {
  killCount++;
  comboCount++;
  comboTimer = 120; // 2 seconds to chain
  
  let bonus = 10;
  if (comboCount > 5) bonus = 25;
  if (comboCount > 10) bonus = 50;
  if (comboCount > 20) bonus = 100;
  
  addScore(10 + bonus);
  
  if (comboCount > 5) {
    toast(`🔥 ${comboCount}x COMBO! +${bonus} bonus`);
  }
}

function updateCombo() {
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer === 0) {
      if (comboCount > 3) {
        toast(`💥 ${comboCount}x combo ended`);
      }
      comboCount = 0;
    }
  }
}

// ---------- Shared game state ----------
let state = null;
let mode = null;
let rafId = null;
let paused = false;
let shakeAmount = 0;
let time = 0;
let isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

function makePlayer(x,y){
  return { 
    x, y, 
    angle: 0, 
    hp: 100, 
    maxHp: 100, 
    speed: 3.1, 
    radius: 16, 
    fireCd: 0, 
    alive: true,
    rapidUntil: 0, 
    multiUntil: 0 
  };
}

function newState(){
  return {
    player: makePlayer(innerWidth*0.3, innerHeight*0.5),
    bullets: [],
    enemies: [],
    particles: [],
    pickups: [],
    remote: null,
    remoteBullets: [],
    t0: performance.now(),
    elapsed: 0,
    kills: 0,
    wave: 1,
    missionIdx: 0,
    spawnTimer: 0,
    pickupTimer: 300,
    finished: false,
  };
}

// ---------- PICKUPS ----------
const PICKUP_TYPES = {
  health: { color: '#22ff88', label: '+30 HP', icon: '❤️' },
  rapid: { color: '#ff6b35', label: 'RAPID FIRE!', icon: '⚡' },
  multi: { color: '#ff2d95', label: 'MULTI SHOT!', icon: '💥' },
  ammo: { color: '#ffb238', label: '+AMMO', icon: '📦' }
};

function randomPickupType(){
  const keys = Object.keys(PICKUP_TYPES);
  return keys[Math.floor(Math.random()*keys.length)];
}

function applyPickup(p, type){
  const now = performance.now();
  if(type === 'health'){ 
    p.hp = Math.min(p.maxHp, p.hp + 30); 
  } else if(type === 'rapid'){ 
    p.rapidUntil = now + 8000; 
  } else if(type === 'multi'){ 
    p.multiUntil = now + 8000; 
  } else if(type === 'ammo'){ 
    reserveAmmo = Math.min(currentWeapon.maxAmmo, reserveAmmo + 30);
  }
  toast(PICKUP_TYPES[type].icon + ' ' + PICKUP_TYPES[type].label);
  updateHUD();
}

// ---------- Input ----------
const keys = {};
addEventListener('keydown', e=> keys[e.key.toLowerCase()] = true);
addEventListener('keyup', e=> keys[e.key.toLowerCase()] = false);
let mouse = {x:0,y:0,down:false};
canvas.addEventListener('mousemove', e=>{ mouse.x=e.clientX; mouse.y=e.clientY; });
canvas.addEventListener('mousedown', ()=> mouse.down=true);
addEventListener('mouseup', ()=> mouse.down=false);
addEventListener('keydown', e => { 
  if(e.key === 'r' || e.key === 'R') reloadWeapon();
  if(e.key === 'g' || e.key === 'G') throwGrenade();
  if(e.key === 'Escape' || e.key === 'p') togglePause();
});

// ---------- Touch controls ----------
const joystick = document.getElementById('joystick');
const stick = document.getElementById('stick');
const fireBtn = document.getElementById('fireBtn');
let joyVec = {x:0,y:0,active:false};
let touchFire = false;

function setupJoystick(){
  let jTouchId=null, center=null;
  joystick.addEventListener('touchstart', e=>{
    e.preventDefault();
    const t=e.changedTouches[0]; 
    jTouchId=t.identifier;
    const r=joystick.getBoundingClientRect(); 
    center={x:r.left+r.width/2,y:r.top+r.height/2};
    joyVec.active=true;
  }, {passive:false});
  
  joystick.addEventListener('touchmove', e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(t.identifier===jTouchId){
        let dx=t.clientX-center.x, dy=t.clientY-center.y;
        const max=40; 
        const d=Math.hypot(dx,dy);
        if(d>max){ dx=dx/d*max; dy=dy/d*max; }
        stick.style.left=(33+dx)+'px'; 
        stick.style.top=(33+dy)+'px';
        joyVec.x=dx/max; 
        joyVec.y=dy/max;
      }
    }
  }, {passive:false});
  
  function endJ(e){
    for(const t of e.changedTouches){ 
      if(t.identifier===jTouchId){ 
        jTouchId=null; 
        joyVec.x=0; 
        joyVec.y=0; 
        joyVec.active=false; 
        stick.style.left='33px'; 
        stick.style.top='33px'; 
      } 
    }
  }
  joystick.addEventListener('touchend', endJ);
  joystick.addEventListener('touchcancel', endJ);

  let fTouchId=null;
  fireBtn.addEventListener('touchstart', e=>{
    e.preventDefault();
    const t=e.changedTouches[0]; 
    fTouchId=t.identifier; 
    touchFire=true;
  }, {passive:false});
  fireBtn.addEventListener('touchend', e=>{ 
    touchFire=false; 
    fTouchId=null; 
  });
  fireBtn.addEventListener('touchcancel', ()=> touchFire=false);
}
setupJoystick();

// ---------- Toast ----------
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg; 
  el.style.opacity=1; 
  el.style.transition='none';
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
  // Reset weapon
  currentWeaponKey = 'AR-X1';
  currentWeapon = WEAPONS[currentWeaponKey];
  ammoInMag = currentWeapon.magSize;
  reserveAmmo = currentWeapon.maxAmmo - currentWeapon.magSize;
  score = 0;
  level = 1;
  xp = 0;
  xpNeeded = 100;
  killCount = 0;
  comboCount = 0;
  comboTimer = 0;
  isReloading = false;
  
  hud.classList.remove('hidden');
  document.getElementById('enemyBarWrap').classList.add('hidden');
  const m = MISSIONS[idx];
  document.getElementById('missionTitle').textContent = `⚡ MISSION: ${m.name}`;
  document.getElementById('objectiveText').textContent = m.desc;
  document.getElementById('weaponName').textContent = currentWeaponKey;
  document.getElementById('weaponIcon').textContent = currentWeapon.icon;
  updateHUD();
  updateWaveTag();
  show(null);
  paused=false;
  loop();
  checkOrientation();
}

function updateWaveTag(){
  const m = MISSIONS[state.missionIdx];
  let txt = '';
  if(m.type === 'eliminate') txt = `🎯 ${state.kills}/${m.target}`;
  if(m.type === 'survive') txt = `⏱ ${Math.floor(state.elapsed)}s / ${m.target}s`;
  if(m.type === 'defend') txt = `🌊 Wave ${state.wave}/${m.waves}`;
  document.getElementById('waveInfo').textContent = txt;
  document.getElementById('enemyCount').textContent = state.kills;
  document.getElementById('enemyTotal').textContent = m.type === 'eliminate' ? m.target : '?';
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
  
  // Enemy types
  const types = [
    { hp: 25, speed: 1.5, radius: 14, color: '#ff2d95', score: 10 },
    { hp: 40, speed: 1.2, radius: 16, color: '#ff6b35', score: 15 },
    { hp: 60, speed: 0.8, radius: 18, color: '#a855f7', score: 25 },
  ];
  const type = types[Math.floor(Math.random() * types.length)];
  
  const enemy = {
    x, y,
    hp: type.hp + Math.random() * 10,
    maxHp: type.hp + Math.random() * 10,
    speed: m.enemySpeed * type.speed * (1 + Math.random() * 0.3),
    radius: type.radius,
    fireCd: 60 + Math.random() * 80,
    angle: 0,
    hitFlash: 0,
    type: type,
    shootRange: 400 + Math.random() * 100
  };
  state.enemies.push(enemy);
}

function endMission(win){
  if(state.finished) return;
  state.finished = true;
  paused = true;
  const rt = document.getElementById('resultTitle');
  const rd = document.getElementById('resultDesc');
  rt.textContent = win ? '🏆 MISSION COMPLETE' : '💀 MISSION FAILED';
  rt.style.color = win ? '#22ff88' : '#ff2d95';
  rd.textContent = win ? `Score: ${score} · Level: ${level}` : 'You were eliminated. Try again.';
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
  toast(paused ? '⏸ PAUSED' : '▶ GO');
}

// ---------- Grenade ----------
let grenadeCooldown = 0;
function throwGrenade() {
  if (grenadeCooldown > 0) { toast('⏳ COOLDOWN'); return; }
  if (!state || !state.player) return;
  grenadeCooldown = 200; // frames
  
  const p = state.player;
  // Spawn grenade explosion effect
  const targets = state.mode === 'offline' ? state.enemies : [];
  targets.forEach(en => {
    const d = Math.hypot(en.x - p.x, en.y - p.y);
    if (d < 250) {
      en.hp -= 50;
      en.hitFlash = 1;
      spawnExplosion(en.x, en.y, '#ff6b35');
      if (en.hp <= 0) {
        en.dead = true;
        spawnExplosion(en.x, en.y, '#ff2d95');
        state.kills++;
        addKill();
        if (Math.random() < 0.5) {
          state.pickups.push({
            id: Math.random().toString(36).slice(2),
            x: en.x, y: en.y,
            type: randomPickupType()
          });
        }
      }
    }
  });
  // Visual feedback
  spawnExplosion(p.x, p.y, '#ff6b35');
  shakeAmount = Math.min(shakeAmount + 8, 15);
  toast('💥 GRENADE!');
  updateHUD();
}

// ---------- HUD Update ----------
function updateHUD() {
  document.getElementById('hpText').textContent = Math.round(state ? state.player.hp : 100);
  document.getElementById('ammoCurrent').textContent = ammoInMag;
  document.getElementById('ammoMax').textContent = reserveAmmo;
  document.getElementById('scoreNum').textContent = score;
  document.getElementById('levelNum').textContent = level;
  document.getElementById('xpText').textContent = `${xp}/${xpNeeded}`;
  document.getElementById('xpBar').style.width = Math.min(100, (xp / xpNeeded * 100)) + '%';
  
  // Ammo color warning
  const ammoEl = document.getElementById('ammoCurrent');
  if (ammoInMag <= 5 && ammoInMag > 0) {
    ammoEl.style.color = '#ff6b35';
  } else if (ammoInMag === 0) {
    ammoEl.style.color = '#ff2d95';
  } else {
    ammoEl.style.color = '#22ff88';
  }
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

  if(len>0.1 && Math.random() < 0.3) {
    spawnEngineTrail(p);
  }

  const target = findAutoAimTarget(p);
  if(target){
    p.angle = Math.atan2(target.y-p.y, target.x-p.x);
  } else if(len>0.1){
    p.angle = Math.atan2(dy,dx);
  }
}

function spawnEngineTrail(p) {
  for(let i=0; i<2; i++) {
    state.particles.push({
      x: p.x - Math.cos(p.angle) * 18 + (Math.random()-0.5) * 8,
      y: p.y - Math.sin(p.angle) * 18 + (Math.random()-0.5) * 8,
      vx: -Math.cos(p.angle) * (0.5 + Math.random() * 0.5),
      vy: -Math.sin(p.angle) * (0.5 + Math.random() * 0.5),
      life: 15 + Math.random() * 10,
      color: `hsla(${190 + Math.random()*30}, 100%, 60%, ${0.3 + Math.random()*0.3})`,
      size: 2 + Math.random() * 3
    });
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
  
  if(wantFire && p.fireCd<=0 && canFire()) {
    p.fireCd = rapid ? 4 : (currentWeapon.fireRate / 16.6);
    const speed = currentWeapon.type === 'sniper' ? 14 : 9;
    const angles = multi ? [p.angle-0.14, p.angle+0.14] : [p.angle];
    
    angles.forEach(a=>{
      state.bullets.push({
        x:p.x+Math.cos(a)*p.radius, 
        y:p.y+Math.sin(a)*p.radius,
        vx:Math.cos(a)*speed, 
        vy:Math.sin(a)*speed,
        owner:ownerTag, 
        life: 70,
        damage: currentWeapon.damage,
        isSniper: currentWeapon.type === 'sniper'
      });
    });
    
    consumeAmmo();
    spawnMuzzleFlash(p.x,p.y,p.angle);
    if(mode!=='offline' && netSend) netSend({t:'shot', x:p.x,y:p.y,angle:p.angle, multi});
  }
}

function spawnMuzzleFlash(x,y,angle){
  const count = currentWeapon.type === 'sniper' ? 8 : 12;
  for(let i=0; i<count; i++) {
    const a = angle + (Math.random()-0.5) * (currentWeapon.type === 'sniper' ? 0.6 : 1.2);
    const speed = 4 + Math.random() * (currentWeapon.type === 'sniper' ? 8 : 6);
    state.particles.push({
      x: x + Math.cos(angle) * 25,
      y: y + Math.sin(angle) * 25,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 8 + Math.random() * 4,
      color: `hsl(${40 + Math.random()*20}, 100%, ${60 + Math.random()*30}%)`,
      size: currentWeapon.type === 'sniper' ? 4 : 2 + Math.random() * 3
    });
  }
  shakeAmount = Math.min(shakeAmount + (currentWeapon.type === 'sniper' ? 3 : 1), 6);
}

function spawnExplosion(x,y,color){
  for(let i=0;i<25;i++){
    const a=Math.random()*Math.PI*2, sp=1+Math.random()*5;
    state.particles.push({
      x,y,
      vx:Math.cos(a)*sp,
      vy:Math.sin(a)*sp,
      life:20+Math.random()*25,
      color:color,
      size:2+Math.random()*5
    });
  }
  shakeAmount = Math.min(shakeAmount + 3, 10);
}

function updateOffline(dt){
  const m = MISSIONS[state.missionIdx];
  const p = state.player;

  updateReload(dt);
  updateCombo();
  if (grenadeCooldown > 0) grenadeCooldown--;

  movePlayer(dt,p);
  tryFire(p,'p',dt);

  state.spawnTimer -= dt * 16.6;
  const activeCap = m.type === 'defend' ? 5 + state.wave : 8 + Math.floor(state.elapsed / 30);
  if(state.spawnTimer <= 0 && state.enemies.length < activeCap){
    spawnEnemy();
    state.spawnTimer = Math.max(400, m.spawnRate - Math.floor(state.elapsed / 5));
  }

  state.enemies.forEach(en=>{
    const dx=p.x-en.x, dy=p.y-en.y, d=Math.hypot(dx,dy)||1;
    const desiredDist = 180 + Math.random() * 60;
    if(d>desiredDist){ 
      en.x += (dx/d)*en.speed*dt; 
      en.y += (dy/d)*en.speed*dt; 
    } else if(d<desiredDist-40){ 
      en.x -= (dx/d)*en.speed*0.5*dt; 
      en.y -= (dy/d)*en.speed*0.5*dt; 
    }
    en.angle = Math.atan2(dy,dx);
    en.fireCd -= dt * 16.6;
    if(en.fireCd <= 0 && d < en.shootRange){
      en.fireCd = 800 + Math.random() * 400;
      const spd = 6.4 + Math.random() * 0.5;
      state.bullets.push({
        x:en.x, y:en.y,
        vx:Math.cos(en.angle)*spd,
        vy:Math.sin(en.angle)*spd,
        owner:'e',
        life:90,
        damage: 8
      });
    }
    if(en.hitFlash > 0) en.hitFlash -= dt * 0.04;
  });

  state.bullets = state.bullets.filter(b=>{
    b.x += b.vx * dt; 
    b.y += b.vy * dt; 
    b.life -= dt;
    if(b.x < -20 || b.x > innerWidth+20 || b.y < -20 || b.y > innerHeight+20) return false;
    if(b.life <= 0) return false;
    
    if(b.owner === 'p' || b.owner === 'mp'){
      for(const en of state.enemies){
        if(Math.hypot(en.x-b.x, en.y-b.y) < en.radius){
          en.hp -= b.damage || 12;
          en.hitFlash = 1;
          spawnExplosion(b.x,b.y,'#ff6b35');
          if(en.hp <= 0){
            en.dead = true; 
            spawnExplosion(en.x,en.y,'#ff2d95');
            state.kills++;
            addKill();
            if(Math.random() < 0.4) {
              state.pickups.push({
                id: Math.random().toString(36).slice(2),
                x: en.x, y: en.y,
                type: randomPickupType()
              });
            }
          }
          return false;
        }
      }
      // Pickup collection by bullets
      for(const pu of state.pickups){
        if(Math.hypot(pu.x-b.x, pu.y-b.y) < 16){
          applyPickup(p, pu.type);
          state.pickups = state.pickups.filter(x=>x.id!==pu.id);
          return false;
        }
      }
    } else if(b.owner === 'e'){
      if(Math.hypot(p.x-b.x, p.y-b.y) < p.radius){
        p.hp -= b.damage || 8;
        spawnExplosion(b.x,b.y,'#00d4ff');
        shakeAmount = Math.min(shakeAmount + 3, 8);
        return false;
      }
    }
    return true;
  });
  
  state.enemies = state.enemies.filter(en=>!en.dead);

  // Pickups
  state.pickups = state.pickups.filter(pu=>{
    if(Math.hypot(p.x-pu.x, p.y-pu.y) < p.radius+14){
      applyPickup(p, pu.type);
      return false;
    }
    return true;
  });

  // Regeneration
  p.hp = Math.min(p.maxHp, p.hp + 0.02*dt);

  state.particles = state.particles.filter(pt=>{ 
    pt.x += pt.vx; 
    pt.y += pt.vy; 
    pt.life--; 
    return pt.life>0; 
  });

  updateHUD();
  state.elapsed = (performance.now()-state.t0)/1000;
  updateWaveTag();

  if(p.hp <= 0){ endMission(false); return; }
  if(m.type === 'eliminate' && state.kills >= m.target) endMission(true);
  if(m.type === 'survive' && state.elapsed >= m.target) endMission(true);
  if(m.type === 'defend'){
    if(state.kills >= (state.wave * 8)){
      state.wave++;
      toast(`🌊 WAVE ${state.wave}`);
      if(state.wave > m.waves) endMission(true);
    }
  }
}

// ---------- RENDERING ----------
function drawGrid(){
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0,0,innerWidth,innerHeight);
  
  time += 0.01;
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.03)';
  ctx.lineWidth = 1;
  const gap = 50;
  const offset = (time * 15) % gap;
  
  for(let x = -gap + offset; x < innerWidth + gap; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, innerHeight);
    ctx.stroke();
  }
  for(let y = -gap + offset; y < innerHeight + gap; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(innerWidth, y);
    ctx.stroke();
  }

  const gradient = ctx.createRadialGradient(
    innerWidth/2, innerHeight/2, innerWidth*0.15,
    innerWidth/2, innerHeight/2, innerWidth*0.9
  );
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, innerWidth, innerHeight);
}

function drawGlow(x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 7);
  ctx.fill();
}

function drawShip(x, y, angle, color, hpRatio, isPlayer = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  drawGlow(0, 0, isPlayer ? 35 : 25, color + '20');

  const grad = ctx.createLinearGradient(0, -15, 0, 15);
  if(isPlayer) {
    grad.addColorStop(0, '#00d4ff');
    grad.addColorStop(0.5, '#0099cc');
    grad.addColorStop(1, '#006688');
  } else {
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color + 'cc');
    grad.addColorStop(1, color + '88');
  }
  ctx.fillStyle = grad;
  ctx.shadowColor = color;
  ctx.shadowBlur = isPlayer ? 25 : 15;
  
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-8, 12);
  ctx.lineTo(-16, 6);
  ctx.lineTo(-10, 0);
  ctx.lineTo(-16, -6);
  ctx.lineTo(-8, -12);
  ctx.closePath();
  ctx.fill();

  if(isPlayer) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(6, 0, 4, 0, 7);
    ctx.fill();
  }

  if(!isPlayer && hpRatio !== undefined) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-16, -22, 32, 3);
    ctx.fillStyle = color;
    ctx.fillRect(-16, -22, 32 * Math.max(0, hpRatio), 3);
  }

  ctx.restore();

  if(isPlayer) {
    drawGlow(x - Math.cos(angle) * 20, y - Math.sin(angle) * 20, 15, 'rgba(0,212,255,0.1)');
  }
}

function render(){
  drawGrid();
  if(!state) return;
  const p = state.player;

  // Pickups
  if(state.pickups) state.pickups.forEach(pu=>{
    const c = PICKUP_TYPES[pu.type].color;
    const pulse = Math.sin(performance.now()/200 + pu.x) * 0.3 + 1;
    drawGlow(pu.x, pu.y, 25 * pulse, c + '30');
    
    ctx.save();
    ctx.shadowColor = c;
    ctx.shadowBlur = 20;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, 10 * pulse, 0, 7);
    ctx.fill();
    ctx.restore();
    
    ctx.fillStyle = '#0a0a0f';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PICKUP_TYPES[pu.type].icon, pu.x, pu.y + 1);
  });

  // Enemy bullets
  state.bullets.forEach(b=>{
    if(b.owner === 'e') {
      ctx.shadowColor = '#ff2d95';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff2d95';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  // Player bullets
  state.bullets.forEach(b=>{
    if(b.owner === 'p' || b.owner === 'mp') {
      const color = b.isSniper ? '#a855f7' : '#00d4ff';
      ctx.shadowColor = color;
      ctx.shadowBlur = b.isSniper ? 25 : 15;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.isSniper ? 5 : 4, 0, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Trail
      ctx.fillStyle = color + '30';
      ctx.beginPath();
      ctx.arc(b.x - b.vx*1.5, b.y - b.vy*1.5, b.isSniper ? 8 : 6, 0, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  // Remote bullets
  state.remoteBullets && state.remoteBullets.forEach(b=>{
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Particles
  state.particles.forEach(pt=>{
    ctx.globalAlpha = Math.max(0, pt.life/25);
    ctx.shadowColor = pt.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size || 3, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  });

  // Enemies
  state.enemies.forEach(en=> {
    const color = en.hitFlash > 0 ? '#ffffff' : (en.type ? en.type.color : '#ff2d95');
    drawShip(en.x, en.y, en.angle, color, en.hp/en.maxHp, false);
    if(en.hitFlash > 0) {
      drawGlow(en.x, en.y, 30, 'rgba(255,255,255,0.2)');
    }
  });

  // Remote player
  if(state.remote) {
    drawShip(state.remote.x, state.remote.y, state.remote.angle, '#ff6b35', state.remote.hp/100, false);
  }

  // Player
  if(p.hp>0) {
    drawShip(p.x, p.y, p.angle, '#00d4ff', 1, true);
    
    const pulse = Math.sin(performance.now()/500) * 0.5 + 1;
    ctx.strokeStyle = `rgba(0,212,255,${0.08 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30 * pulse, 0, 7);
    ctx.stroke();
  }

  // Screen shake
  if(shakeAmount > 0.1) {
    ctx.save();
    ctx.translate(
      (Math.random() - 0.5) * shakeAmount * 2,
      (Math.random() - 0.5) * shakeAmount * 2
    );
    ctx.restore();
    shakeAmount *= 0.9;
  }

  // Vignette
  const vignette = ctx.createRadialGradient(
    innerWidth/2, innerHeight/2, innerWidth*0.25,
    innerWidth/2, innerHeight/2, innerWidth*0.9
  );
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, innerWidth, innerHeight);
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

// ---------- MULTIPLAYER ----------
let peer=null, conn=null, isHost=false;

function netSend(obj){
  if(conn && conn.open){ try{ conn.send(obj); }catch(e){} }
}

function hostGame(){
  enterImmersive();
  document.getElementById('hostBtn').disabled = true;
  peer = new Peer();
  peer.on('open', id=>{
    isHost = true;
    const link = location.origin + location.pathname + '?room=' + id;
    document.getElementById('roomLink').textContent = link;
    document.getElementById('hostInfo').classList.remove('hidden');
    document.getElementById('hostStatus').textContent = '🔗 Room code: ' + id + ' — waiting for opponent...';
  });
  peer.on('connection', c=>{
    conn = c;
    conn.on('open', ()=>{
      document.getElementById('hostStatus').textContent = '⚡ Opponent connected! Starting...';
      setTimeout(()=> startMultiplayerMatch(true), 700);
    });
    attachConnHandlers();
  });
  peer.on('error', e=>{ document.getElementById('hostStatus').textContent = '❌ Error: '+e.type; });
}

function joinGame(){
  let code = document.getElementById('joinInput').value.trim();
  const match = code.match(/room=([a-zA-Z0-9-]+)/);
  if(match) code = match[1];
  if(!code){ document.getElementById('joinStatus').textContent='⚠️ Enter a room code first.'; return; }
  enterImmersive();
  document.getElementById('joinStatus').textContent='🔄 Connecting...';
  peer = new Peer();
  peer.on('open', ()=>{
    conn = peer.connect(code, {reliable:true});
    conn.on('open', ()=>{
      document.getElementById('joinStatus').textContent='⚡ Connected! Starting...';
      setTimeout(()=> startMultiplayerMatch(false), 700);
    });
    attachConnHandlers();
  });
  peer.on('error', e=>{ 
    const msg = e.type === 'peer-unavailable' ? '❌ Room not found. Check code.' : '❌ Error: '+e.type;
    document.getElementById('joinStatus').textContent = msg; 
  });
}

function attachConnHandlers(){
  conn.on('data', data=>{
    if(!state) return;
    if(data.t==='pos'){
      state.remote = state.remote || {x:0,y:0,angle:0,hp:100};
      state.remote.x=data.x; state.remote.y=data.y; state.remote.angle=data.angle; state.remote.hp=data.hp;
    } else if(data.t==='shot'){
      const speed=9;
      state.remoteBullets.push({
        x:data.x, y:data.y,
        vx:Math.cos(data.angle)*speed,
        vy:Math.sin(data.angle)*speed,
        life:70,
        damage:12
      });
    } else if(data.t==='hit'){
      state.player.hp -= data.dmg || 12;
      shakeAmount = Math.min(shakeAmount + 5, 10);
      if(state.player.hp<=0 && !state.finished) endMPMatch(false);
    } else if(data.t==='dead'){
      if(!state.finished) endMPMatch(true);
    } else if(data.t==='pickup_spawn'){
      state.pickups.push({id:data.id, x:data.x, y:data.y, type:data.type});
    } else if(data.t==='pickup_taken'){
      state.pickups = state.pickups.filter(pu=>pu.id!==data.id);
    }
  });
  conn.on('close', ()=>{ if(state && !state.finished){ toast('🔌 Opponent disconnected'); } });
}

function copyLink(){
  const txt = document.getElementById('roomLink').textContent;
  navigator.clipboard && navigator.clipboard.writeText(txt);
  toast('📋 Link copied');
}

function startMultiplayerMatch(hostSide){
  mode = hostSide ? 'mp-host' : 'mp-join';
  state = newState();
  state.player = makePlayer(hostSide?innerWidth*0.25:innerWidth*0.75, innerHeight*0.5);
  state.remote = {x:hostSide?innerWidth*0.75:innerWidth*0.25, y:innerHeight*0.5, angle:0, hp:100};
  document.getElementById('enemyBarWrap').classList.remove('hidden');
  document.getElementById('missionTitle').textContent = '⚡ MULTIPLAYER';
  document.getElementById('objectiveText').textContent = 'Eliminate your opponent';
  document.getElementById('waveInfo').textContent = '🔥 PvP';
  document.getElementById('weaponName').textContent = currentWeaponKey;
  document.getElementById('weaponIcon').textContent = currentWeapon.icon;
  hud.classList.remove('hidden');
  show(null);
  paused=false;
  loop();
  checkOrientation();
}

function updateMultiplayer(dt){
  const p = state.player;
  updateReload(dt);
  updateCombo();
  if (grenadeCooldown > 0) grenadeCooldown--;
  
  movePlayer(dt,p);
  tryFire(p,'mp',dt);

  if(isHost){
    state.pickupTimer -= dt;
    if(state.pickupTimer<=0 && state.pickups.length<2){
      state.pickupTimer = 480+Math.random()*220;
      const pu = {
        id:Math.random().toString(36).slice(2),
        x: 80+Math.random()*(innerWidth-160), 
        y: 80+Math.random()*(innerHeight-160),
        type: randomPickupType()
      };
      state.pickups.push(pu);
      netSend({t:'pickup_spawn', id:pu.id, x:pu.x, y:pu.y, type:pu.type});
    }
  }

  state.bullets = state.bullets.filter(b=>{
    b.x += b.vx*dt; 
    b.y += b.vy*dt; 
    b.life -= dt;
    if(b.x<-20||b.x>innerWidth+20||b.y<-20||b.y>innerHeight+20) return false;
    if(b.life<=0) return false;
    
    if(state.remote && Math.hypot(state.remote.x-b.x, state.remote.y-b.y) < 16){
      netSend({t:'hit', dmg: b.damage || 12});
      spawnExplosion(b.x,b.y,'#ff6b35');
      shakeAmount = Math.min(shakeAmount + 3, 8);
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
  
  state.remoteBullets = (state.remoteBullets||[]).filter(b=>{
    b.x += b.vx*dt; 
    b.y += b.vy*dt; 
    b.life -= dt;
    return b.life>0 && b.x>-20&&b.x<innerWidth+20&&b.y>-20&&b.y<innerHeight+20;
  });

  state.particles = state.particles.filter(pt=>{ 
    pt.x += pt.vx; 
    pt.y += pt.vy; 
    pt.life--; 
    return pt.life>0; 
  });

  updateHUD();
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
  rt.textContent = won ? '🏆 VICTORY' : '💀 DEFEATED';
  rt.style.color = won ? '#22ff88' : '#ff2d95';
  rd.textContent = won ? `Score: ${score} · Level: ${level}` : 'You were eliminated. Better luck next time.';
  document.getElementById('resultScreen').dataset.win='0';
  hud.classList.add('hidden');
  show('result');
}

// ---------- Fullscreen + landscape ----------
function enterImmersive(){
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
  if(req){ try{ req.call(el).catch(()=>{}); }catch(e){} }
  if(screen.orientation && screen.orientation.lock){
    screen.orientation.lock('landscape').catch(()=>{});
  }
}

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

// ---------- Auto-join ----------
window.addEventListener('load', ()=>{
  const params = new URLSearchParams(location.search);
  const room = params.get('room');
  if(room){
    showMultiplayer();
    document.getElementById('joinInput').value = room;
    setTimeout(joinGame, 400);
  }
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
});