/* ===================== STRIKE ZONE - game.js =====================
   Modern Tactical Shooter — v6.0 ULTIMATE
   Features: Permanent Coins, IP-based Username, 15 Levels, 
   Weapon-only Upgrades, Auto-Aim, Daily Missions UI, All previous features.
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

function showMissions(){ buildMissionGrid(); show('missionMenu'); }
function showMultiplayer(){ show('mpMenu'); }

// ---------- MISSIONS (15 Levels) ----------
const MISSIONS = [
  { name:'Tutorial', type:'eliminate', target:5, spawnRate:2000, enemySpeed:0.6, desc:'Tutorial — Eliminate 5 hostiles', level:1 },
  { name:'Alpha Guard', type:'eliminate', target:15, spawnRate:1600, enemySpeed:0.8, desc:'Eliminate 15 hostiles', level:2 },
  { name:'Hold The Line', type:'survive', target:45, spawnRate:1400, enemySpeed:0.9, desc:'Survive 45 seconds', level:3 },
  { name:'Perimeter Defense', type:'defend', target:2, spawnRate:1200, enemySpeed:1.0, desc:'Defend the base — 2 waves', waves:2, level:4 },
  { name:'Deep Strike', type:'eliminate', target:20, spawnRate:1100, enemySpeed:1.0, desc:'Eliminate 20 hostiles', level:5 },
  { name:'Stormfront', type:'eliminate', target:25, spawnRate:900, enemySpeed:1.1, desc:'Eliminate 25 hostiles', level:6 },
  { name:'Last Stand', type:'survive', target:60, spawnRate:800, enemySpeed:1.2, desc:'Survive 60 seconds', level:7 },
  { name:'Wave Defense', type:'defend', target:3, spawnRate:750, enemySpeed:1.25, desc:'Defend — 3 waves', waves:3, level:8 },
  { name:'Rogue Assault', type:'eliminate', target:30, spawnRate:650, enemySpeed:1.3, desc:'Eliminate 30 hostiles', level:9 },
  { name:'Deadline', type:'survive', target:75, spawnRate:600, enemySpeed:1.35, desc:'Survive 75 seconds', level:10 },
  { name:'The Gauntlet', type:'eliminate', target:40, spawnRate:500, enemySpeed:1.4, desc:'Eliminate 40 hostiles', level:11 },
  { name:'Endurance', type:'survive', target:90, spawnRate:450, enemySpeed:1.45, desc:'Survive 90 seconds', level:12 },
  { name:'Fortress Siege', type:'defend', target:4, spawnRate:400, enemySpeed:1.5, desc:'Defend — 4 waves', waves:4, level:13 },
  { name:'Black Ops', type:'eliminate', target:50, spawnRate:350, enemySpeed:1.6, desc:'Eliminate 50 hostiles', level:14 },
  { name:'Final Stand', type:'survive', target:120, spawnRate:300, enemySpeed:1.8, desc:'Survive 120 seconds', level:15 },
];

function buildMissionGrid(){
  const grid = document.getElementById('missionGrid');
  grid.innerHTML='';
  MISSIONS.forEach((m,i)=>{
    const el = document.createElement('div');
    el.className='missionCard';
    el.innerHTML = `<div class="mNum">LEVEL ${m.level}</div><div class="mName">${m.name}</div><div class="mDesc">${m.desc}</div>`;
    el.onclick = ()=>{ enterImmersive(); startOfflineMission(i); };
    grid.appendChild(el);
  });
}

// ---------- PERMANENT COINS (Score) ----------
let coins = parseInt(localStorage.getItem('strikeZone_coins')) || 0;

function addCoins(amount) {
  coins += amount;
  localStorage.setItem('strikeZone_coins', coins);
  updateHUD();
}

function spendCoins(amount) {
  if (coins < amount) return false;
  coins -= amount;
  localStorage.setItem('strikeZone_coins', coins);
  updateHUD();
  return true;
}

// ---------- IP-BASED USERNAME ----------
let playerName = localStorage.getItem('strikeZone_username');
if (!playerName) {
  // Generate IP-based name
  fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(data => {
      playerName = 'Player_' + data.ip.replace(/\./g, '');
      localStorage.setItem('strikeZone_username', playerName);
      document.getElementById('playerNameDisplay').textContent = playerName;
    })
    .catch(() => {
      playerName = 'Player_' + Math.floor(Math.random() * 9999);
      localStorage.setItem('strikeZone_username', playerName);
      document.getElementById('playerNameDisplay').textContent = playerName;
    });
} else {
  document.getElementById('playerNameDisplay').textContent = playerName;
}

// ---------- WEAPON SYSTEM ----------
const WEAPONS_LIST = [
  { id: '1', name: 'AR-X1', type: 'assault', damage: 12, fireRate: 100, magSize: 30, maxAmmo: 120, reloadTime: 1500, icon: '🔫' },
  { id: '2', name: 'SMG-9', type: 'smg', damage: 8, fireRate: 60, magSize: 40, maxAmmo: 160, reloadTime: 1200, icon: '🔫' },
  { id: '3', name: 'SNIPER-X', type: 'sniper', damage: 45, fireRate: 400, magSize: 5, maxAmmo: 20, reloadTime: 2000, icon: '🎯' },
  { id: '4', name: 'SHOTGUN', type: 'shotgun', damage: 15, fireRate: 300, magSize: 8, maxAmmo: 40, reloadTime: 1800, icon: '💥' },
];

let currentWeaponIndex = 0;
let currentWeapon = WEAPONS_LIST[0];
let ammoInMag = currentWeapon.magSize;
let reserveAmmo = currentWeapon.maxAmmo - currentWeapon.magSize;
let isReloading = false;
let reloadTimer = 0;
let score = 0;
let level = 1;
let xp = 0;
let xpNeeded = 100;
let killCount = 0;
let comboCount = 0;
let comboTimer = 0;
let winStreak = 0;
let totalWins = 0;
let totalLosses = 0;

// ---------- WEAPON-ONLY UPGRADES ----------
let weaponUpgradeLevel = parseInt(localStorage.getItem('strikeZone_weaponUpgrade')) || 0;
const UPGRADE_COST = [200, 500, 1000, 2000, 3500];

function upgradeWeapon() {
  if (weaponUpgradeLevel >= UPGRADE_COST.length) { toast('🔝 MAX UPGRADE!'); return; }
  const cost = UPGRADE_COST[weaponUpgradeLevel];
  if (!spendCoins(cost)) { toast(`❌ NEED ${cost} COINS`); return; }
  weaponUpgradeLevel++;
  localStorage.setItem('strikeZone_weaponUpgrade', weaponUpgradeLevel);
  currentWeapon.damage += 3;
  currentWeapon.fireRate = Math.max(40, currentWeapon.fireRate - 8);
  currentWeapon.magSize += 5;
  currentWeapon.maxAmmo += 20;
  ammoInMag = currentWeapon.magSize;
  reserveAmmo = currentWeapon.maxAmmo - currentWeapon.magSize;
  toast(`⬆️ WEAPON UPGRADE LVL ${weaponUpgradeLevel}!`);
  updateHUD();
}

// ---------- SPECIAL ABILITIES ----------
let abilityCooldown = 0;
let abilityActive = false;
let abilityTimer = 0;
const ABILITIES = {
  dash: { cooldown: 300, duration: 10, speed: 12 },
  shield: { cooldown: 400, duration: 120, hpRegen: 2 },
  rage: { cooldown: 500, duration: 180, damageMul: 2.5, speedMul: 1.5 }
};
let currentAbility = 'dash';

function useAbility() {
  if (abilityCooldown > 0) { toast('⏳ COOLDOWN'); return; }
  if (abilityActive) { toast('⚠️ ALREADY ACTIVE'); return; }
  if (!state || !state.player) return;
  abilityActive = true;
  abilityTimer = ABILITIES[currentAbility].duration;
  abilityCooldown = ABILITIES[currentAbility].cooldown;
  const p = state.player;
  if (currentAbility === 'dash') { p.speed = ABILITIES.dash.speed; toast('💨 DASH!'); }
  else if (currentAbility === 'shield') { p.shieldUntil = performance.now() + ABILITIES.shield.duration * 16.6; toast('🛡️ SHIELD!'); }
  else if (currentAbility === 'rage') { p.rageUntil = performance.now() + ABILITIES.rage.duration * 16.6; toast('🔥 RAGE!'); }
}

function updateAbilities(dt) {
  if (abilityCooldown > 0) abilityCooldown -= dt * 16.6;
  if (abilityActive) {
    abilityTimer -= dt * 16.6;
    if (abilityTimer <= 0) {
      abilityActive = false;
      if (currentAbility === 'dash') state.player.speed = 3.1;
      toast('⏸ ABILITY ENDED');
    }
  }
}

// ---------- COVER SYSTEM ----------
let coverObjects = [];
function spawnCovers() {
  coverObjects = [];
  const count = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    coverObjects.push({
      x: 100 + Math.random() * (innerWidth - 200),
      y: 100 + Math.random() * (innerHeight - 200),
      w: 40 + Math.random() * 60,
      h: 20 + Math.random() * 30,
      hp: 100, maxHp: 100, destroyed: false
    });
  }
}

function drawCovers() {
  coverObjects.forEach(c => {
    if (c.destroyed) return;
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.05)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 2;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    if (c.hp < c.maxHp) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff2d95';
      ctx.fillRect(c.x, c.y - 6, c.w * (c.hp / c.maxHp), 3);
    }
    ctx.restore();
  });
}

function checkCover(player) {
  let inCover = false;
  coverObjects.forEach(c => {
    if (c.destroyed) return;
    if (player.x > c.x && player.x < c.x + c.w && player.y > c.y && player.y < c.y + c.h) inCover = true;
  });
  return inCover;
}

// ---------- ENVIRONMENT HAZARDS ----------
let hazards = [];
function spawnHazards() {
  hazards = [];
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    hazards.push({
      x: 50 + Math.random() * (innerWidth - 100),
      y: 50 + Math.random() * (innerHeight - 100),
      radius: 30 + Math.random() * 40, active: true, timer: 0, damage: 10,
      type: Math.random() > 0.5 ? 'fire' : 'electric'
    });
  }
}

function drawHazards() {
  hazards.forEach(h => {
    if (!h.active) return;
    ctx.save();
    const pulse = Math.sin(performance.now() / 500 + h.x) * 0.3 + 0.7;
    const color = h.type === 'fire' ? '#ff6b35' : '#00d4ff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 30 * pulse;
    ctx.fillStyle = color + '30';
    ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * pulse, 0, 7); ctx.fill();
    ctx.fillStyle = color + '80';
    ctx.beginPath(); ctx.arc(h.x, h.y, h.radius * 0.4 * pulse, 0, 7); ctx.fill();
    ctx.restore();
  });
}

function checkHazards(player) {
  hazards.forEach(h => {
    if (!h.active) return;
    const d = Math.hypot(player.x - h.x, player.y - h.y);
    if (d < h.radius) {
      player.hp -= h.damage * 0.05;
      spawnExplosion(player.x, player.y, h.type === 'fire' ? '#ff6b35' : '#00d4ff');
      shakeAmount = Math.min(shakeAmount + 2, 6);
    }
  });
}

// ---------- ENEMY TYPES ----------
const ENEMY_TYPES = {
  grunt: { hp: 25, speed: 1.5, radius: 14, color: '#ff2d95', score: 10, behavior: 'chase', fireRate: 800 },
  tank: { hp: 60, speed: 0.8, radius: 18, color: '#a855f7', score: 25, behavior: 'tank', fireRate: 1200 },
  sniper: { hp: 20, speed: 1.2, radius: 12, color: '#00d4ff', score: 20, behavior: 'sniper', fireRate: 1500, range: 600 },
  rusher: { hp: 15, speed: 3.5, radius: 10, color: '#ff6b35', score: 15, behavior: 'rusher', fireRate: 300 },
  bomber: { hp: 30, speed: 1.8, radius: 16, color: '#ffb238', score: 30, behavior: 'bomber', fireRate: 1000 },
};

function spawnEnemy(forceBoss = false) {
  const m = MISSIONS[state.missionIdx];
  const edge = Math.floor(Math.random()*4);
  let x,y;
  const W=innerWidth,H=innerHeight;
  if(edge===0){x=-30;y=Math.random()*H;}
  else if(edge===1){x=W+30;y=Math.random()*H;}
  else if(edge===2){x=Math.random()*W;y=-30;}
  else {x=Math.random()*W;y=H+30;}
  x = Math.max(30, Math.min(W-30, x));
  y = Math.max(30, Math.min(H-30, y));
  let typeKey;
  if (forceBoss) typeKey = 'tank';
  else {
    const keys = Object.keys(ENEMY_TYPES);
    if (state.wave > 1 && state.wave % 5 === 0 && Math.random() < 0.3 && m.level >= 6) typeKey = 'tank';
    else typeKey = keys[Math.floor(Math.random() * keys.length)];
  }
  const type = ENEMY_TYPES[typeKey];
  const isBoss = typeKey === 'tank' && (forceBoss || (state.wave % 5 === 0));
  const enemy = {
    x, y,
    hp: isBoss ? type.hp * 3 : type.hp + Math.random() * 10,
    maxHp: isBoss ? type.hp * 3 : type.hp + Math.random() * 10,
    speed: m.enemySpeed * type.speed * (1 + Math.random() * 0.2),
    radius: isBoss ? type.radius * 1.5 : type.radius,
    fireCd: type.fireRate + Math.random() * 200,
    angle: 0, hitFlash: 0, type: type, behavior: type.behavior,
    shootRange: type.range || 400 + Math.random() * 100,
    spawnAnimation: 0, spawnDuration: 30, isBoss: isBoss, bossPhase: 0,
  };
  state.enemies.push(enemy);
  if (isBoss) toast(`👑 BOSS INCOMING!`);
}

// ---------- BOSS AI ----------
function updateBoss(en, dt) {
  const p = state.player;
  const dx = p.x - en.x, dy = p.y - en.y, d = Math.hypot(dx, dy) || 1;
  if (en.bossPhase === 0) {
    if (d > 250) { en.x += (dx/d) * en.speed * dt * 1.5; en.y += (dy/d) * en.speed * dt * 1.5; }
    else en.bossPhase = 1;
  } else if (en.bossPhase === 1) {
    if (d < 150) { en.x -= (dx/d) * en.speed * dt * 2; en.y -= (dy/d) * en.speed * dt * 2; }
    en.fireCd -= dt * 16.6;
    if (en.fireCd <= 0) {
      en.fireCd = 600 + Math.random() * 400;
      for (let i = -1; i <= 1; i++) {
        const angle = en.angle + i * 0.15;
        state.bullets.push({ x: en.x, y: en.y, vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8, owner: 'e', life: 90, damage: 15 });
      }
    }
  }
  en.angle = Math.atan2(dy, dx);
}

// ---------- WEAPON UPGRADE UI ----------
function addUpgradeButton() {
  // Already added in HTML
}

// ---------- ABILITY SWITCH UI ----------
function setupAbilityUI() {
  const panel = document.querySelector('.weapon-left');
  const abContainer = document.createElement('div');
  abContainer.style.cssText = `display:flex;gap:6px;margin-left:10px;pointer-events:auto;`;
  ['dash','shield','rage'].forEach(ab => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.textContent = ab.toUpperCase();
    btn.style.cssText = `border-color:rgba(0,212,255,0.2);color:#00d4ff;pointer-events:auto;font-size:8px;padding:3px 8px;`;
    btn.onclick = () => { currentAbility = ab; toast(`⚡ ${ab.toUpperCase()} SELECTED`); };
    abContainer.appendChild(btn);
  });
  const useBtn = document.createElement('button');
  useBtn.className = 'action-btn';
  useBtn.textContent = '🔥 USE';
  useBtn.style.cssText = `border-color:rgba(255,45,149,0.2);color:#ff2d95;pointer-events:auto;`;
  useBtn.onclick = useAbility;
  abContainer.appendChild(useBtn);
  panel.appendChild(abContainer);
}

// ---------- INIT NEW FEATURES ----------
function initNewFeatures() { spawnCovers(); spawnHazards(); setupAbilityUI(); }

// ---------- UPDATE PLAYER WITH ABILITIES ----------
function updatePlayerWithAbilities(dt) {
  const p = state.player;
  const now = performance.now();
  if (p.rageUntil && p.rageUntil > now) { p.damageMul = ABILITIES.rage.damageMul; p.speed = 3.1 * ABILITIES.rage.speedMul; }
  else { p.damageMul = 1; if (!abilityActive || currentAbility !== 'dash') p.speed = 3.1; }
  if (p.shieldUntil && p.shieldUntil > now) p.hp = Math.min(p.maxHp, p.hp + ABILITIES.shield.hpRegen * dt);
}

// ---------- MODIFIED FIRE FUNCTION ----------
function tryFire(p, ownerTag, dt){
  p.fireCd -= dt;
  const wantFire = mouse.down || touchFire;
  const now = performance.now();
  const rapid = p.rapidUntil > now;
  const multi = p.multiUntil > now;
  if(wantFire && p.fireCd<=0 && canFire()) {
    p.fireCd = rapid ? 4 : (currentWeapon.fireRate / 16.6);
    const speed = currentWeapon.type === 'sniper' ? 14 : 9;
    let angles = [p.angle];
    if (multi) { const spread = 0.06; angles = [p.angle - spread, p.angle + spread]; }
    angles.forEach(a=>{
      const damage = currentWeapon.damage * (p.damageMul || 1);
      state.bullets.push({
        x:p.x+Math.cos(a)*p.radius, y:p.y+Math.sin(a)*p.radius,
        vx:Math.cos(a)*speed, vy:Math.sin(a)*speed,
        owner:ownerTag, life:70, damage:damage, isSniper: currentWeapon.type === 'sniper',
      });
    });
    consumeAmmo();
    spawnMuzzleFlash(p.x,p.y,p.angle);
    playSound('shoot');
    if(mode!=='offline' && netSend) netSend({t:'shot', x:p.x,y:p.y,angle:p.angle, multi});
  }
}

// ---------- UPDATED OFFLINE UPDATE ----------
function updateOffline(dt){
  const m = MISSIONS[state.missionIdx];
  const p = state.player;

  updateReload(dt);
  updateCombo();
  if (grenadeCooldown > 0) grenadeCooldown--;
  updateAbilities(dt);
  updatePlayerWithAbilities(dt);

  checkHazards(p);
  const inCover = checkCover(p);
  if (inCover) p.hp = Math.min(p.maxHp, p.hp + 0.05 * dt);

  movePlayer(dt,p);
  tryFire(p,'p',dt);

  state.spawnTimer -= dt * 16.6;
  const activeCap = m.type === 'defend' ? 5 + state.wave : 8 + Math.floor(state.elapsed / 30);
  if(state.spawnTimer <= 0 && state.enemies.length < activeCap){
    const isBossWave = state.wave > 1 && state.wave % 5 === 0;
    spawnEnemy(isBossWave && Math.random() < 0.4 && m.level >= 6);
    state.spawnTimer = Math.max(400, m.spawnRate - Math.floor(state.elapsed / 5));
  }

  state.enemies.forEach(en=>{
    if (en.isBoss) { updateBoss(en, dt); return; }
    const dx=p.x-en.x, dy=p.y-en.y, d=Math.hypot(dx,dy)||1;
    const desiredDist = 180 + Math.random() * 60;
    switch(en.behavior) {
      case 'rusher': if (d > 50) { en.x += (dx/d)*en.speed*dt*1.8; en.y += (dy/d)*en.speed*dt*1.8; } break;
      case 'sniper':
        if (d > en.shootRange) { en.x += (dx/d)*en.speed*dt; en.y += (dy/d)*en.speed*dt; }
        else if (d < en.shootRange - 100) { en.x -= (dx/d)*en.speed*0.3*dt; en.y -= (dy/d)*en.speed*0.3*dt; }
        break;
      case 'bomber':
        if (d < 300 && d > 100) { en.x += (dx/d)*en.speed*dt; en.y += (dy/d)*en.speed*dt; }
        else if (d < 100) { spawnExplosion(en.x, en.y, '#ffb238'); p.hp -= 30; shakeAmount = Math.min(shakeAmount + 8, 15); en.dead = true; toast('💥 BOMBER EXPLODED!'); }
        break;
      default: if(d>desiredDist){ en.x += (dx/d)*en.speed*dt; en.y += (dy/d)*en.speed*dt; } else if(d<desiredDist-40){ en.x -= (dx/d)*en.speed*0.5*dt; en.y -= (dy/d)*en.speed*0.5*dt; }
    }
    en.angle = Math.atan2(dy,dx);
    en.fireCd -= dt * 16.6;
    if(en.fireCd <= 0 && d < en.shootRange){
      en.fireCd = en.type.fireRate + Math.random() * 400;
      const spd = 6.4 + Math.random() * 0.5;
      state.bullets.push({ x:en.x, y:en.y, vx:Math.cos(en.angle)*spd, vy:Math.sin(en.angle)*spd, owner:'e', life:90, damage: en.isBoss ? 15 : 8 });
    }
    if(en.hitFlash > 0) en.hitFlash -= dt * 0.04;
    if (en.spawnAnimation < 1) en.spawnAnimation = Math.min(1, en.spawnAnimation + 0.05);
  });

  state.bullets = state.bullets.filter(b=>{
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if(b.x < -20 || b.x > innerWidth+20 || b.y < -20 || b.y > innerHeight+20) return false;
    if(b.life <= 0) return false;
    for (const c of coverObjects) {
      if (c.destroyed) continue;
      if (b.x > c.x && b.x < c.x + c.w && b.y > c.y && b.y < c.y + c.h) {
        c.hp -= b.damage || 5; if (c.hp <= 0) c.destroyed = true;
        spawnExplosion(b.x, b.y, '#2a2a4a'); return false;
      }
    }
    if(b.owner === 'p' || b.owner === 'mp'){
      for(const en of state.enemies){
        if(Math.hypot(en.x-b.x, en.y-b.y) < en.radius){
          en.hp -= b.damage || 12; en.hitFlash = 1; spawnExplosion(b.x,b.y,'#ff6b35');
          showDamageNumber(b.x, b.y - 20, `-${Math.round(b.damage)}`, '#ff2d95');
          if(en.hp <= 0){
            en.dead = true; spawnExplosion(en.x,en.y,'#ff2d95', 60, 8);
            state.kills++; addKill(); onKill();
            if (en.isBoss) { addCoins(100); toast('👑 BOSS DEFEATED! +100 COINS'); showDamageNumber(en.x, en.y - 40, '+100', '#ffb238', 40); }
            if(Math.random() < 0.4) { state.pickups.push({ id: Math.random().toString(36).slice(2), x: en.x, y: en.y, type: randomPickupType() }); }
          }
          return false;
        }
      }
      for(const pu of state.pickups){
        if(Math.hypot(pu.x-b.x, pu.y-b.y) < 16){ applyPickup(p, pu.type); state.pickups = state.pickups.filter(x=>x.id!==pu.id); return false; }
      }
    } else if(b.owner === 'e'){
      if(Math.hypot(p.x-b.x, p.y-b.y) < p.radius){
        const now = performance.now();
        const damage = (p.shieldUntil && p.shieldUntil > now) ? (b.damage || 8) * 0.3 : (b.damage || 8);
        p.hp -= damage; spawnExplosion(b.x,b.y,'#00d4ff'); showDamageNumber(p.x, p.y - 40, `-${Math.round(damage)}`, '#00d4ff');
        shakeAmount = Math.min(shakeAmount + 3, 8); return false;
      }
    }
    return true;
  });
  state.enemies = state.enemies.filter(en=>!en.dead);
  state.pickups = state.pickups.filter(pu=>{ if(Math.hypot(p.x-pu.x, p.y-pu.y) < p.radius+14){ applyPickup(p, pu.type); return false; } return true; });
  p.hp = Math.min(p.maxHp, p.hp + 0.02*dt);
  state.particles = state.particles.filter(pt=>{ pt.x += pt.vx; pt.y += pt.vy; pt.life--; return pt.life>0; });
  updateHUD();
  state.elapsed = (performance.now()-state.t0)/1000;
  updateWaveTag();

  if(p.hp <= 0){ endMission(false); return; }
  if(m.type === 'eliminate' && state.kills >= m.target) endMission(true);
  if(m.type === 'survive' && state.elapsed >= m.target) endMission(true);
  if(m.type === 'defend'){
    if(state.kills >= (state.wave * 8)){
      state.wave++; toast(`🌊 WAVE ${state.wave}`); spawnCovers(); changeWeather();
      if(state.wave > m.waves) endMission(true);
    }
  }
}

// ---------- RENDER EXTENSIONS ----------
function render(){
  drawGrid(); drawAnimatedBg(); drawWeather();
  if(!state) return;
  const p = state.player;
  drawMiniMap(); drawCovers(); drawHazards();

  if(state.pickups) state.pickups.forEach(pu=>{
    const c = PICKUP_TYPES[pu.type].color;
    const pulse = Math.sin(performance.now()/200 + pu.x) * 0.3 + 1;
    drawGlow(pu.x, pu.y, 25 * pulse, c + '30');
    ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 20; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(pu.x, pu.y, 10 * pulse, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#0a0a0f'; ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(PICKUP_TYPES[pu.type].icon, pu.x, pu.y + 1);
  });

  state.bullets.forEach(b=>{
    if(b.owner === 'e') { ctx.shadowColor = '#ff2d95'; ctx.shadowBlur = 12; ctx.fillStyle = '#ff2d95'; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
  });
  state.bullets.forEach(b=>{
    if(b.owner === 'p' || b.owner === 'mp') {
      const color = b.isSniper ? '#a855f7' : '#00d4ff';
      ctx.shadowColor = color; ctx.shadowBlur = b.isSniper ? 25 : 15; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(b.x, b.y, b.isSniper ? 5 : 4, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = color + '30'; ctx.beginPath(); ctx.arc(b.x - b.vx*1.5, b.y - b.vy*1.5, b.isSniper ? 8 : 6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    }
  });
  state.remoteBullets && state.remoteBullets.forEach(b=>{ ctx.shadowColor = '#ff6b35'; ctx.shadowBlur = 12; ctx.fillStyle = '#ff6b35'; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill(); ctx.shadowBlur = 0; });

  drawParticles();

  state.enemies.forEach(en=> {
    if (en.spawnAnimation < 1) {
      const progress = en.spawnAnimation; ctx.save(); ctx.translate(en.x, en.y); ctx.scale(progress, progress);
      const color = en.hitFlash > 0 ? '#ffffff' : (en.type ? en.type.color : '#ff2d95');
      drawShip(0, 0, en.angle, color, en.hp/en.maxHp, false); ctx.restore();
      drawGlow(en.x, en.y, 30 * (1 - progress), '#00d4ff20');
    } else {
      const color = en.hitFlash > 0 ? '#ffffff' : (en.type ? en.type.color : '#ff2d95');
      if (en.isBoss) drawGlow(en.x, en.y, 50, '#ffb23830');
      drawShip(en.x, en.y, en.angle, color, en.hp/en.maxHp, false);
      if(en.hitFlash > 0) drawGlow(en.x, en.y, 30, 'rgba(255,255,255,0.2)');
    }
  });

  if(state.remote) drawShip(state.remote.x, state.remote.y, state.remote.angle, '#ff6b35', state.remote.hp/100, false);

  if(p.hp>0) {
    const now = performance.now();
    if (p.rageUntil && p.rageUntil > now) drawGlow(p.x, p.y, 60, '#ff2d9530');
    drawShip(p.x, p.y, p.angle, '#00d4ff', 1, true);
    const pulse = Math.sin(performance.now()/500) * 0.5 + 1;
    ctx.strokeStyle = `rgba(0,212,255,${0.08 * pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 30 * pulse, 0, 7); ctx.stroke();
  }

  if (mode !== 'offline') { drawLighting(); applyBloom(); }

  if(shakeAmount > 0.1) {
    ctx.save(); ctx.translate((Math.random() - 0.5) * shakeAmount * 2, (Math.random() - 0.5) * shakeAmount * 2); ctx.restore();
    shakeAmount *= 0.9;
  }

  const vignette = ctx.createRadialGradient(innerWidth/2, innerHeight/2, innerWidth*0.25, innerWidth/2, innerHeight/2, innerWidth*0.9);
  vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, innerWidth, innerHeight);
}

// ---------- START MISSION WITH FEATURES ----------
function startOfflineMission(idx){
  mode='offline';
  state = newState();
  state.missionIdx = idx;
  resetWeapon();
  // Apply weapon upgrade stats
  for(let i=0; i<weaponUpgradeLevel; i++) {
    currentWeapon.damage += 3;
    currentWeapon.fireRate = Math.max(40, currentWeapon.fireRate - 8);
    currentWeapon.magSize += 5;
    currentWeapon.maxAmmo += 20;
  }
  ammoInMag = currentWeapon.magSize;
  reserveAmmo = currentWeapon.maxAmmo - currentWeapon.magSize;
  
  initNewFeatures(); initVisuals();
  
  hud.classList.remove('hidden');
  const enemyBar = document.getElementById('enemyBarWrap');
  if (enemyBar) enemyBar.style.display = 'none';
  
  const m = MISSIONS[idx];
  document.getElementById('missionTitle').textContent = `⚡ LEVEL ${m.level}: ${m.name}`;
  document.getElementById('objectiveText').textContent = m.desc;
  document.getElementById('weaponName').textContent = currentWeapon.name;
  document.getElementById('weaponIcon').textContent = currentWeapon.icon;
  document.getElementById('offlineResultBtns').style.display = 'flex';
  document.getElementById('multiplayerResultBtns').style.display = 'none';
  updateWeaponButtons();
  updateHUD(); updateDailyUI(); updateProgressionUI();
  updateWaveTag();
  show(null);
  paused=false;
  loop();
  checkOrientation();
}

// ---------- EXISTING UNCHANGED FUNCTIONS ----------
function getWeaponStats() { return { ...currentWeapon, ammoInMag, reserveAmmo, isReloading, maxAmmo: currentWeapon.maxAmmo, magSize: currentWeapon.magSize }; }
function resetWeapon() {
  currentWeaponIndex = 0; currentWeapon = WEAPONS_LIST[0]; ammoInMag = currentWeapon.magSize; reserveAmmo = currentWeapon.maxAmmo - currentWeapon.magSize; isReloading = false; reloadTimer = 0; score = 0; level = 1; xp = 0; xpNeeded = 100; killCount = 0; comboCount = 0; comboTimer = 0; winStreak = 0; updateWeaponButtons(); updateHUD();
}
function reloadWeapon() { if (isReloading) return; if (ammoInMag === currentWeapon.magSize) return; if (reserveAmmo === 0) { toast('⚠️ NO AMMO'); return; } isReloading = true; reloadTimer = currentWeapon.reloadTime; toast('🔄 RELOADING...'); }
function updateReload(dt) { if (!isReloading) return; reloadTimer -= dt * 16.6; if (reloadTimer <= 0) { const needed = currentWeapon.magSize - ammoInMag; const available = Math.min(needed, reserveAmmo); ammoInMag += available; reserveAmmo -= available; isReloading = false; toast('✅ RELOAD COMPLETE'); updateHUD(); } }
function canFire() { if (isReloading) return false; if (ammoInMag <= 0) { reloadWeapon(); return false; } return true; }
function consumeAmmo() { ammoInMag--; if (ammoInMag === 0) setTimeout(() => reloadWeapon(), 300); updateHUD(); }
function addScore(points) { score += points; xp += points; while (xp >= xpNeeded) { xp -= xpNeeded; level++; xpNeeded = Math.floor(xpNeeded * 1.5); toast(`🎉 LEVEL ${level}!`); addCoins(50); if (state && state.player) state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20); } updateHUD(); }
function addKill() { killCount++; comboCount++; comboTimer = 120; let bonus = 10; if (comboCount > 5) bonus = 25; if (comboCount > 10) bonus = 50; if (comboCount > 20) bonus = 100; addScore(10 + bonus); addCoins(10 + bonus); if (comboCount > 5) toast(`🔥 ${comboCount}x COMBO! +${bonus} bonus`); updateDailyProgress('kills'); }
function updateCombo() { if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) { if (comboCount > 3) toast(`💥 ${comboCount}x combo ended`); comboCount = 0; } } }

let state = null; let mode = null; let rafId = null; let paused = false; let shakeAmount = 0; let time = 0; let isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

function makePlayer(x,y){ return { x, y, angle: 0, hp: 100, maxHp: 100, speed: 3.1, radius: 16, fireCd: 0, alive: true, rapidUntil: 0, multiUntil: 0, shieldUntil: 0, speedUntil: 0, rageUntil: 0, damageMul: 1, baseDamage: 12, baseSpeed: 3.1 }; }
function newState(){ return { player: makePlayer(innerWidth*0.3, innerHeight*0.5), bullets: [], enemies: [], particles: [], pickups: [], remote: null, remoteBullets: [], t0: performance.now(), elapsed: 0, kills: 0, wave: 1, missionIdx: 0, spawnTimer: 0, pickupTimer: 300, finished: false, }; }

// ---------- PICKUPS ----------
const PICKUP_TYPES = {
  health: { color: '#22ff88', label: '+30 HP', icon: '❤️', duration: 0 },
  rapid: { color: '#ff6b35', label: 'RAPID FIRE!', icon: '⚡', duration: 8000 },
  multi: { color: '#ff2d95', label: 'MULTI SHOT!', icon: '💥', duration: 8000 },
  ammo: { color: '#ffb238', label: '+AMMO', icon: '📦', duration: 0 },
  shield: { color: '#00d4ff', label: 'SHIELD!', icon: '🛡️', duration: 5000 },
  speed: { color: '#a855f7', label: 'SPEED!', icon: '💨', duration: 5000 },
  nuke: { color: '#ff2d95', label: '💀 NUKE!', icon: '☢️', duration: 0 }
};
function randomPickupType(){ const keys = Object.keys(PICKUP_TYPES); return keys[Math.floor(Math.random()*keys.length)]; }
function applyPickup(p, type) { const now = performance.now(); switch(type) { case 'health': p.hp = Math.min(p.maxHp, p.hp + 30); break; case 'rapid': p.rapidUntil = now + 8000; break; case 'multi': p.multiUntil = now + 8000; break; case 'ammo': reserveAmmo = Math.min(currentWeapon.maxAmmo, reserveAmmo + 30); break; case 'shield': p.shieldUntil = now + 5000; break; case 'speed': p.speedUntil = now + 5000; p.speed = 4.5; break; case 'nuke': state.enemies.forEach(en => { en.hp = 0; spawnExplosion(en.x, en.y, '#ff2d95'); addKill(); }); state.enemies = []; toast('☢️ NUKE! All enemies eliminated!'); break; } toast(PICKUP_TYPES[type].icon + ' ' + PICKUP_TYPES[type].label); updateHUD(); }

// ---------- Input ----------
const keys = {}; 
addEventListener('keydown', e=> keys[e.key.toLowerCase()] = true); 
addEventListener('keyup', e=> keys[e.key.toLowerCase()] = false);
let mouse = {x:0,y:0,down:false}; 
canvas.addEventListener('mousemove', e=>{ mouse.x=e.clientX; mouse.y=e.clientY; }); 
canvas.addEventListener('mousedown', ()=> mouse.down=true); 
addEventListener('mouseup', ()=> mouse.down=false);

// ---------- Keyboard Shortcuts ----------
addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '4') switchWeapon(e.key);
  if (e.key === 'r' || e.key === 'R') reloadWeapon();
  if (e.key === 'g' || e.key === 'G') throwGrenade();
  if (e.key === 'Escape' || e.key === 'p') togglePause();
  if (e.key === 't' || e.key === 'T') toggleChat();
  if (e.key === 'x' || e.key === 'X' || e.key === 'k' || e.key === 'K') toggleSpectator();
  if (e.key === 'r' && e.key === 'R' && e.ctrlKey) { startReplay(); e.preventDefault(); }
});

function switchWeapon(key) { const index = parseInt(key) - 1; if (index >= 0 && index < WEAPONS_LIST.length) { currentWeaponIndex = index; currentWeapon = WEAPONS_LIST[index]; ammoInMag = currentWeapon.magSize; reserveAmmo = currentWeapon.maxAmmo - currentWeapon.magSize; isReloading = false; document.getElementById('weaponName').textContent = currentWeapon.name; document.getElementById('weaponIcon').textContent = currentWeapon.icon; updateWeaponButtons(); toast(`🔫 ${currentWeapon.name}`); updateHUD(); } }
function setupWeaponButtons() { const btns = document.querySelectorAll('.weapon-btn'); btns.forEach((btn, index) => { btn.addEventListener('click', () => { switchWeapon(String(index + 1)); }); }); }
function updateWeaponButtons() { const btns = document.querySelectorAll('.weapon-btn'); btns.forEach((btn, index) => { btn.classList.toggle('active', index === currentWeaponIndex); }); }

// ---------- Touch controls ----------
const joystick = document.getElementById('joystick'); const stick = document.getElementById('stick'); const fireBtn = document.getElementById('fireBtn');
let joyVec = {x:0,y:0,active:false}; let touchFire = false;
function setupJoystick(){
  let jTouchId=null, center=null;
  joystick.addEventListener('touchstart', e=>{ e.preventDefault(); const t=e.changedTouches[0]; jTouchId=t.identifier; const r=joystick.getBoundingClientRect(); center={x:r.left+r.width/2,y:r.top+r.height/2}; joyVec.active=true; }, {passive:false});
  joystick.addEventListener('touchmove', e=>{ e.preventDefault(); for(const t of e.changedTouches){ if(t.identifier===jTouchId){ let dx=t.clientX-center.x, dy=t.clientY-center.y; const max=40; const d=Math.hypot(dx,dy); if(d>max){ dx=dx/d*max; dy=dy/d*max; } stick.style.left=(33+dx)+'px'; stick.style.top=(33+dy)+'px'; joyVec.x=dx/max; joyVec.y=dy/max; } } }, {passive:false});
  function endJ(e){ for(const t of e.changedTouches){ if(t.identifier===jTouchId){ jTouchId=null; joyVec.x=0; joyVec.y=0; joyVec.active=false; stick.style.left='33px'; stick.style.top='33px'; } } }
  joystick.addEventListener('touchend', endJ); joystick.addEventListener('touchcancel', endJ);
  let fTouchId=null; fireBtn.addEventListener('touchstart', e=>{ e.preventDefault(); const t=e.changedTouches[0]; fTouchId=t.identifier; touchFire=true; }, {passive:false});
  fireBtn.addEventListener('touchend', e=>{ touchFire=false; fTouchId=null; }); fireBtn.addEventListener('touchcancel', ()=> touchFire=false);
}
setupJoystick();

// ---------- Toast ----------
function toast(msg){ const el = document.getElementById('toast'); el.textContent = msg; el.style.opacity=1; el.style.transition='none'; requestAnimationFrame(()=>{ el.style.transition='opacity 1.2s ease .4s'; el.style.opacity=0; }); }

function updateWaveTag(){ const m = MISSIONS[state.missionIdx]; let txt = ''; if(m.type === 'eliminate') txt = `🎯 ${state.kills}/${m.target}`; if(m.type === 'survive') txt = `⏱ ${Math.floor(state.elapsed)}s / ${m.target}s`; if(m.type === 'defend') txt = `🌊 Wave ${state.wave}/${m.waves}`; document.getElementById('waveInfo').textContent = txt; document.getElementById('enemyCount').textContent = state.kills; document.getElementById('enemyTotal').textContent = m.type === 'eliminate' ? m.target : '?'; }

function endMission(win){ if(state.finished) return; state.finished = true; paused = true; const rt = document.getElementById('resultTitle'); const rd = document.getElementById('resultDesc'); rt.textContent = win ? '🏆 MISSION COMPLETE' : '💀 MISSION FAILED'; rt.style.color = win ? '#22ff88' : '#ff2d95'; rd.textContent = win ? `Coins: ${coins} · Level: ${level}` : 'You were eliminated. Try again.'; document.getElementById('resultScreen').dataset.win = win ? '1':'0'; document.getElementById('offlineResultBtns').style.display = 'flex'; document.getElementById('multiplayerResultBtns').style.display = 'none'; hud.classList.add('hidden'); show('result'); updateDailyProgress('wins', win?1:0); }

function retryOrNext(){ const win = document.getElementById('resultScreen').dataset.win === '1'; if(mode==='offline'){ let idx = state.missionIdx; if(win && idx < MISSIONS.length-1) idx++; startOfflineMission(idx); } else { backToMenu(); } }
function togglePause(){ if(!state || state.finished) return; paused = !paused; toast(paused ? '⏸ PAUSED' : '▶ GO'); }

// ---------- Grenade ----------
let grenadeCooldown = 0;
function throwGrenade() { if (grenadeCooldown > 0) { toast('⏳ COOLDOWN'); return; } if (!state || !state.player) return; grenadeCooldown = 200; const p = state.player; const targets = state.mode === 'offline' ? state.enemies : []; targets.forEach(en => { const d = Math.hypot(en.x - p.x, en.y - p.y); if (d < 250) { en.hp -= 50; en.hitFlash = 1; spawnExplosion(en.x, en.y, '#ff6b35'); if (en.hp <= 0) { en.dead = true; spawnExplosion(en.x, en.y, '#ff2d95'); state.kills++; addKill(); if (Math.random() < 0.5) { state.pickups.push({ id: Math.random().toString(36).slice(2), x: en.x, y: en.y, type: randomPickupType() }); } } } }); spawnExplosion(p.x, p.y, '#ff6b35'); shakeAmount = Math.min(shakeAmount + 8, 15); toast('💥 GRENADE!'); updateHUD(); }

// ---------- HUD Update ----------
function updateHUD() {
  document.getElementById('hpText').textContent = Math.round(state ? state.player.hp : 100);
  document.getElementById('ammoCurrent').textContent = ammoInMag;
  document.getElementById('ammoMax').textContent = reserveAmmo;
  document.getElementById('scoreNum').textContent = coins; // Show permanent coins
  document.getElementById('levelNum').textContent = level;
  document.getElementById('xpText').textContent = `${xp}/${xpNeeded}`;
  document.getElementById('xpBar').style.width = Math.min(100, (xp / xpNeeded * 100)) + '%';
  document.getElementById('coinsDisplay').textContent = coins;
  document.getElementById('weaponUpgradeLevelDisplay').textContent = weaponUpgradeLevel;
  const ammoEl = document.getElementById('ammoCurrent');
  if (ammoInMag <= 5 && ammoInMag > 0) ammoEl.style.color = '#ff6b35';
  else if (ammoInMag === 0) ammoEl.style.color = '#ff2d95';
  else ammoEl.style.color = '#22ff88';
}

// ---------- Physics / update ----------
function movePlayer(dt, p){
  let dx=0, dy=0;
  if(keys['w']||keys['arrowup']) dy-=1; if(keys['s']||keys['arrowdown']) dy+=1;
  if(keys['a']||keys['arrowleft']) dx-=1; if(keys['d']||keys['arrowright']) dx+=1;
  if(joyVec.active){ dx=joyVec.x; dy=joyVec.y; }
  const len = Math.hypot(dx,dy); if(len>0){ dx/=len; dy/=len; }
  p.x += dx*p.speed*dt; p.y += dy*p.speed*dt;
  const margin = p.radius + 5; p.x = Math.max(margin, Math.min(innerWidth - margin, p.x)); p.y = Math.max(margin, Math.min(innerHeight - margin, p.y));
  if(len>0.1 && Math.random() < 0.3) spawnEngineTrail(p);
  const target = findAutoAimTarget(p);
  if(target) p.angle = Math.atan2(target.y-p.y, target.x-p.x);
  else if(len>0.1) p.angle = Math.atan2(dy,dx);
}

function spawnEngineTrail(p) { for(let i=0; i<2; i++) { state.particles.push({ x: p.x - Math.cos(p.angle) * 18 + (Math.random()-0.5) * 8, y: p.y - Math.sin(p.angle) * 18 + (Math.random()-0.5) * 8, vx: -Math.cos(p.angle) * (0.5 + Math.random() * 0.5), vy: -Math.sin(p.angle) * (0.5 + Math.random() * 0.5), life: 15 + Math.random() * 10, color: `hsla(${190 + Math.random()*30}, 100%, 60%, ${0.3 + Math.random()*0.3})`, size: 2 + Math.random() * 3 }); } }
function findAutoAimTarget(p){ if(mode==='offline'){ let best=null, bd=Infinity; state.enemies.forEach(en=>{ const d=Math.hypot(en.x-p.x, en.y-p.y); if(d<bd){ bd=d; best=en; } }); return best; } else if(state && state.remote){ return state.remote; } return null; }
function spawnMuzzleFlash(x,y,angle){ const count = currentWeapon.type === 'sniper' ? 8 : 12; for(let i=0; i<count; i++) { const a = angle + (Math.random()-0.5) * (currentWeapon.type === 'sniper' ? 0.6 : 1.2); const speed = 4 + Math.random() * (currentWeapon.type === 'sniper' ? 8 : 6); state.particles.push({ x: x + Math.cos(angle) * 25, y: y + Math.sin(angle) * 25, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 8 + Math.random() * 4, color: `hsl(${40 + Math.random()*20}, 100%, ${60 + Math.random()*30}%)`, size: currentWeapon.type === 'sniper' ? 4 : 2 + Math.random() * 3 }); } shakeAmount = Math.min(shakeAmount + (currentWeapon.type === 'sniper' ? 3 : 1), 6); }
function spawnExplosion(x,y,color){ for(let i=0;i<25;i++){ const a=Math.random()*Math.PI*2, sp=1+Math.random()*5; state.particles.push({ x,y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:20+Math.random()*25, color:color, size:2+Math.random()*5 }); } shakeAmount = Math.min(shakeAmount + 3, 10); }

// ---------- Main loop ----------
function loop(){
  if(!paused && state && !state.finished){
    if(mode==='offline') updateOffline(1);
    else updateMultiplayer(1);
    if (performanceMode && frameCounter % 2 === 0) render();
    else render();
  }
  rafId = requestAnimationFrame(loop);
}

function stopGame(){ if(rafId) cancelAnimationFrame(rafId); rafId=null; state=null; paused=false; if(peer){ try{peer.destroy();}catch(e){} peer=null; conn=null; } }

// ============================================================
// MULTIPLAYER
// ============================================================

let peer=null, conn=null, isHost=false;

function updateWinStreak(won) { if (won) { winStreak++; totalWins++; toast(`🔥 ${winStreak}x WIN STREAK!`); } else { winStreak = 0; totalLosses++; toast('💔 Streak broken'); } }

// ===== PLAY AGAIN =====
let rematchRequested = false; let rematchAccepted = false; let rematchTimer = null;
function requestRematch() { if (!conn || !conn.open) { toast('❌ Not connected'); return; } if (rematchRequested) { toast('⏳ Already requested rematch'); return; } rematchRequested = true; netSend({ t: 'rematch_request' }); toast('📨 Rematch request sent!'); showRematchWaiting(); }
function showRematchWaiting() { const overlay = document.createElement('div'); overlay.id = 'rematchOverlay'; overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;`; overlay.innerHTML = `<div style="color:#00d4ff;font-size:28px;margin-bottom:10px;">⏳ WAITING</div><div style="color:#6b7b9a;font-size:14px;margin-bottom:20px;">Waiting for opponent to accept rematch...</div><div style="color:#6b7b9a;font-size:12px;"><span id="rematchSpinner" style="display:inline-block;">⚡</span></div><button onclick="cancelRematch()" class="btn" style="margin-top:20px;min-width:200px;">❌ Cancel</button>`; document.body.appendChild(overlay); let dots = 0; rematchTimer = setInterval(() => { const spinner = document.getElementById('rematchSpinner'); if (spinner) { dots = (dots + 1) % 4; spinner.textContent = '⚡' + '.'.repeat(dots); } }, 500); }
function cancelRematch() { rematchRequested = false; rematchAccepted = false; if (rematchTimer) { clearInterval(rematchTimer); rematchTimer = null; } const overlay = document.getElementById('rematchOverlay'); if (overlay) overlay.remove(); toast('❌ Rematch cancelled'); }
function showRematchRequest() { const overlay = document.createElement('div'); overlay.id = 'rematchRequestOverlay'; overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;`; overlay.innerHTML = `<div style="color:#ff6b35;font-size:24px;margin-bottom:10px;">🔄 REMATCH REQUEST</div><div style="color:#e8f0ff;font-size:14px;margin-bottom:20px;">Your opponent wants to play again!</div><div style="color:#ff6b35;font-size:12px;margin-bottom:15px;">🔥 Win Streak: ${winStreak}</div><div style="display:flex;gap:10px;"><button onclick="acceptRematch()" class="btn primary" style="min-width:120px;">✅ Accept</button><button onclick="declineRematch()" class="btn danger" style="min-width:120px;">❌ Decline</button></div>`; document.body.appendChild(overlay); }
function acceptRematch() { const overlay = document.getElementById('rematchRequestOverlay'); if (overlay) overlay.remove(); rematchAccepted = true; netSend({ t: 'rematch_accept' }); toast('✅ Rematch accepted! Starting...'); resetWeapon(); setTimeout(() => startMultiplayerMatch(!isHost), 500); }
function declineRematch() { const overlay = document.getElementById('rematchRequestOverlay'); if (overlay) overlay.remove(); netSend({ t: 'rematch_decline' }); toast('❌ Rematch declined'); }
function handleRematchData(data) { if (data.t === 'rematch_request') showRematchRequest(); else if (data.t === 'rematch_accept') { rematchAccepted = true; const overlay = document.getElementById('rematchOverlay'); if (overlay) overlay.remove(); toast('✅ Opponent accepted! Starting...'); resetWeapon(); setTimeout(() => startMultiplayerMatch(isHost), 500); } else if (data.t === 'rematch_decline') { const overlay = document.getElementById('rematchOverlay'); if (overlay) overlay.remove(); rematchRequested = false; toast('❌ Opponent declined rematch'); } }

// ---------- NETWORK ----------
function netSend(obj){ if(conn && conn.open){ try{ conn.send(obj); }catch(e){} } }

function hostGame() {
  enterImmersive(); document.getElementById('hostBtn').disabled = true; document.getElementById('hostStatus').textContent = '🔧 Creating room...';
  peer = new Peer(undefined, { debug: 2, config: { 'iceServers': [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun2.l.google.com:19302' } ] } });
  peer.on('open', id => { isHost = true; const link = location.origin + location.pathname + '?room=' + id; document.getElementById('roomLink').textContent = link; document.getElementById('hostInfo').classList.remove('hidden'); document.getElementById('hostStatus').textContent = '🔗 Room code: ' + id + ' — waiting for opponent...'; toast('✅ Room created! Share the link.'); });
  peer.on('connection', c => { conn = c; conn.on('open', () => { document.getElementById('hostStatus').textContent = '⚡ Opponent connected! Starting...'; toast('✅ Opponent joined!'); resetWeapon(); setTimeout(() => startMultiplayerMatch(true), 700); }); attachConnHandlers(); });
  peer.on('error', e => { console.error('Peer error:', e); let msg = '❌ Error: ' + e.type; if (e.type === 'unavailable-id') msg = '❌ Room creation failed. Try again.'; if (e.type === 'network') msg = '❌ Network error. Check connection.'; document.getElementById('hostStatus').textContent = msg; document.getElementById('hostBtn').disabled = false; });
}

function joinGame() {
  let code = document.getElementById('joinInput').value.trim();
  const match = code.match(/room=([a-zA-Z0-9-]+)/); if (match) code = match[1];
  if (!code) { document.getElementById('joinStatus').textContent = '⚠️ Enter a room code first.'; return; }
  enterImmersive(); document.getElementById('joinStatus').textContent = '🔄 Connecting...';
  peer = new Peer(undefined, { debug: 2, config: { 'iceServers': [ { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun2.l.google.com:19302' } ] } });
  peer.on('open', () => { let attempts = 0; const maxAttempts = 3; function tryConnect() { attempts++; document.getElementById('joinStatus').textContent = `🔄 Connecting attempt ${attempts}/${maxAttempts}...`; conn = peer.connect(code, { reliable: true }); conn.on('open', () => { document.getElementById('joinStatus').textContent = '⚡ Connected! Starting...'; toast('✅ Connected to host!'); resetWeapon(); setTimeout(() => startMultiplayerMatch(false), 700); }); attachConnHandlers(); setTimeout(() => { if (!conn || !conn.open) { if (attempts < maxAttempts) { document.getElementById('joinStatus').textContent = `⏳ Retrying... (${attempts}/${maxAttempts})`; tryConnect(); } else { document.getElementById('joinStatus').textContent = '❌ Connection failed. Check room code.'; } } }, 3000); } tryConnect(); });
  peer.on('error', e => { console.error('Peer error:', e); let msg = '❌ Error: ' + e.type; if (e.type === 'peer-unavailable') msg = '❌ Room not found. Check code.'; if (e.type === 'network') msg = '❌ Network error. Check connection.'; document.getElementById('joinStatus').textContent = msg; });
}

function attachConnHandlers() {
  conn.on('data', data => {
    if (!state) return;
    if (data.t === 'rematch_request' || data.t === 'rematch_accept' || data.t === 'rematch_decline') { handleRematchData(data); return; }
    if (data.t === 'pos') { state.remote = state.remote || { x: 0, y: 0, angle: 0, hp: 100 }; state.remote.x = data.x; state.remote.y = data.y; state.remote.angle = data.angle; state.remote.hp = data.hp; document.getElementById('enemyHpBar').style.width = Math.max(0, data.hp) + '%'; }
    else if (data.t === 'shot') { const speed = 9; state.remoteBullets.push({ x: data.x, y: data.y, vx: Math.cos(data.angle) * speed, vy: Math.sin(data.angle) * speed, life: 70, damage: 12 }); }
    else if (data.t === 'hit') { state.player.hp -= data.dmg || 12; shakeAmount = Math.min(shakeAmount + 5, 10); if (state.player.hp <= 0 && !state.finished) endMPMatch(false); }
    else if (data.t === 'dead') { if (!state.finished) endMPMatch(true); }
    else if (data.t === 'pickup_spawn') { state.pickups.push({ id: data.id, x: data.x, y: data.y, type: data.type }); }
    else if (data.t === 'pickup_taken') { state.pickups = state.pickups.filter(pu => pu.id !== data.id); }
    else if (data.t === 'chat') { chatMessages.push(data.msg); updateChatUI(); }
    else if (data.t === 'friend_request') { addFriend(data.id, data.name); }
  });
  conn.on('close', () => { if (state && !state.finished) { toast('🔌 Opponent disconnected'); showReconnectOption(); } });
}

function showReconnectOption() { const overlay = document.createElement('div'); overlay.id = 'reconnectOverlay'; overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.9);backdrop-filter:blur(10px);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;`; overlay.innerHTML = `<div style="color:#ff6b35;font-size:28px;margin-bottom:10px;">🔌 DISCONNECTED</div><div style="color:#6b7b9a;font-size:14px;margin-bottom:20px;">Connection lost. Try reconnecting?</div><button onclick="reconnectGame()" class="btn primary" style="min-width:200px;">🔄 RECONNECT</button><button onclick="backToMenu()" class="btn" style="min-width:200px;margin-top:10px;">← MAIN MENU</button>`; document.body.appendChild(overlay); }
function reconnectGame() { const overlay = document.getElementById('reconnectOverlay'); if (overlay) overlay.remove(); if (conn && !conn.open) { toast('🔄 Reconnecting...'); const roomCode = document.getElementById('joinInput')?.value || ''; if (roomCode) { conn = peer.connect(roomCode); attachConnHandlers(); setTimeout(() => { if (conn && conn.open) toast('✅ Reconnected!'); else toast('❌ Reconnect failed. Try again.'); }, 3000); } } }
function copyLink() { const linkText = document.getElementById('roomLink').textContent; if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(linkText).then(() => toast('✅ Link copied!')).catch(() => fallbackCopy(linkText)); } else { fallbackCopy(linkText); } }
function fallbackCopy(text) { const input = document.createElement('input'); input.value = text; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.appendChild(input); input.select(); try { document.execCommand('copy'); toast('✅ Link copied!'); } catch (err) { toast('❌ Copy failed. Select link manually.'); } document.body.removeChild(input); }

function startMultiplayerMatch(hostSide) {
  mode = hostSide ? 'mp-host' : 'mp-join';
  state = newState();
  state.player = makePlayer(hostSide ? innerWidth*0.25 : innerWidth*0.75, innerHeight*0.5);
  state.remote = { x: hostSide ? innerWidth*0.75 : innerWidth*0.25, y: innerHeight*0.5, angle: 0, hp: 100 };
  document.getElementById('enemyBarWrap').style.display = 'block';
  document.getElementById('enemyHpBar').style.width = '100%';
  document.getElementById('missionTitle').textContent = '⚡ MULTIPLAYER';
  document.getElementById('objectiveText').textContent = 'Eliminate your opponent';
  document.getElementById('waveInfo').textContent = '🔥 PvP';
  document.getElementById('weaponName').textContent = currentWeapon.name;
  document.getElementById('weaponIcon').textContent = currentWeapon.icon;
  document.getElementById('offlineResultBtns').style.display = 'none';
  document.getElementById('multiplayerResultBtns').style.display = 'flex';
  const streakDisplay = document.getElementById('streakDisplay'); if (streakDisplay) streakDisplay.textContent = winStreak > 0 ? `🔥 ${winStreak}x` : '';
  updateWeaponButtons(); hud.classList.remove('hidden'); show(null); paused = false; loop(); checkOrientation();
}

function updateMultiplayer(dt) {
  const p = state.player; updateReload(dt); updateCombo(); if (grenadeCooldown > 0) grenadeCooldown--;
  movePlayer(dt, p); tryFire(p, 'mp', dt);
  if (isHost) {
    state.pickupTimer -= dt;
    if (state.pickupTimer <= 0 && state.pickups.length < 2) {
      state.pickupTimer = 480 + Math.random() * 220;
      const pu = { id: Math.random().toString(36).slice(2), x: 80 + Math.random() * (innerWidth - 160), y: 80 + Math.random() * (innerHeight - 160), type: randomPickupType() };
      state.pickups.push(pu); netSend({ t: 'pickup_spawn', id: pu.id, x: pu.x, y: pu.y, type: pu.type });
    }
  }
  state.bullets = state.bullets.filter(b => {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.x < -20 || b.x > innerWidth + 20 || b.y < -20 || b.y > innerHeight + 20) return false;
    if (b.life <= 0) return false;
    if (state.remote && Math.hypot(state.remote.x - b.x, state.remote.y - b.y) < 16) { netSend({ t: 'hit', dmg: b.damage || 12 }); spawnExplosion(b.x, b.y, '#ff6b35'); shakeAmount = Math.min(shakeAmount + 3, 8); return false; }
    for (const pu of state.pickups) { if (Math.hypot(pu.x - b.x, pu.y - b.y) < 16) { applyPickup(p, pu.type); state.pickups = state.pickups.filter(x => x.id !== pu.id); netSend({ t: 'pickup_taken', id: pu.id }); return false; } }
    return true;
  });
  state.remoteBullets = (state.remoteBullets || []).filter(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; return b.life > 0 && b.x > -20 && b.x < innerWidth + 20 && b.y > -20 && b.y < innerHeight + 20; });
  state.particles = state.particles.filter(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.life--; return pt.life > 0; });
  updateHUD(); netSend({ t: 'pos', x: p.x, y: p.y, angle: p.angle, hp: p.hp });
  if (p.hp <= 0 && !state.finished) { netSend({ t: 'dead' }); endMPMatch(false); }
}

function endMPMatch(won) {
  if (state.finished) return; state.finished = true; paused = true;
  updateWinStreak(won);
  const rt = document.getElementById('resultTitle'); const rd = document.getElementById('resultDesc');
  rt.textContent = won ? '🏆 VICTORY' : '💀 DEFEATED'; rt.style.color = won ? '#22ff88' : '#ff2d95';
  let streakText = winStreak > 0 ? ` 🔥 ${winStreak}x STREAK` : '';
  rd.textContent = won ? `Coins: ${coins} · Level: ${level}${streakText}` : `You were eliminated. Better luck next time.`;
  document.getElementById('offlineResultBtns').style.display = 'none';
  document.getElementById('multiplayerResultBtns').style.display = 'flex';
  document.getElementById('resultScreen').dataset.win = '0';
  hud.classList.add('hidden'); show('result');
}

// ============================================================
// DAILY MISSIONS, ACHIEVEMENTS, SKINS, PROGRESSION UI
// ============================================================

let dailyMissions = JSON.parse(localStorage.getItem('strikeZone_daily')) || {};
const DAILY_MISSIONS = [
  { id: 'daily_kill', name: 'Kill 10 enemies', target: 10, type: 'kills', reward: 50 },
  { id: 'daily_win', name: 'Win 1 mission', target: 1, type: 'wins', reward: 75 },
  { id: 'daily_headshot', name: 'Get 5 headshots', target: 5, type: 'headshots', reward: 60 },
];
function resetDailyMissions() {
  const today = new Date().toDateString();
  if (dailyMissions.date !== today) {
    dailyMissions = { date: today, missions: DAILY_MISSIONS.map(m => ({ ...m, progress: 0, completed: false })) };
    localStorage.setItem('strikeZone_daily', JSON.stringify(dailyMissions));
  }
}
resetDailyMissions();
function updateDailyProgress(type, amount = 1) {
  dailyMissions.missions.forEach(m => {
    if (m.type === type && !m.completed) {
      m.progress = Math.min(m.target, m.progress + amount);
      if (m.progress >= m.target) { m.completed = true; addCoins(m.reward); toast(`📅 DAILY COMPLETE: ${m.name}! +${m.reward} COINS`); }
    }
  });
  localStorage.setItem('strikeZone_daily', JSON.stringify(dailyMissions)); updateDailyUI();
}
function updateDailyUI() {
  const list = document.getElementById('dailyMissionListFull');
  if (list) list.innerHTML = dailyMissions.missions.map(m => 
    `<div class="mission-item"><span>${m.completed ? '✅' : '⏳'} ${m.name}</span><span class="progress">${m.progress}/${m.target} ${m.completed ? ' (+'+m.reward+'💰)' : ''}</span></div>`
  ).join('');
}

const ACHIEVEMENTS = [
  { id: 'first_kill', name: 'First Blood', desc: 'Get your first kill', check: () => killCount >= 1, reward: 50 },
  { id: 'kill_50', name: 'Killer Instinct', desc: 'Kill 50 enemies', check: () => killCount >= 50, reward: 200 },
  { id: 'survive_60', name: 'Survivor', desc: 'Survive 60 seconds', check: () => state && state.elapsed >= 60, reward: 150 },
  { id: 'combo_10', name: 'Combo Master', desc: 'Reach 10x combo', check: () => comboCount >= 10, reward: 300 },
  { id: 'win_10', name: 'Champion', desc: 'Win 10 missions', check: () => totalWins >= 10, reward: 500 },
  { id: 'perfect_run', name: 'Perfect Run', desc: 'Complete a mission without taking damage', check: () => { if (!state || state.finished) return false; const p = state.player; return p.hp === p.maxHp && state.kills > 0; }, reward: 1000 },
];
let unlockedAchievements = JSON.parse(localStorage.getItem('strikeZone_achievements')) || [];
function checkAchievements() {
  ACHIEVEMENTS.forEach(ach => {
    if (!unlockedAchievements.includes(ach.id) && ach.check()) {
      unlockedAchievements.push(ach.id); localStorage.setItem('strikeZone_achievements', JSON.stringify(unlockedAchievements)); addCoins(ach.reward);
      toast(`🏆 ACHIEVEMENT: ${ach.name}! +${ach.reward} COINS`); showAnnouncement(`🏆 ${ach.name}`);
    }
  });
}
function updateProgressionUI() {
  const achList = document.getElementById('achievementList');
  if (achList) achList.innerHTML = ACHIEVEMENTS.map(a => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${unlockedAchievements.includes(a.id) ? '✅' : '⬜'} ${a.name} — ${a.desc} ${unlockedAchievements.includes(a.id) ? `(+${a.reward}💰)` : ''}</div>`).join('');
  // Skins (if any)
  const skinList = document.getElementById('skinList');
  if (skinList) skinList.innerHTML = 'Skins coming soon!';
}

// ============================================================
// EXTRA FEATURES: CHAT, SPECTATOR, REPLAY, PERFORMANCE
// ============================================================

let chatMessages = []; let chatOpen = false;
function initChatUI() { const chatContainer = document.getElementById('chatContainer'); chatContainer.innerHTML = `<div id="chatMessages" style="flex:1;overflow-y:auto;color:#e8f0ff;font-size:12px;font-family:monospace;margin-bottom:8px;"></div><div style="display:flex;gap:6px;"><input id="chatInput" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px;color:#fff;font-size:12px;" placeholder="Type..."><button id="chatSend" class="action-btn reload-btn" style="padding:6px 12px;">SEND</button></div>`; document.getElementById('chatSend').onclick = sendChatMessage; document.getElementById('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMessage(); }); }
function sendChatMessage() { const input = document.getElementById('chatInput'); if (!input.value.trim()) return; const msg = input.value.trim(); input.value = ''; const username = isHost ? 'Host' : playerName; const fullMsg = `${username}: ${msg}`; chatMessages.push(fullMsg); updateChatUI(); if (conn && conn.open) netSend({ t: 'chat', msg: fullMsg }); }
function updateChatUI() { const container = document.getElementById('chatMessages'); if (!container) return; container.innerHTML = chatMessages.map(m => `<div>${m}</div>`).join(''); container.scrollTop = container.scrollHeight; }
function toggleChat() { chatOpen = !chatOpen; document.getElementById('chatContainer').style.display = chatOpen ? 'flex' : 'none'; if (chatOpen) document.getElementById('chatInput').focus(); }

let spectatorMode = false;
function toggleSpectator() { if (mode === 'offline') { toast('⛔ Spectator mode only available in Multiplayer'); return; } spectatorMode = !spectatorMode; if (state) state.player.spectating = spectatorMode; toast(spectatorMode ? '👁️ SPECTATOR MODE ON' : '👁️ SPECTATOR MODE OFF'); }

let replayFrames = []; let isReplaying = false; let replayIndex = 0;
function recordFrame() { if (!state || isReplaying) return; replayFrames.push({ time: performance.now(), player: { x: state.player.x, y: state.player.y, angle: state.player.angle }, bullets: state.bullets.map(b => ({ ...b })), enemies: state.enemies.map(e => ({ ...e })), kills: state.kills, hp: state.player.hp }); if (replayFrames.length > 1800) replayFrames.shift(); }
function startReplay() { if (replayFrames.length < 10) return toast('⚠️ Not enough data'); isReplaying = true; replayIndex = 0; toast('▶️ REPLAY STARTED'); paused = true; }
function stopReplay() { isReplaying = false; paused = false; toast('⏹️ REPLAY ENDED'); }

let gestureActive = false; let gestureStartX = 0, gestureStartY = 0; let gestureAngle = 0;
canvas.addEventListener('touchstart', e => { if (e.touches.length === 1 && !joystick.contains(e.target) && !fireBtn.contains(e.target)) { gestureActive = true; gestureStartX = e.touches[0].clientX; gestureStartY = e.touches[0].clientY; } }, { passive: true });
canvas.addEventListener('touchmove', e => { if (gestureActive && e.touches.length === 1) { const dx = e.touches[0].clientX - gestureStartX; const dy = e.touches[0].clientY - gestureStartY; gestureAngle = Math.atan2(dy, dx); if (state && state.player) state.player.angle = gestureAngle; } }, { passive: true });
canvas.addEventListener('touchend', () => { gestureActive = false; }, { passive: true });

let performanceMode = false; let frameCounter = 0;
function togglePerformanceMode() { performanceMode = !performanceMode; toast(performanceMode ? '⚡ PERFORMANCE MODE ON (30fps)' : '⚡ PERFORMANCE MODE OFF'); }
let batterySaver = false; let batteryLevel = 1.0;
if (navigator.getBattery) { navigator.getBattery().then(batt => { batteryLevel = batt.level; batt.addEventListener('levelchange', () => { batteryLevel = batt.level; if (batteryLevel < 0.2 && !batterySaver) { batterySaver = true; togglePerformanceMode(); toast('🔋 BATTERY SAVER ACTIVATED'); } }); }); }
function toggleBatterySaver() { batterySaver = !batterySaver; if (batterySaver) { togglePerformanceMode(); toast('🔋 BATTERY SAVER ON'); } else { toast('🔋 BATTERY SAVER OFF'); } }

// ============================================================
// AUDIO SYSTEM
// ============================================================
let audioCtx = null; let masterVolume = 0.6;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playSound(type) { initAudio(); if (!audioCtx) return; try { const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination); gain.gain.value = masterVolume * 0.3; switch(type) { case 'shoot': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.05); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05); osc.start(); osc.stop(audioCtx.currentTime + 0.05); break; case 'explosion': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3); gain.gain.value = masterVolume * 0.5; gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3); osc.start(); osc.stop(audioCtx.currentTime + 0.3); break; case 'kill': osc.type = 'square'; osc.frequency.setValueAtTime(600, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1); gain.gain.value = masterVolume * 0.4; gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1); osc.start(); osc.stop(audioCtx.currentTime + 0.1); break; case 'powerup': osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15); gain.gain.value = masterVolume * 0.3; gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); osc.start(); osc.stop(audioCtx.currentTime + 0.15); break; default: break; } } catch(e) {} }
let musicOsc = null; let musicGain = null; let musicPlaying = false;
function startMusic() { initAudio(); if (!audioCtx || musicPlaying) return; musicPlaying = true; try { musicOsc = audioCtx.createOscillator(); musicGain = audioCtx.createGain(); musicOsc.connect(musicGain); musicGain.connect(audioCtx.destination); musicOsc.type = 'sine'; musicOsc.frequency.setValueAtTime(110, audioCtx.currentTime); musicGain.gain.value = masterVolume * 0.08; musicOsc.start(); let noteTime = audioCtx.currentTime + 2; scheduleNote(noteTime); } catch(e) {} }
function scheduleNote(time) { if (!musicPlaying) return; try { const baseFreq = 110; const notes = [0, 4, 7, 12, 7, 4]; const idx = Math.floor((time - audioCtx.currentTime) / 0.5) % notes.length; musicOsc.frequency.setValueAtTime(baseFreq * Math.pow(2, notes[idx]/12), time); setTimeout(() => { if (musicPlaying) scheduleNote(audioCtx.currentTime + 0.5); }, 500); } catch(e) {} }
function stopMusic() { musicPlaying = false; if (musicOsc) try { musicOsc.stop(); } catch(e) {} musicOsc = null; musicGain = null; }
function playVoiceLine(type) { initAudio(); if (!audioCtx) return; try { const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination); gain.gain.value = masterVolume * 0.2; osc.type = 'square'; switch(type) { case 'mission_start': osc.frequency.setValueAtTime(523, audioCtx.currentTime); osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.15); osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.3); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5); osc.start(); osc.stop(audioCtx.currentTime + 0.5); break; case 'kill_streak': osc.frequency.setValueAtTime(880, audioCtx.currentTime); osc.frequency.setValueAtTime(1047, audioCtx.currentTime + 0.1); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25); osc.start(); osc.stop(audioCtx.currentTime + 0.25); break; case 'game_over': osc.frequency.setValueAtTime(330, audioCtx.currentTime); osc.frequency.setValueAtTime(277, audioCtx.currentTime + 0.2); osc.frequency.setValueAtTime(220, audioCtx.currentTime + 0.4); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6); osc.start(); osc.stop(audioCtx.currentTime + 0.6); break; default: break; } } catch(e) {} }
const originalToast = toast; toast = function(msg) { originalToast(msg); if (msg.includes('BOSS')) playSound('explosion'); if (msg.includes('LEVEL')) playSound('powerup'); if (msg.includes('COMBO')) playSound('kill'); if (msg.includes('VICTORY')) playVoiceLine('mission_start'); if (msg.includes('FAILED')) playVoiceLine('game_over'); };

// ============================================================
// VISUAL FEATURES (Lighting, Weather, Bloom, Stars)
// ============================================================
let lightSources = [];
function initLights() { lightSources = []; lightSources.push({ x: innerWidth/2, y: innerHeight/2, radius: Math.max(innerWidth, innerHeight) * 0.8, color: 'rgba(255,255,255,0.02)' }); if (state && state.player) lightSources.push({ x: state.player.x, y: state.player.y, radius: 150, color: 'rgba(0,212,255,0.15)' }); }
function drawLighting() { if (mode === 'offline') return; ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0,0,innerWidth,innerHeight); ctx.globalCompositeOperation = 'destination-out'; lightSources.forEach(l => { const grad = ctx.createRadialGradient(l.x,l.y,0,l.x,l.y,l.radius); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.6)'); grad.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(l.x, l.y, l.radius, 0, 7); ctx.fill(); }); ctx.globalCompositeOperation = 'source-over'; ctx.restore(); }
const WEATHERS = ['clear','rain','fog','snow','night']; let currentWeather = 'clear'; let weatherParticles = [];
function changeWeather() { const idx = Math.floor(Math.random() * WEATHERS.length); currentWeather = WEATHERS[idx]; document.getElementById('weatherIndicator').textContent = currentWeather.toUpperCase(); toast(`🌦️ Weather: ${currentWeather.toUpperCase()}`); }
function initWeather() { weatherParticles = []; const count = currentWeather === 'rain' ? 300 : currentWeather === 'snow' ? 150 : 50; for(let i=0;i<count;i++) { weatherParticles.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, speed: 2 + Math.random() * 4, size: 2 + Math.random() * 3, opacity: 0.3 + Math.random() * 0.5 }); } }
function drawWeather() { if (currentWeather === 'clear') return; ctx.save(); if (currentWeather === 'fog') { const grad = ctx.createRadialGradient(innerWidth/2, innerHeight/2, innerWidth*0.1, innerWidth/2, innerHeight/2, innerWidth*0.9); grad.addColorStop(0, 'rgba(200,210,220,0)'); grad.addColorStop(0.5, 'rgba(200,210,220,0.1)'); grad.addColorStop(1, 'rgba(200,210,220,0.3)'); ctx.fillStyle = grad; ctx.fillRect(0,0,innerWidth,innerHeight); } weatherParticles.forEach(p => { ctx.globalAlpha = p.opacity; if (currentWeather === 'rain') { ctx.strokeStyle = 'rgba(180,200,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 2, p.y + 15); ctx.stroke(); p.y += p.speed * 1.8; p.x -= 1; } else if (currentWeather === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); p.y += p.speed * 0.8; p.x += Math.sin(p.y / 50) * 0.5; } else if (currentWeather === 'night') { ctx.fillStyle = 'rgba(0,0,20,0.08)'; ctx.fillRect(0,0,innerWidth,innerHeight); } if (p.y > innerHeight) { p.y = -20; p.x = Math.random() * innerWidth; } if (p.x < -20) p.x = innerWidth + 20; }); ctx.globalAlpha = 1; ctx.restore(); }
function applyBloom() { if (mode === 'offline') return; ctx.save(); ctx.shadowColor = 'rgba(0,212,255,0.15)'; ctx.shadowBlur = 40; ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(0,0,innerWidth,innerHeight); ctx.restore(); }
let stars = []; function initStars() { stars = []; for(let i=0;i<150;i++) { stars.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, size: 0.5 + Math.random() * 2, speed: 0.2 + Math.random() * 0.5, brightness: 0.3 + Math.random() * 0.7 }); } }
function drawAnimatedBg() { stars.forEach(s => { const pulse = Math.sin(performance.now()/2000 + s.x) * 0.3 + 0.7; ctx.fillStyle = `rgba(255,255,255,${s.brightness * pulse * 0.4})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, 7); ctx.fill(); s.y += s.speed * 0.1; if (s.y > innerHeight) s.y = -10; }); }
function spawnExplosion(x,y,color, count = 40, size = 5) { for(let i=0;i<count;i++){ const a=Math.random()*Math.PI*2, sp=1+Math.random()*6; state.particles.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:20+Math.random()*35, maxLife:40, color:color, size:2+Math.random()*size, type:'explosion' }); } shakeAmount = Math.min(shakeAmount + 4, 12); playSound('explosion'); }
function drawParticles() { state.particles.forEach(pt=>{ ctx.save(); const lifeRatio = pt.life / (pt.maxLife || 30); ctx.globalAlpha = Math.max(0, lifeRatio); if (pt.type === 'explosion') { ctx.shadowColor = pt.color; ctx.shadowBlur = 20 * lifeRatio; } else { ctx.shadowColor = pt.color; ctx.shadowBlur = 8; } ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * lifeRatio, 0, 7); ctx.fill(); ctx.restore(); }); }
function initVisuals() { initStars(); initWeather(); initLights(); }

// ---------- Animation Styles ----------
const style = document.createElement('style');
style.textContent = `@keyframes floatUp { 0% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-60px) scale(1.3); } } @keyframes announceIn { 0% { opacity:0; transform:translate(-50%,-50%) scale(0.5); } 50% { opacity:1; transform:translate(-50%,-50%) scale(1.2); } 100% { opacity:1; transform:translate(-50%,-50%) scale(1); } }`;
document.head.appendChild(style);

// ---------- Fullscreen + landscape ----------
function enterImmersive() { const el = document.documentElement; const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen; if (req) { try { req.call(el).catch(() => {}); } catch (e) {} } if (screen.orientation && screen.orientation.lock) { screen.orientation.lock('landscape').catch(() => {}); } }
function checkOrientation() { const overlay = document.getElementById('rotateOverlay'); if (isTouchDevice && innerWidth < innerHeight && state && !state.finished) { overlay.classList.add('show'); } else { overlay.classList.remove('show'); } }
addEventListener('resize', checkOrientation); addEventListener('orientationchange', checkOrientation);

// ---------- Auto-join ----------
window.addEventListener('load', () => {
  setupWeaponButtons(); initChatUI();
  const params = new URLSearchParams(location.search);
  const room = params.get('room');
  if (room) { showMultiplayer(); document.getElementById('joinInput').value = room; setTimeout(joinGame, 400); }
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(() => {}); }
  startMusic(); updateDailyUI(); updateProgressionUI();
});

// ---------- DRAWING FUNCTIONS ----------
function drawGrid(){ ctx.fillStyle = '#0a0a0f'; ctx.fillRect(0,0,innerWidth,innerHeight); time += 0.01; ctx.strokeStyle = 'rgba(0, 212, 255, 0.03)'; ctx.lineWidth = 1; const gap = 50; const offset = (time * 15) % gap; for(let x = -gap + offset; x < innerWidth + gap; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, innerHeight); ctx.stroke(); } for(let y = -gap + offset; y < innerHeight + gap; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(innerWidth, y); ctx.stroke(); } const gradient = ctx.createRadialGradient(innerWidth/2, innerHeight/2, innerWidth*0.15, innerWidth/2, innerHeight/2, innerWidth*0.9); gradient.addColorStop(0, 'transparent'); gradient.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, innerWidth, innerHeight); }
function drawGlow(x, y, radius, color) { const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius); gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent'); ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, radius, 0, 7); ctx.fill(); }
function drawShip(x, y, angle, color, hpRatio, isPlayer = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  drawGlow(0, 0, isPlayer ? 35 : 25, color + '20');
  const grad = ctx.createLinearGradient(0, -15, 0, 15);
  if(isPlayer) { grad.addColorStop(0, color); grad.addColorStop(0.5, color + 'cc'); grad.addColorStop(1, color + '88'); } else { grad.addColorStop(0, color); grad.addColorStop(0.5, color + 'cc'); grad.addColorStop(1, color + '88'); }
  ctx.fillStyle = grad; ctx.shadowColor = color; ctx.shadowBlur = isPlayer ? 25 : 15;
  ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-8, 12); ctx.lineTo(-16, 6); ctx.lineTo(-10, 0); ctx.lineTo(-16, -6); ctx.lineTo(-8, -12); ctx.closePath(); ctx.fill();
  if(isPlayer) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0, 212, 255, 0.2)'; ctx.beginPath(); ctx.arc(6, 0, 4, 0, 7); ctx.fill(); }
  if(!isPlayer && hpRatio !== undefined) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-16, -22, 32, 3); ctx.fillStyle = color; ctx.fillRect(-16, -22, 32 * Math.max(0, hpRatio), 3); }
  ctx.restore(); if(isPlayer) drawGlow(x - Math.cos(angle) * 20, y - Math.sin(angle) * 20, 15, 'rgba(0,212,255,0.1)');
}

// ---------- Mini-Map ----------
function drawMiniMap() { const size = 120; const x = innerWidth - size - 15; const y = 55; ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(0,212,255,0.1)'; ctx.fillRect(x, y, size, size); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, size, size); const scale = size / Math.max(innerWidth, innerHeight); state.enemies.forEach(en => { const ex = x + en.x * scale; const ey = y + en.y * scale; if (ex > x && ex < x + size && ey > y && ey < y + size) { ctx.fillStyle = '#ff2d95'; ctx.shadowBlur = 8; ctx.shadowColor = '#ff2d9540'; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, 7); ctx.fill(); } }); const px = x + state.player.x * scale; const py = y + state.player.y * scale; ctx.shadowBlur = 12; ctx.shadowColor = '#00d4ff60'; ctx.fillStyle = '#00d4ff'; ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill(); state.pickups.forEach(pu => { const pux = x + pu.x * scale; const puy = y + pu.y * scale; if (pux > x && pux < x + size && puy > y && puy < y + size) { ctx.fillStyle = '#ffb238'; ctx.shadowBlur = 6; ctx.shadowColor = '#ffb23840'; ctx.beginPath(); ctx.arc(pux, puy, 2, 0, 7); ctx.fill(); } }); ctx.shadowBlur = 0; ctx.restore(); }

// ---------- Show Damage Numbers ----------
function showDamageNumber(x, y, text, color = '#ff2d95', size = 24) { const el = document.createElement('div'); el.textContent = text; el.style.cssText = `position:fixed;left:${x}px;top:${y}px;color:${color};font-size:${size}px;font-weight:900;font-family:'Orbitron',sans-serif;pointer-events:none;z-index:50;text-shadow:0 0 20px ${color}40;animation:floatUp 0.8s ease-out forwards;`; document.body.appendChild(el); setTimeout(() => el.remove(), 800); }
let killStreak = 0; let lastKillTime = 0;
function onKill() { const now = Date.now(); if (now - lastKillTime > 3000) killStreak = 0; killStreak++; lastKillTime = now; const announcements = { 2: 'DOUBLE KILL! 🔥', 3: 'TRIPLE KILL! ⚡', 4: 'QUAD KILL! 💥', 5: 'PENTA KILL! 🏆', 10: 'GODLIKE! 👑', 15: 'UNSTOPPABLE! 🚀', 20: 'LEGENDARY! 🌟' }; if (announcements[killStreak]) { showAnnouncement(announcements[killStreak]); addScore(killStreak * 5); addCoins(killStreak * 5); playVoiceLine('kill_streak'); } checkAchievements(); }
function showAnnouncement(text) { const el = document.createElement('div'); el.textContent = text; el.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#ffb238;font-size:48px;font-weight:900;font-family:'Orbitron',sans-serif;pointer-events:none;z-index:50;text-shadow:0 0 40px rgba(255,178,56,0.5);animation:announceIn 0.5s ease-out forwards;`; document.body.appendChild(el); setTimeout(() => { el.style.transition = 'opacity 0.5s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 1000); }