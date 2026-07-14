// ===================== STRIKE ZONE - COMPLETE GAME =====================

// ---------- CANVAS ----------
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
function resize(){canvas.width=innerWidth;canvas.height=innerHeight}
addEventListener('resize',resize);resize();

// ---------- SCREENS ----------
const screens={menu:document.getElementById('menu'),missionMenu:document.getElementById('missionMenu'),mpMenu:document.getElementById('mpMenu'),result:document.getElementById('resultScreen')};
const hud=document.getElementById('hud');
function show(id){Object.values(screens).forEach(s=>s.classList.add('hidden'));if(screens[id])screens[id].classList.remove('hidden')}
function backToMenu(){stopGame();hud.classList.add('hidden');show('menu');checkOrientation();updateMainMenuDaily()}
function showMissions(){buildMissionGrid();show('missionMenu')}
function showMultiplayer(){show('mpMenu')}

// ---------- MISSIONS ----------
const MISSIONS=[
{name:'Tutorial',type:'eliminate',target:5,spawnRate:2000,enemySpeed:.6,desc:'Eliminate 5 hostiles',level:1},
{name:'Alpha Guard',type:'eliminate',target:15,spawnRate:1600,enemySpeed:.8,desc:'Eliminate 15 hostiles',level:2},
{name:'Hold The Line',type:'survive',target:45,spawnRate:1400,enemySpeed:.9,desc:'Survive 45s',level:3},
{name:'Perimeter Defense',type:'defend',target:2,spawnRate:1200,enemySpeed:1,desc:'Defend 2 waves',waves:2,level:4},
{name:'Deep Strike',type:'eliminate',target:20,spawnRate:1100,enemySpeed:1,desc:'Eliminate 20',level:5},
{name:'Stormfront',type:'eliminate',target:25,spawnRate:900,enemySpeed:1.1,desc:'Eliminate 25',level:6},
{name:'Last Stand',type:'survive',target:60,spawnRate:800,enemySpeed:1.2,desc:'Survive 60s',level:7},
{name:'Wave Defense',type:'defend',target:3,spawnRate:750,enemySpeed:1.25,desc:'Defend 3 waves',waves:3,level:8},
{name:'Rogue Assault',type:'eliminate',target:30,spawnRate:650,enemySpeed:1.3,desc:'Eliminate 30',level:9},
{name:'Deadline',type:'survive',target:75,spawnRate:600,enemySpeed:1.35,desc:'Survive 75s',level:10},
{name:'The Gauntlet',type:'eliminate',target:40,spawnRate:500,enemySpeed:1.4,desc:'Eliminate 40',level:11},
{name:'Endurance',type:'survive',target:90,spawnRate:450,enemySpeed:1.45,desc:'Survive 90s',level:12},
{name:'Fortress Siege',type:'defend',target:4,spawnRate:400,enemySpeed:1.5,desc:'Defend 4 waves',waves:4,level:13},
{name:'Black Ops',type:'eliminate',target:50,spawnRate:350,enemySpeed:1.6,desc:'Eliminate 50',level:14},
{name:'Final Stand',type:'survive',target:120,spawnRate:300,enemySpeed:1.8,desc:'Survive 120s',level:15}
];

function buildMissionGrid(){
 const grid=document.getElementById('missionGrid');grid.innerHTML='';
 MISSIONS.forEach((m,i)=>{
  const el=document.createElement('div');el.className='missionCard';
  el.innerHTML=`<div class="mNum">LEVEL ${m.level}</div><div class="mName">${m.name}</div><div class="mDesc">${m.desc}</div>`;
  el.onclick=()=>{enterImmersive();startOfflineMission(i)};
  grid.appendChild(el)
 })
}

// ---------- COINS ----------
let coins=parseInt(localStorage.getItem('strikeZone_coins'))||0;
function addCoins(a){coins+=a;localStorage.setItem('strikeZone_coins',coins);updateHUD();updateMainMenuDaily()}
function spendCoins(a){if(coins<a)return false;coins-=a;localStorage.setItem('strikeZone_coins',coins);updateHUD();updateMainMenuDaily();return true}

// ---------- USERNAME ----------
let playerName=localStorage.getItem('strikeZone_username');
if(!playerName){
 playerName='Player_'+Math.floor(Math.random()*9999);localStorage.setItem('strikeZone_username',playerName);document.getElementById('playerNameDisplay').textContent=playerName
}else document.getElementById('playerNameDisplay').textContent=playerName;

// ---------- WEAPONS ----------
const WEAPONS_LIST=[
{id:'1',name:'AR-X1',type:'assault',damage:12,fireRate:100,magSize:30,maxAmmo:120,reloadTime:1500,icon:'🔫'},
{id:'2',name:'SMG-9',type:'smg',damage:8,fireRate:60,magSize:40,maxAmmo:160,reloadTime:1200,icon:'🔫'},
{id:'3',name:'SNIPER-X',type:'sniper',damage:45,fireRate:400,magSize:5,maxAmmo:20,reloadTime:2000,icon:'🎯'},
{id:'4',name:'SHOTGUN',type:'shotgun',damage:15,fireRate:300,magSize:8,maxAmmo:40,reloadTime:1800,icon:'💥'}
];

let currentWeaponIndex=0,currentWeapon=WEAPONS_LIST[0],ammoInMag=currentWeapon.magSize,reserveAmmo=currentWeapon.maxAmmo-currentWeapon.magSize;
let isReloading=!1,reloadTimer=0,score=0,level=1,xp=0,xpNeeded=100,killCount=0,comboCount=0,comboTimer=0,winStreak=0,totalWins=0,totalLosses=0;

// ---------- UPGRADES ----------
let weaponUpgradeLevel=parseInt(localStorage.getItem('strikeZone_weaponUpgrade'))||0;
const UPGRADE_COST=[200,500,1000,2000,3500];
function upgradeWeapon(){
 if(weaponUpgradeLevel>=UPGRADE_COST.length){toast('🔝 MAX UPGRADE!');return}
 const cost=UPGRADE_COST[weaponUpgradeLevel];
 if(!spendCoins(cost)){toast('❌ NEED '+cost+' COINS');return}
 weaponUpgradeLevel++;localStorage.setItem('strikeZone_weaponUpgrade',weaponUpgradeLevel);
 currentWeapon.damage+=3;currentWeapon.fireRate=Math.max(40,currentWeapon.fireRate-8);currentWeapon.magSize+=5;currentWeapon.maxAmmo+=20;
 ammoInMag=currentWeapon.magSize;reserveAmmo=currentWeapon.maxAmmo-currentWeapon.magSize;
 toast('⬆️ WEAPON UPGRADE LVL '+weaponUpgradeLevel+'!');updateHUD()
}

// ---------- ABILITIES ----------
let abilityCooldown=0,abilityActive=!1,abilityTimer=0,currentAbility='dash';
const ABILITIES={dash:{cooldown:300,duration:10,speed:12},shield:{cooldown:400,duration:120,hpRegen:2},rage:{cooldown:500,duration:180,damageMul:2.5,speedMul:1.5}};
function useAbility(){
 if(abilityCooldown>0){toast('⏳ COOLDOWN');return}
 if(abilityActive){toast('⚠️ ALREADY ACTIVE');return}
 if(!state||!state.player)return;
 abilityActive=!0;abilityTimer=ABILITIES[currentAbility].duration;abilityCooldown=ABILITIES[currentAbility].cooldown;
 const p=state.player;
 if(currentAbility==='dash'){p.speed=ABILITIES.dash.speed;toast('💨 DASH!')}
 else if(currentAbility==='shield'){p.shieldUntil=performance.now()+ABILITIES.shield.duration*16.6;toast('🛡️ SHIELD!')}
 else if(currentAbility==='rage'){p.rageUntil=performance.now()+ABILITIES.rage.duration*16.6;toast('🔥 RAGE!')}
}
function updateAbilities(dt){if(abilityCooldown>0)abilityCooldown-=dt*16.6;if(abilityActive){abilityTimer-=dt*16.6;if(abilityTimer<=0){abilityActive=!1;if(currentAbility==='dash')state.player.speed=3.1;toast('⏸ ABILITY ENDED')}}}

// ---------- COVER ----------
let coverObjects=[];
function spawnCovers(){coverObjects=[];for(let i=0;i<5+Math.floor(Math.random()*4);i++)coverObjects.push({x:100+Math.random()*(innerWidth-200),y:100+Math.random()*(innerHeight-200),w:40+Math.random()*60,h:20+Math.random()*30,hp:100,maxHp:100,destroyed:!1})}
function drawCovers(){coverObjects.forEach(c=>{if(c.destroyed)return;ctx.save();ctx.shadowColor='rgba(255,255,255,0.05)';ctx.shadowBlur=10;ctx.fillStyle='#1a1a2e';ctx.strokeStyle='#2a2a4a';ctx.lineWidth=2;ctx.fillRect(c.x,c.y,c.w,c.h);ctx.strokeRect(c.x,c.y,c.w,c.h);if(c.hp<c.maxHp){ctx.shadowBlur=0;ctx.fillStyle='#ff2d95';ctx.fillRect(c.x,c.y-6,c.w*(c.hp/c.maxHp),3)}ctx.restore()})}
function checkCover(p){let r=!1;coverObjects.forEach(c=>{if(!c.destroyed&&p.x>c.x&&p.x<c.x+c.w&&p.y>c.y&&p.y<c.y+c.h)r=!0});return r}

// ---------- HAZARDS ----------
let hazards=[];
function spawnHazards(){hazards=[];for(let i=0;i<2+Math.floor(Math.random()*3);i++)hazards.push({x:50+Math.random()*(innerWidth-100),y:50+Math.random()*(innerHeight-100),radius:30+Math.random()*40,active:!0,timer:0,damage:10,type:Math.random()>.5?'fire':'electric'})}
function drawHazards(){hazards.forEach(h=>{if(!h.active)return;ctx.save();const p=Math.sin(performance.now()/500+h.x)*.3+.7,c=h.type==='fire'?'#ff6b35':'#00d4ff';ctx.shadowColor=c;ctx.shadowBlur=30*p;ctx.fillStyle=c+'30';ctx.beginPath();ctx.arc(h.x,h.y,h.radius*p,0,7);ctx.fill();ctx.fillStyle=c+'80';ctx.beginPath();ctx.arc(h.x,h.y,h.radius*.4*p,0,7);ctx.fill();ctx.restore()})}
function checkHazards(p){hazards.forEach(h=>{if(!h.active)return;if(Math.hypot(p.x-h.x,p.y-h.y)<h.radius){const now=performance.now();if(!(p.shieldUntil&&p.shieldUntil>now)){p.hp-=h.damage*.05}spawnExplosion(p.x,p.y,h.type==='fire'?'#ff6b35':'#00d4ff');shakeAmount=Math.min(shakeAmount+2,6)}})}

// ---------- ENEMIES ----------
const ENEMY_TYPES={grunt:{hp:25,speed:1.5,radius:14,color:'#ff2d95',score:10,behavior:'chase',fireRate:800},tank:{hp:60,speed:.8,radius:18,color:'#a855f7',score:25,behavior:'tank',fireRate:1200},sniper:{hp:20,speed:1.2,radius:12,color:'#00d4ff',score:20,behavior:'sniper',fireRate:1500,range:600},rusher:{hp:15,speed:3.5,radius:10,color:'#ff6b35',score:15,behavior:'rusher',fireRate:300},bomber:{hp:30,speed:1.8,radius:16,color:'#ffb238',score:30,behavior:'bomber',fireRate:1000}};
function spawnEnemy(forceBoss=!1){
 const m=MISSIONS[state.missionIdx],e=Math.floor(Math.random()*4),W=innerWidth,H=innerHeight;
 let x,y;if(e===0){x=-30;y=Math.random()*H}else if(e===1){x=W+30;y=Math.random()*H}else if(e===2){x=Math.random()*W;y=-30}else{x=Math.random()*W;y=H+30}
 x=Math.max(30,Math.min(W-30,x));y=Math.max(30,Math.min(H-30,y));
 let typeKey;if(forceBoss)typeKey='tank';else{const k=Object.keys(ENEMY_TYPES).filter(x=>x!=='tank'||!forceBoss);typeKey=k[Math.floor(Math.random()*k.length)]}
 const type=ENEMY_TYPES[typeKey],isBoss=forceBoss;
 state.enemies.push({x,y,hp:isBoss?type.hp*3:type.hp+Math.random()*10,maxHp:isBoss?type.hp*3:type.hp+Math.random()*10,speed:m.enemySpeed*type.speed*(1+Math.random()*.2),radius:isBoss?type.radius*1.5:type.radius,fireCd:type.fireRate+Math.random()*200,angle:0,hitFlash:0,type:type,behavior:type.behavior,shootRange:type.range||400+Math.random()*100,spawnAnimation:0,spawnDuration:30,isBoss:isBoss,bossPhase:0});
 if(isBoss)toast('👑 BOSS INCOMING!')
}
function updateBoss(en,dt){const p=state.player,dx=p.x-en.x,dy=p.y-en.y,d=Math.hypot(dx,dy)||1;if(en.bossPhase===0){if(d>250){en.x+=dx/d*en.speed*dt*1.5;en.y+=dy/d*en.speed*dt*1.5}else en.bossPhase=1}else if(en.bossPhase===1){if(d<150){en.x-=dx/d*en.speed*dt*2;en.y-=dy/d*en.speed*dt*2}en.fireCd-=dt*16.6;if(en.fireCd<=0){en.fireCd=600+Math.random()*400;for(let i=-1;i<=1;i++){const a=en.angle+i*.15;state.bullets.push({x:en.x,y:en.y,vx:Math.cos(a)*8,vy:Math.sin(a)*8,owner:'e',life:90,damage:15})}}}en.angle=Math.atan2(dy,dx)}

// ---------- PICKUPS ----------
const PICKUP_TYPES={health:{color:'#22ff88',label:'+30 HP',icon:'❤️',duration:0},rapid:{color:'#ff6b35',label:'RAPID FIRE!',icon:'⚡',duration:8000},multi:{color:'#ff2d95',label:'MULTI SHOT!',icon:'💥',duration:8000},ammo:{color:'#ffb238',label:'+AMMO',icon:'📦',duration:0},shield:{color:'#00d4ff',label:'SHIELD!',icon:'🛡️',duration:5000},speed:{color:'#a855f7',label:'SPEED!',icon:'💨',duration:5000},nuke:{color:'#ff2d95',label:'💀 NUKE!',icon:'☢️',duration:0}};
function randomPickupType(){const k=Object.keys(PICKUP_TYPES);return k[Math.floor(Math.random()*k.length)]}
function applyPickup(p,type){const now=performance.now();switch(type){case'health':p.hp=Math.min(p.maxHp,p.hp+30);break;case'rapid':p.rapidUntil=now+8000;break;case'multi':p.multiUntil=now+8000;break;case'ammo':reserveAmmo=Math.min(currentWeapon.maxAmmo,reserveAmmo+30);break;case'shield':p.shieldUntil=now+5000;break;case'speed':p.speedUntil=now+5000;p.speed=4.5;break;case'nuke':state.enemies.forEach(e=>{e.hp=0;spawnExplosion(e.x,e.y,'#ff2d95');addKill()});state.enemies=[];toast('☢️ NUKE! All enemies eliminated!');break}toast(PICKUP_TYPES[type].icon+' '+PICKUP_TYPES[type].label);updateHUD()}

// ---------- INPUT ----------
const keys={};addEventListener('keydown',e=>keys[e.key.toLowerCase()]=!0);addEventListener('keyup',e=>keys[e.key.toLowerCase()]=!1);
let mouse={x:0,y:0,down:!1};canvas.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});canvas.addEventListener('mousedown',()=>mouse.down=!0);addEventListener('mouseup',()=>mouse.down=!1);

// Touch
const joystick=document.getElementById('joystick'),stick=document.getElementById('stick'),fireBtn=document.getElementById('fireBtn');
let joyVec={x:0,y:0,active:!1},touchFire=!1;
function setupJoystick(){
 let jTouchId=null,center=null;
 joystick.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];jTouchId=t.identifier;const r=joystick.getBoundingClientRect();center={x:r.left+r.width/2,y:r.top+r.height/2};joyVec.active=!0},{passive:!1});
 joystick.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===jTouchId){let dx=t.clientX-center.x,dy=t.clientY-center.y;const max=40,d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max}stick.style.left=(33+dx)+'px';stick.style.top=(33+dy)+'px';joyVec.x=dx/max;joyVec.y=dy/max}},{passive:!1});
 function endJ(e){for(const t of e.changedTouches)if(t.identifier===jTouchId){jTouchId=null;joyVec.x=0;joyVec.y=0;joyVec.active=!1;stick.style.left='33px';stick.style.top='33px'}}
 joystick.addEventListener('touchend',endJ);joystick.addEventListener('touchcancel',endJ);
 let fTouchId=null;fireBtn.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];fTouchId=t.identifier;touchFire=!0},{passive:!1});fireBtn.addEventListener('touchend',()=>{touchFire=!1;fTouchId=null});fireBtn.addEventListener('touchcancel',()=>touchFire=!1)
}
setupJoystick();

// ---------- TOAST ----------
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.style.opacity=1;el.style.transition='none';requestAnimationFrame(()=>{el.style.transition='opacity 1.2s ease .4s';el.style.opacity=0})}

// ---------- WEAPON FUNCTIONS ----------
function resetWeapon(){currentWeaponIndex=0;currentWeapon=WEAPONS_LIST[0];ammoInMag=currentWeapon.magSize;reserveAmmo=currentWeapon.maxAmmo-currentWeapon.magSize;isReloading=!1;reloadTimer=0;updateWeaponButtons();updateHUD()}
function reloadWeapon(){if(isReloading||ammoInMag===currentWeapon.magSize||reserveAmmo===0){if(reserveAmmo===0)toast('⚠️ NO AMMO');return}isReloading=!0;reloadTimer=currentWeapon.reloadTime;toast('🔄 RELOADING...')}
function updateReload(dt){if(!isReloading)return;reloadTimer-=dt*16.6;if(reloadTimer<=0){const n=currentWeapon.magSize-ammoInMag,a=Math.min(n,reserveAmmo);ammoInMag+=a;reserveAmmo-=a;isReloading=!1;toast('✅ RELOAD COMPLETE');updateHUD()}}
function canFire(){if(isReloading||ammoInMag<=0){if(ammoInMag<=0)setTimeout(reloadWeapon,300);return!1}return!0}
function consumeAmmo(){ammoInMag--;if(ammoInMag===0)setTimeout(reloadWeapon,300);updateHUD()}

function addScore(p){score+=p;xp+=p;while(xp>=xpNeeded){xp-=xpNeeded;level++;xpNeeded=Math.floor(xpNeeded*1.5);toast('🎉 LEVEL '+level+'!');addCoins(50);if(state&&state.player)state.player.hp=Math.min(state.player.maxHp,state.player.hp+20)}updateHUD()}
function addKill(){killCount++;comboCount++;comboTimer=120;let b=10;if(comboCount>5)b=25;if(comboCount>10)b=50;if(comboCount>20)b=100;addScore(10+b);addCoins(10+b);if(comboCount>5)toast('🔥 '+comboCount+'x COMBO! +'+b+' bonus');updateDailyProgress('kills')}
function updateCombo(){if(comboTimer>0){comboTimer--;if(comboTimer===0&&comboCount>3)toast('💥 '+comboCount+'x combo ended');if(comboTimer===0)comboCount=0}}

function switchWeapon(key){const i=parseInt(key)-1;if(i>=0&&i<WEAPONS_LIST.length){currentWeaponIndex=i;currentWeapon=WEAPONS_LIST[i];ammoInMag=currentWeapon.magSize;reserveAmmo=currentWeapon.maxAmmo-currentWeapon.magSize;isReloading=!1;document.getElementById('weaponName').textContent=currentWeapon.name;document.getElementById('weaponIcon').textContent=currentWeapon.icon;updateWeaponButtons();toast('🔫 '+currentWeapon.name);updateHUD()}}
addEventListener('keydown',e=>{if(e.key>='1'&&e.key<='4')switchWeapon(e.key);if(e.key==='r'||e.key==='R')reloadWeapon();if(e.key==='g'||e.key==='G')throwGrenade();if(e.key==='Escape'||e.key==='p')togglePause();if(e.key==='t'||e.key==='T')toggleChat();if(e.key==='x'||e.key==='X'||e.key==='k'||e.key==='K')toggleSpectator()});

function setupWeaponButtons(){document.querySelectorAll('.weapon-btn').forEach((b,i)=>{b.addEventListener('click',()=>switchWeapon(String(i+1)))})}
function updateWeaponButtons(){document.querySelectorAll('.weapon-btn').forEach((b,i)=>{b.classList.toggle('active',i===currentWeaponIndex)})}

// ---------- GRENADE ----------
let grenadeCooldown=0;
function throwGrenade(){if(grenadeCooldown>0){toast('⏳ COOLDOWN');return}if(!state||!state.player)return;grenadeCooldown=200;const p=state.player;state.enemies.forEach(e=>{if(Math.hypot(e.x-p.x,e.y-p.y)<250){e.hp-=50;e.hitFlash=1;spawnExplosion(e.x,e.y,'#ff6b35');if(e.hp<=0){e.dead=!0;spawnExplosion(e.x,e.y,'#ff2d95');state.kills++;addKill()}}});spawnExplosion(p.x,p.y,'#ff6b35');shakeAmount=Math.min(shakeAmount+8,15);toast('💥 GRENADE!');updateHUD()}

// ---------- HUD ----------
function updateHUD(){
 document.getElementById('hpText').textContent=Math.round(state?state.player.hp:100);
 document.getElementById('ammoCurrent').textContent=ammoInMag;
 document.getElementById('ammoMax').textContent=reserveAmmo;
 document.getElementById('scoreNum').textContent=coins;
 document.getElementById('levelNum').textContent=level;
 document.getElementById('xpText').textContent=xp+'/'+xpNeeded;
 document.getElementById('xpBar').style.width=Math.min(100,xp/xpNeeded*100)+'%';
 document.getElementById('coinsDisplay').textContent=coins;
 document.getElementById('weaponUpgradeLevelDisplay').textContent=weaponUpgradeLevel;
 const el=document.getElementById('ammoCurrent');
 if(ammoInMag<=5&&ammoInMag>0)el.style.color='#ff6b35';else if(ammoInMag===0)el.style.color='#ff2d95';else el.style.color='#22ff88'
}

// ---------- STATE ----------
let state=null,mode=null,rafId=null,paused=!1,shakeAmount=0,time=0,isTouchDevice=('ontouchstart' in window)||navigator.maxTouchPoints>0;

function makePlayer(x,y){return{x,y,angle:0,hp:100,maxHp:100,speed:3.1,radius:16,fireCd:0,alive:!0,rapidUntil:0,multiUntil:0,shieldUntil:0,speedUntil:0,rageUntil:0,damageMul:1,baseDamage:12,baseSpeed:3.1}}
function newState(){return{player:makePlayer(innerWidth*.3,innerHeight*.5),bullets:[],enemies:[],particles:[],pickups:[],remote:null,remoteBullets:[],t0:performance.now(),elapsed:0,kills:0,wave:1,missionIdx:0,spawnTimer:0,pickupTimer:300,finished:!1}}

// ---------- PHYSICS ----------
function movePlayer(dt,p){
 let dx=0,dy=0;
 if(keys['w']||keys['arrowup'])dy-=1;if(keys['s']||keys['arrowdown'])dy+=1;
 if(keys['a']||keys['arrowleft'])dx-=1;if(keys['d']||keys['arrowright'])dx+=1;
 if(joyVec.active){dx=joyVec.x;dy=joyVec.y}
 const len=Math.hypot(dx,dy);if(len>0){dx/=len;dy/=len}
 let nx=p.x+dx*p.speed*dt,ny=p.y+dy*p.speed*dt;
 const m=p.radius+5;nx=Math.max(m,Math.min(innerWidth-m,nx));ny=Math.max(m,Math.min(innerHeight-m,ny));
 const cc=resolveCoverCollision(nx,ny,p.radius);p.x=cc.x;p.y=cc.y;
 if(len>.1&&Math.random()<.3)spawnEngineTrail(p);
 const t=findAutoAimTarget(p);
 if(t)p.angle=Math.atan2(t.y-p.y,t.x-p.x);
 else if(len>.1)p.angle=Math.atan2(dy,dx)
}
function resolveCoverCollision(x,y,radius){
 for(const c of coverObjects){
  if(c.destroyed)continue;
  const nx=Math.max(c.x,Math.min(x,c.x+c.w)),ny=Math.max(c.y,Math.min(y,c.y+c.h));
  const dx=x-nx,dy=y-ny,d=Math.hypot(dx,dy);
  if(d<radius){const push=(radius-d)||.01,ux=d>.0001?dx/d:1,uy=d>.0001?dy/d:0;x+=ux*push;y+=uy*push}
 }
 return{x,y}
}
function spawnEngineTrail(p){for(let i=0;i<2;i++)state.particles.push({x:p.x-Math.cos(p.angle)*18+(Math.random()-.5)*8,y:p.y-Math.sin(p.angle)*18+(Math.random()-.5)*8,vx:-Math.cos(p.angle)*(.5+Math.random()*.5),vy:-Math.sin(p.angle)*(.5+Math.random()*.5),life:15+Math.random()*10,color:`hsla(${190+Math.random()*30},100%,60%,${.3+Math.random()*.3})`,size:2+Math.random()*3})}
function findAutoAimTarget(p){if(mode==='offline'){let b=null,bd=Infinity;state.enemies.forEach(e=>{const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<bd){bd=d;b=e}});return b}else if(state&&state.remote)return state.remote;return null}
function spawnMuzzleFlash(x,y,a){const c=currentWeapon.type==='sniper'?8:12;for(let i=0;i<c;i++){const ang=a+(Math.random()-.5)*(currentWeapon.type==='sniper'?.6:1.2),sp=4+Math.random()*(currentWeapon.type==='sniper'?8:6);state.particles.push({x:x+Math.cos(a)*25,y:y+Math.sin(a)*25,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:8+Math.random()*4,color:`hsl(${40+Math.random()*20},100%,${60+Math.random()*30}%)`,size:currentWeapon.type==='sniper'?4:2+Math.random()*3})}shakeAmount=Math.min(shakeAmount+(currentWeapon.type==='sniper'?3:1),6)}
function spawnExplosion(x,y,color,c=40,s=5){for(let i=0;i<c;i++){const a=Math.random()*Math.PI*2,sp=1+Math.random()*6;state.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:20+Math.random()*35,maxLife:40,color:color,size:2+Math.random()*s,type:'explosion'})}shakeAmount=Math.min(shakeAmount+4,12);playSound('explosion')}

function updatePlayerWithAbilities(dt){const p=state.player,now=performance.now();if(p.rageUntil&&p.rageUntil>now){p.damageMul=ABILITIES.rage.damageMul;p.speed=3.1*ABILITIES.rage.speedMul}else{p.damageMul=1;if(!abilityActive||currentAbility!=='dash')p.speed=3.1}if(p.shieldUntil&&p.shieldUntil>now)p.hp=Math.min(p.maxHp,p.hp+ABILITIES.shield.hpRegen*dt)}

function tryFire(p,ownerTag,dt){
 p.fireCd-=dt;
 const wantFire=mouse.down||touchFire,now=performance.now(),rapid=p.rapidUntil>now,multi=p.multiUntil>now;
 if(wantFire&&p.fireCd<=0&&canFire()){
  p.fireCd=rapid?4:(currentWeapon.fireRate/16.6);
  const speed=currentWeapon.type==='sniper'?14:9;
  let angles=[p.angle];if(multi){const sp=.06;angles=[p.angle-sp,p.angle+sp]}
  angles.forEach(a=>{const dmg=currentWeapon.damage*(p.damageMul||1);state.bullets.push({x:p.x+Math.cos(a)*p.radius,y:p.y+Math.sin(a)*p.radius,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,owner:ownerTag,life:70,damage:dmg,isSniper:currentWeapon.type==='sniper'})});
  consumeAmmo();spawnMuzzleFlash(p.x,p.y,p.angle);playSound('shoot');
  if(mode!=='offline'&&netSend)netSend({t:'shot',x:p.x,y:p.y,angle:p.angle,multi})
 }
}

// ---------- OFFLINE UPDATE ----------
function updateOffline(dt){
 const m=MISSIONS[state.missionIdx],p=state.player;
 updateReload(dt);updateCombo();if(grenadeCooldown>0)grenadeCooldown--;updateAbilities(dt);updatePlayerWithAbilities(dt);
 checkHazards(p);if(checkCover(p))p.hp=Math.min(p.maxHp,p.hp+.05*dt);
 movePlayer(dt,p);tryFire(p,'p',dt);
 state.spawnTimer-=dt*16.6;
 const cap=m.type==='defend'?5+state.wave:8+Math.floor(state.elapsed/30);
 if(state.spawnTimer<=0&&state.enemies.length<cap){const isBoss=state.wave>1&&state.wave%5===0;spawnEnemy(isBoss&&Math.random()<.4&&m.level>=6);state.spawnTimer=Math.max(400,m.spawnRate-Math.floor(state.elapsed/5))}
 state.enemies.forEach(e=>{
  if(e.isBoss){updateBoss(e,dt);return}
  const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,desired=180+Math.random()*60;
  switch(e.behavior){
   case'rusher':if(d>50){e.x+=dx/d*e.speed*dt*1.8;e.y+=dy/d*e.speed*dt*1.8}break;
   case'sniper':if(d>e.shootRange){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt}else if(d<e.shootRange-100){e.x-=dx/d*e.speed*.3*dt;e.y-=dy/d*e.speed*.3*dt}break;
   case'bomber':if(d<300&&d>100){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt}else if(d<100){spawnExplosion(e.x,e.y,'#ffb238');p.hp-=30;shakeAmount=Math.min(shakeAmount+8,15);e.dead=!0;toast('💥 BOMBER EXPLODED!')}break;
   default:if(d>desired){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt}else if(d<desired-40){e.x-=dx/d*e.speed*.5*dt;e.y-=dy/d*e.speed*.5*dt}
  }
  e.angle=Math.atan2(dy,dx);
  if(e.behavior!=='bomber'&&!e.dead){
   e.fireCd-=dt*16.6;
   if(e.fireCd<=0&&d<e.shootRange){e.fireCd=e.type.fireRate+Math.random()*400;const sp=6.4+Math.random()*.5;state.bullets.push({x:e.x,y:e.y,vx:Math.cos(e.angle)*sp,vy:Math.sin(e.angle)*sp,owner:'e',life:90,damage:e.isBoss?15:8})}
  }
  if(e.hitFlash>0)e.hitFlash-=dt*.04;if(e.spawnAnimation<1)e.spawnAnimation=Math.min(1,e.spawnAnimation+.05)
 });
 state.bullets=state.bullets.filter(b=>{
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  if(b.x<-20||b.x>innerWidth+20||b.y<-20||b.y>innerHeight+20||b.life<=0)return!1;
  for(const c of coverObjects){if(!c.destroyed&&b.x>c.x&&b.x<c.x+c.w&&b.y>c.y&&b.y<c.y+c.h){c.hp-=b.damage||5;if(c.hp<=0)c.destroyed=!0;spawnExplosion(b.x,b.y,'#2a2a4a');return!1}}
  if(b.owner==='p'||b.owner==='mp'){
   for(const e of state.enemies){
    if(Math.hypot(e.x-b.x,e.y-b.y)<e.radius){e.hp-=b.damage||12;e.hitFlash=1;spawnExplosion(b.x,b.y,'#ff6b35');showDamageNumber(b.x,b.y-20,'-'+Math.round(b.damage),'#ff2d95');if(e.hp<=0){e.dead=!0;spawnExplosion(e.x,e.y,'#ff2d95',60,8);state.kills++;addKill();onKill();if(e.isBoss){addCoins(100);toast('👑 BOSS DEFEATED! +100 COINS');showDamageNumber(e.x,e.y-40,'+100','#ffb238',40)}if(Math.random()<.4)state.pickups.push({id:Math.random().toString(36).slice(2),x:e.x,y:e.y,type:randomPickupType()})}return!1}
   }
   for(const pu of state.pickups){if(Math.hypot(pu.x-b.x,pu.y-b.y)<16){applyPickup(p,pu.type);state.pickups=state.pickups.filter(x=>x.id!==pu.id);return!1}}
  }else if(b.owner==='e'){
   if(Math.hypot(p.x-b.x,p.y-b.y)<p.radius){const now=performance.now(),dmg=(p.shieldUntil&&p.shieldUntil>now)?(b.damage||8)*.3:(b.damage||8);p.hp-=dmg;spawnExplosion(b.x,b.y,'#00d4ff');showDamageNumber(p.x,p.y-40,'-'+Math.round(dmg),'#00d4ff');shakeAmount=Math.min(shakeAmount+3,8);return!1}
  }
  return!0
 });
 state.enemies=state.enemies.filter(e=>!e.dead);
 state.pickups=state.pickups.filter(pu=>{if(Math.hypot(p.x-pu.x,p.y-pu.y)<p.radius+14){applyPickup(p,pu.type);return!1}return!0});
 p.hp=Math.min(p.maxHp,p.hp+.02*dt);
 state.particles=state.particles.filter(pt=>{pt.x+=pt.vx;pt.y+=pt.vy;pt.life--;return pt.life>0});
 updateHUD();state.elapsed=(performance.now()-state.t0)/1000;updateWaveTag();
 if(p.hp<=0){endMission(!1);return}
 if(m.type==='eliminate'&&state.kills>=m.target)endMission(!0);
 if(m.type==='survive'&&state.elapsed>=m.target)endMission(!0);
 if(m.type==='defend'){if(state.kills>=state.wave*8){state.wave++;toast('🌊 WAVE '+state.wave);spawnCovers();changeWeather();if(state.wave>m.waves)endMission(!0)}}
}

// ---------- RENDER ----------
function render(){
 drawGrid();drawAnimatedBg();drawWeather();
 if(!state)return;const p=state.player;
 drawMiniMap();drawCovers();drawHazards();
 state.pickups&&state.pickups.forEach(pu=>{const c=PICKUP_TYPES[pu.type].color,pulse=Math.sin(performance.now()/200+pu.x)*.3+1;drawGlow(pu.x,pu.y,25*pulse,c+'30');ctx.save();ctx.shadowColor=c;ctx.shadowBlur=20;ctx.fillStyle=c;ctx.beginPath();ctx.arc(pu.x,pu.y,10*pulse,0,7);ctx.fill();ctx.restore();ctx.fillStyle='#0a0a0f';ctx.font='14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(PICKUP_TYPES[pu.type].icon,pu.x,pu.y+1)});
 state.bullets.forEach(b=>{if(b.owner==='e'){ctx.shadowColor='#ff2d95';ctx.shadowBlur=12;ctx.fillStyle='#ff2d95';ctx.beginPath();ctx.arc(b.x,b.y,3,0,7);ctx.fill();ctx.shadowBlur=0}});
 state.bullets.forEach(b=>{if(b.owner==='p'||b.owner==='mp'){const color=b.isSniper?'#a855f7':'#00d4ff';ctx.shadowColor=color;ctx.shadowBlur=b.isSniper?25:15;ctx.fillStyle=color;ctx.beginPath();ctx.arc(b.x,b.y,b.isSniper?5:4,0,7);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=color+'30';ctx.beginPath();ctx.arc(b.x-b.vx*1.5,b.y-b.vy*1.5,b.isSniper?8:6,0,7);ctx.fill();ctx.shadowBlur=0}});
 state.remoteBullets&&state.remoteBullets.forEach(b=>{ctx.shadowColor='#ff6b35';ctx.shadowBlur=12;ctx.fillStyle='#ff6b35';ctx.beginPath();ctx.arc(b.x,b.y,3,0,7);ctx.fill();ctx.shadowBlur=0});
 drawParticles();
 state.enemies.forEach(e=>{if(e.spawnAnimation<1){const prog=e.spawnAnimation;ctx.save();ctx.translate(e.x,e.y);ctx.scale(prog,prog);const color=e.hitFlash>0?'#ffffff':(e.type?e.type.color:'#ff2d95');drawShip(0,0,e.angle,color,e.hp/e.maxHp,!1);ctx.restore();drawGlow(e.x,e.y,30*(1-prog),'#00d4ff20')}else{const color=e.hitFlash>0?'#ffffff':(e.type?e.type.color:'#ff2d95');if(e.isBoss)drawGlow(e.x,e.y,50,'#ffb23830');drawShip(e.x,e.y,e.angle,color,e.hp/e.maxHp,!1);if(e.hitFlash>0)drawGlow(e.x,e.y,30,'rgba(255,255,255,0.2)')}});
 if(state.remote)drawShip(state.remote.x,state.remote.y,state.remote.angle,'#ff6b35',state.remote.hp/100,!1);
 if(p.hp>0){const now=performance.now();if(p.rageUntil&&p.rageUntil>now)drawGlow(p.x,p.y,60,'#ff2d9530');drawShip(p.x,p.y,p.angle,'#00d4ff',1,!0);const pulse=Math.sin(performance.now()/500)*.5+1;ctx.strokeStyle=`rgba(0,212,255,${.08*pulse})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,30*pulse,0,7);ctx.stroke()}
 if(mode!=='offline'){drawLighting();applyBloom()}
 if(shakeAmount>.1){ctx.save();ctx.translate((Math.random()-.5)*shakeAmount*2,(Math.random()-.5)*shakeAmount*2);ctx.restore();shakeAmount*=.9}
 const v=ctx.createRadialGradient(innerWidth/2,innerHeight/2,innerWidth*.25,innerWidth/2,innerHeight/2,innerWidth*.9);v.addColorStop(0,'transparent');v.addColorStop(1,'rgba(0,0,0,0.35)');ctx.fillStyle=v;ctx.fillRect(0,0,innerWidth,innerHeight)
}

function drawGrid(){ctx.fillStyle='#0a0a0f';ctx.fillRect(0,0,innerWidth,innerHeight);time+=.01;ctx.strokeStyle='rgba(0,212,255,0.03)';ctx.lineWidth=1;const gap=50,offset=(time*15)%gap;for(let x=-gap+offset;x<innerWidth+gap;x+=gap){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,innerHeight);ctx.stroke()}for(let y=-gap+offset;y<innerHeight+gap;y+=gap){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(innerWidth,y);ctx.stroke()}const g=ctx.createRadialGradient(innerWidth/2,innerHeight/2,innerWidth*.15,innerWidth/2,innerHeight/2,innerWidth*.9);g.addColorStop(0,'transparent');g.addColorStop(1,'rgba(0,0,0,0.5)');ctx.fillStyle=g;ctx.fillRect(0,0,innerWidth,innerHeight)}
function drawGlow(x,y,r,c){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill()}
function drawShip(x,y,a,c,h,isPlayer=!1){ctx.save();ctx.translate(x,y);ctx.rotate(a);drawGlow(0,0,isPlayer?35:25,c+'20');const g=ctx.createLinearGradient(0,-15,0,15);g.addColorStop(0,c);g.addColorStop(.5,c+'cc');g.addColorStop(1,c+'88');ctx.fillStyle=g;ctx.shadowColor=c;ctx.shadowBlur=isPlayer?25:15;ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(-8,12);ctx.lineTo(-16,6);ctx.lineTo(-10,0);ctx.lineTo(-16,-6);ctx.lineTo(-8,-12);ctx.closePath();ctx.fill();if(isPlayer){ctx.shadowBlur=0;ctx.fillStyle='rgba(0,212,255,0.2)';ctx.beginPath();ctx.arc(6,0,4,0,7);ctx.fill()}if(!isPlayer&&h!==undefined){ctx.shadowBlur=0;ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(-16,-22,32,3);ctx.fillStyle=c;ctx.fillRect(-16,-22,32*Math.max(0,h),3)}ctx.restore();if(isPlayer)drawGlow(x-Math.cos(a)*20,y-Math.sin(a)*20,15,'rgba(0,212,255,0.1)')}
function drawMiniMap(){const s=120,x=innerWidth-s-15,y=55;ctx.save();ctx.fillStyle='rgba(0,0,0,0.7)';ctx.shadowBlur=20;ctx.shadowColor='rgba(0,212,255,0.1)';ctx.fillRect(x,y,s,s);ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;ctx.strokeRect(x,y,s,s);const sc=s/Math.max(innerWidth,innerHeight);state.enemies.forEach(e=>{const ex=x+e.x*sc,ey=y+e.y*sc;if(ex>x&&ex<x+s&&ey>y&&ey<y+s){ctx.fillStyle='#ff2d95';ctx.shadowBlur=8;ctx.shadowColor='#ff2d9540';ctx.beginPath();ctx.arc(ex,ey,3,0,7);ctx.fill()}});const px=x+state.player.x*sc,py=y+state.player.y*sc;ctx.shadowBlur=12;ctx.shadowColor='#00d4ff60';ctx.fillStyle='#00d4ff';ctx.beginPath();ctx.arc(px,py,4,0,7);ctx.fill();state.pickups.forEach(pu=>{const pux=x+pu.x*sc,puy=y+pu.y*sc;if(pux>x&&pux<x+s&&puy>y&&puy<y+s){ctx.fillStyle='#ffb238';ctx.shadowBlur=6;ctx.shadowColor='#ffb23840';ctx.beginPath();ctx.arc(pux,puy,2,0,7);ctx.fill()}});ctx.shadowBlur=0;ctx.restore()}
function drawParticles(){state.particles.forEach(pt=>{ctx.save();const r=pt.life/(pt.maxLife||30);ctx.globalAlpha=Math.max(0,r);if(pt.type==='explosion'){ctx.shadowColor=pt.color;ctx.shadowBlur=20*r}else{ctx.shadowColor=pt.color;ctx.shadowBlur=8}ctx.fillStyle=pt.color;ctx.beginPath();ctx.arc(pt.x,pt.y,pt.size*r,0,7);ctx.fill();ctx.restore()})}
function showDamageNumber(x,y,t,c='#ff2d95',s=24){const el=document.createElement('div');el.textContent=t;el.style.cssText=`position:fixed;left:${x}px;top:${y}px;color:${c};font-size:${s}px;font-weight:900;font-family:'Orbitron',sans-serif;pointer-events:none;z-index:50;text-shadow:0 0 20px ${c}40;animation:floatUp .8s ease-out forwards;`;document.body.appendChild(el);setTimeout(()=>el.remove(),800)}
let killStreak=0,lastKillTime=0;
function onKill(){const now=Date.now();if(now-lastKillTime>3000)killStreak=0;killStreak++;lastKillTime=now;const a={2:'DOUBLE KILL! 🔥',3:'TRIPLE KILL! ⚡',4:'QUAD KILL! 💥',5:'PENTA KILL! 🏆',10:'GODLIKE! 👑',15:'UNSTOPPABLE! 🚀',20:'LEGENDARY! 🌟'};if(a[killStreak]){showAnnouncement(a[killStreak]);addScore(killStreak*5);addCoins(killStreak*5);playVoiceLine('kill_streak')}checkAchievements()}
function showAnnouncement(t){const el=document.createElement('div');el.textContent=t;el.style.cssText=`position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#ffb238;font-size:48px;font-weight:900;font-family:'Orbitron',sans-serif;pointer-events:none;z-index:50;text-shadow:0 0 40px rgba(255,178,56,0.5);animation:announceIn .5s ease-out forwards;`;document.body.appendChild(el);setTimeout(()=>{el.style.transition='opacity .5s';el.style.opacity='0';setTimeout(()=>el.remove(),500)},1000)}

// ---------- WEATHER ----------
const WEATHERS=['clear','rain','fog','snow','night'];let currentWeather='clear',weatherParticles=[];
function changeWeather(){const i=Math.floor(Math.random()*WEATHERS.length);currentWeather=WEATHERS[i];document.getElementById('weatherIndicator').textContent=currentWeather.toUpperCase();toast('🌦️ Weather: '+currentWeather.toUpperCase())}
function initWeather(){weatherParticles=[];const c=currentWeather==='rain'?300:currentWeather==='snow'?150:50;for(let i=0;i<c;i++)weatherParticles.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,speed:2+Math.random()*4,size:2+Math.random()*3,opacity:.3+Math.random()*.5})}
function drawWeather(){if(currentWeather==='clear')return;ctx.save();if(currentWeather==='fog'){const g=ctx.createRadialGradient(innerWidth/2,innerHeight/2,innerWidth*.1,innerWidth/2,innerHeight/2,innerWidth*.9);g.addColorStop(0,'rgba(200,210,220,0)');g.addColorStop(.5,'rgba(200,210,220,0.1)');g.addColorStop(1,'rgba(200,210,220,0.3)');ctx.fillStyle=g;ctx.fillRect(0,0,innerWidth,innerHeight)}weatherParticles.forEach(p=>{ctx.globalAlpha=p.opacity;if(currentWeather==='rain'){ctx.strokeStyle='rgba(180,200,255,0.6)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-2,p.y+15);ctx.stroke();p.y+=p.speed*1.8;p.x-=1}else if(currentWeather==='snow'){ctx.fillStyle='rgba(255,255,255,0.8)';ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill();p.y+=p.speed*.8;p.x+=Math.sin(p.y/50)*.5}else if(currentWeather==='night'){ctx.fillStyle='rgba(0,0,20,0.08)';ctx.fillRect(0,0,innerWidth,innerHeight)}if(p.y>innerHeight){p.y=-20;p.x=Math.random()*innerWidth}if(p.x<-20)p.x=innerWidth+20});ctx.globalAlpha=1;ctx.restore()}

// ---------- LIGHTING ----------
let lightSources=[];function initLights(){lightSources=[{x:innerWidth/2,y:innerHeight/2,radius:Math.max(innerWidth,innerHeight)*.8,color:'rgba(255,255,255,0.02)'}];if(state&&state.player)lightSources.push({x:state.player.x,y:state.player.y,radius:150,color:'rgba(0,212,255,0.15)'})}
function drawLighting(){if(mode==='offline')return;ctx.save();ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.globalCompositeOperation='destination-out';lightSources.forEach(l=>{const g=ctx.createRadialGradient(l.x,l.y,0,l.x,l.y,l.radius);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,0.6)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(l.x,l.y,l.radius,0,7);ctx.fill()});ctx.globalCompositeOperation='source-over';ctx.restore()}
function applyBloom(){if(mode==='offline')return;ctx.save();ctx.shadowColor='rgba(0,212,255,0.15)';ctx.shadowBlur=40;ctx.fillStyle='rgba(255,255,255,0.03)';ctx.fillRect(0,0,innerWidth,innerHeight);ctx.restore()}
let stars=[];function initStars(){stars=[];for(let i=0;i<150;i++)stars.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,size:.5+Math.random()*2,speed:.2+Math.random()*.5,brightness:.3+Math.random()*.7})}
function drawAnimatedBg(){stars.forEach(s=>{const p=Math.sin(performance.now()/2000+s.x)*.3+.7;ctx.fillStyle=`rgba(255,255,255,${s.brightness*p*.4})`;ctx.beginPath();ctx.arc(s.x,s.y,s.size,0,7);ctx.fill();s.y+=s.speed*.1;if(s.y>innerHeight)s.y=-10})}
function initVisuals(){initStars();initWeather();initLights()}

// ---------- MISSION START ----------
function startOfflineMission(idx){
 mode='offline';state=newState();state.missionIdx=idx;resetWeapon();
 for(let i=0;i<weaponUpgradeLevel;i++){currentWeapon.damage+=3;currentWeapon.fireRate=Math.max(40,currentWeapon.fireRate-8);currentWeapon.magSize+=5;currentWeapon.maxAmmo+=20}
 ammoInMag=currentWeapon.magSize;reserveAmmo=currentWeapon.maxAmmo-currentWeapon.magSize;
 initNewFeatures();initVisuals();hud.classList.remove('hidden');
 const eb=document.getElementById('enemyBarWrap');if(eb)eb.style.display='none';
 const m=MISSIONS[idx];document.getElementById('missionTitle').textContent='⚡ LEVEL '+m.level+': '+m.name;document.getElementById('objectiveText').textContent=m.desc;
 document.getElementById('weaponName').textContent=currentWeapon.name;document.getElementById('weaponIcon').textContent=currentWeapon.icon;
 document.getElementById('offlineResultBtns').style.display='flex';document.getElementById('multiplayerResultBtns').style.display='none';
 updateWeaponButtons();updateHUD();updateDailyUI();updateProgressionUI();updateWaveTag();show(null);paused=!1;loop();checkOrientation()
}

function updateWaveTag(){const m=MISSIONS[state.missionIdx];let txt='';if(m.type==='eliminate')txt='🎯 '+state.kills+'/'+m.target;if(m.type==='survive')txt='⏱ '+Math.floor(state.elapsed)+'s / '+m.target+'s';if(m.type==='defend')txt='🌊 Wave '+state.wave+'/'+m.waves;document.getElementById('waveInfo').textContent=txt;document.getElementById('enemyCount').textContent=state.kills;document.getElementById('enemyTotal').textContent=m.type==='eliminate'?m.target:'?'}
function endMission(win){if(state.finished)return;state.finished=!0;paused=!0;const rt=document.getElementById('resultTitle'),rd=document.getElementById('resultDesc');rt.textContent=win?'🏆 MISSION COMPLETE':'💀 MISSION FAILED';rt.style.color=win?'#22ff88':'#ff2d95';rd.textContent=win?'Coins: '+coins+' · Level: '+level:'You were eliminated. Try again.';document.getElementById('resultScreen').dataset.win=win?'1':'0';document.getElementById('offlineResultBtns').style.display='flex';document.getElementById('multiplayerResultBtns').style.display='none';hud.classList.add('hidden');show('result');updateDailyProgress('wins',win?1:0)}
function retryOrNext(){const win=document.getElementById('resultScreen').dataset.win==='1';if(mode==='offline'){let idx=state.missionIdx;if(win&&idx<MISSIONS.length-1)idx++;startOfflineMission(idx)}else backToMenu()}
function togglePause(){if(!state||state.finished)return;paused=!paused;toast(paused?'⏸ PAUSED':'▶ GO')}

// ---------- LOOP ----------
function loop(){if(!paused&&state&&!state.finished){if(mode==='offline')updateOffline(1);else updateMultiplayer(1);frameCounter++;if(!performanceMode||frameCounter%2===0)render()}rafId=requestAnimationFrame(loop)}
function stopGame(){if(rafId)cancelAnimationFrame(rafId);rafId=null;state=null;paused=!1;if(peer){try{peer.destroy()}catch(e){}peer=null;conn=null}}

function initNewFeatures(){spawnCovers();spawnHazards();setupAbilityUI()}
let abilityUISetup=!1;
function setupAbilityUI(){if(abilityUISetup)return;abilityUISetup=!0;const panel=document.querySelector('.weapon-left');if(!panel)return;const c=document.createElement('div');c.style.cssText='display:flex;gap:6px;margin-left:10px;pointer-events:auto;';['dash','shield','rage'].forEach(ab=>{const b=document.createElement('button');b.className='action-btn';b.textContent=ab.toUpperCase();b.style.cssText='border-color:rgba(0,212,255,0.2);color:#00d4ff;pointer-events:auto;font-size:8px;padding:3px 8px;';b.onclick=()=>{currentAbility=ab;toast('⚡ '+ab.toUpperCase()+' SELECTED')};c.appendChild(b)});const u=document.createElement('button');u.className='action-btn';u.textContent='🔥 USE';u.style.cssText='border-color:rgba(255,45,149,0.2);color:#ff2d95;pointer-events:auto;';u.onclick=useAbility;c.appendChild(u);panel.appendChild(c)}

// ---------- MULTIPLAYER ----------
let peer=null,conn=null,isHost=!1;
function netSend(obj){if(conn&&conn.open)try{conn.send(obj)}catch(e){}}
function hostGame(){enterImmersive();document.getElementById('hostBtn').disabled=!0;document.getElementById('hostStatus').textContent='🔧 Creating room...';peer=new Peer(undefined,{debug:2,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'}]}});peer.on('open',id=>{isHost=!0;const link=location.origin+location.pathname+'?room='+id;document.getElementById('roomLink').textContent=link;document.getElementById('hostInfo').classList.remove('hidden');document.getElementById('hostStatus').textContent='🔗 Room code: '+id+' — waiting...';toast('✅ Room created!')});peer.on('connection',c=>{conn=c;conn.on('open',()=>{document.getElementById('hostStatus').textContent='⚡ Opponent connected! Starting...';toast('✅ Opponent joined!');resetWeapon();setTimeout(()=>startMultiplayerMatch(!0),700)});attachConnHandlers()});peer.on('error',e=>{console.error(e);document.getElementById('hostStatus').textContent='❌ Error: '+e.type;document.getElementById('hostBtn').disabled=!1})}
function joinGame(){let code=document.getElementById('joinInput').value.trim();const m=code.match(/room=([a-zA-Z0-9-]+)/);if(m)code=m[1];if(!code){document.getElementById('joinStatus').textContent='⚠️ Enter a room code first.';return}enterImmersive();document.getElementById('joinStatus').textContent='🔄 Connecting...';peer=new Peer(undefined,{debug:2,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'}]}});peer.on('open',()=>{let attempts=0;function tryConnect(){attempts++;document.getElementById('joinStatus').textContent='🔄 Attempt '+attempts+'/3...';conn=peer.connect(code,{reliable:!0});conn.on('open',()=>{document.getElementById('joinStatus').textContent='⚡ Connected! Starting...';toast('✅ Connected to host!');resetWeapon();setTimeout(()=>startMultiplayerMatch(!1),700)});attachConnHandlers();setTimeout(()=>{if(!conn||!conn.open){if(attempts<3){document.getElementById('joinStatus').textContent='⏳ Retrying...';tryConnect()}else document.getElementById('joinStatus').textContent='❌ Connection failed.'}},3000)}tryConnect()});peer.on('error',e=>{console.error(e);document.getElementById('joinStatus').textContent='❌ Error: '+e.type})}
function attachConnHandlers(){conn.on('data',data=>{if(!state)return;if(data.t==='pos'){state.remote=state.remote||{x:0,y:0,angle:0,hp:100};state.remote.x=data.x;state.remote.y=data.y;state.remote.angle=data.angle;state.remote.hp=data.hp;document.getElementById('enemyHpBar').style.width=Math.max(0,data.hp)+'%'}else if(data.t==='shot'){const sp=9;state.remoteBullets.push({x:data.x,y:data.y,vx:Math.cos(data.angle)*sp,vy:Math.sin(data.angle)*sp,life:70,damage:12})}else if(data.t==='hit'){const now=performance.now();if(!(state.player.shieldUntil&&state.player.shieldUntil>now)){state.player.hp-=data.dmg||12;shakeAmount=Math.min(shakeAmount+5,10)}if(state.player.hp<=0&&!state.finished)endMPMatch(!1)}else if(data.t==='dead'){if(!state.finished)endMPMatch(!0)}else if(data.t==='pickup_spawn'){state.pickups.push({id:data.id,x:data.x,y:data.y,type:data.type})}else if(data.t==='pickup_taken'){state.pickups=state.pickups.filter(p=>p.id!==data.id)}else if(data.t==='chat'){chatMessages.push(data.msg);updateChatUI()}});conn.on('close',()=>{if(state&&!state.finished){toast('🔌 Opponent disconnected');document.getElementById('joinStatus').textContent='❌ Disconnected'}})}
function copyLink(){const t=document.getElementById('roomLink').textContent;if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>toast('✅ Link copied!')).catch(()=>fallbackCopy(t));else fallbackCopy(t)}
function fallbackCopy(t){const i=document.createElement('input');i.value=t;i.style.cssText='position:fixed;opacity:0';document.body.appendChild(i);i.select();try{document.execCommand('copy');toast('✅ Link copied!')}catch(e){toast('❌ Copy failed')}document.body.removeChild(i)}
function startMultiplayerMatch(hostSide){mode=hostSide?'mp-host':'mp-join';state=newState();state.player=makePlayer(hostSide?innerWidth*.25:innerWidth*.75,innerHeight*.5);state.remote={x:hostSide?innerWidth*.75:innerWidth*.25,y:innerHeight*.5,angle:0,hp:100};document.getElementById('enemyBarWrap').style.display='block';document.getElementById('enemyHpBar').style.width='100%';document.getElementById('missionTitle').textContent='⚡ MULTIPLAYER';document.getElementById('objectiveText').textContent='Eliminate your opponent';document.getElementById('waveInfo').textContent='🔥 PvP';document.getElementById('weaponName').textContent=currentWeapon.name;document.getElementById('weaponIcon').textContent=currentWeapon.icon;document.getElementById('offlineResultBtns').style.display='none';document.getElementById('multiplayerResultBtns').style.display='flex';const sd=document.getElementById('streakDisplay');if(sd)sd.textContent=winStreak>0?'🔥 '+winStreak+'x':'';updateWeaponButtons();hud.classList.remove('hidden');show(null);paused=!1;loop();checkOrientation()}
function updateMultiplayer(dt){const p=state.player;updateReload(dt);updateCombo();if(grenadeCooldown>0)grenadeCooldown--;updateAbilities(dt);updatePlayerWithAbilities(dt);movePlayer(dt,p);tryFire(p,'mp',dt);if(isHost){state.pickupTimer-=dt;if(state.pickupTimer<=0&&state.pickups.length<2){state.pickupTimer=480+Math.random()*220;const pu={id:Math.random().toString(36).slice(2),x:80+Math.random()*(innerWidth-160),y:80+Math.random()*(innerHeight-160),type:randomPickupType()};state.pickups.push(pu);netSend({t:'pickup_spawn',id:pu.id,x:pu.x,y:pu.y,type:pu.type})}}state.bullets=state.bullets.filter(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.x<-20||b.x>innerWidth+20||b.y<-20||b.y>innerHeight+20||b.life<=0)return!1;if(state.remote&&Math.hypot(state.remote.x-b.x,state.remote.y-b.y)<16){netSend({t:'hit',dmg:b.damage||12});spawnExplosion(b.x,b.y,'#ff6b35');shakeAmount=Math.min(shakeAmount+3,8);return!1}for(const pu of state.pickups){if(Math.hypot(pu.x-b.x,pu.y-b.y)<16){applyPickup(p,pu.type);state.pickups=state.pickups.filter(x=>x.id!==pu.id);netSend({t:'pickup_taken',id:pu.id});return!1}}return!0});state.remoteBullets=(state.remoteBullets||[]).filter(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;return b.life>0&&b.x>-20&&b.x<innerWidth+20&&b.y>-20&&b.y<innerHeight+20});state.particles=state.particles.filter(pt=>{pt.x+=pt.vx;pt.y+=pt.vy;pt.life--;return pt.life>0});updateHUD();netSend({t:'pos',x:p.x,y:p.y,angle:p.angle,hp:p.hp});if(p.hp<=0&&!state.finished){netSend({t:'dead'});endMPMatch(!1)}}
function endMPMatch(win){if(state.finished)return;state.finished=!0;paused=!0;if(win){winStreak++;totalWins++;toast('🔥 '+winStreak+'x WIN STREAK!')}else{winStreak=0;totalLosses++;toast('💔 Streak broken')}const rt=document.getElementById('resultTitle'),rd=document.getElementById('resultDesc');rt.textContent=win?'🏆 VICTORY':'💀 DEFEATED';rt.style.color=win?'#22ff88':'#ff2d95';rd.textContent=win?'Coins: '+coins+' · Level: '+level+(winStreak>0?' 🔥 '+winStreak+'x STREAK':''):'You were eliminated.';document.getElementById('offlineResultBtns').style.display='none';document.getElementById('multiplayerResultBtns').style.display='flex';document.getElementById('resultScreen').dataset.win='0';hud.classList.add('hidden');show('result')}
function updateWinStreak(won){} // handled inline

// ---------- REMATCH ----------
let rematchRequested=!1,rematchAccepted=!1,rematchTimer=null;
function requestRematch(){if(!conn||!conn.open){toast('❌ Not connected');return}if(rematchRequested){toast('⏳ Already requested');return}rematchRequested=!0;netSend({t:'rematch_request'});toast('📨 Rematch request sent!');showRematchWaiting()}
function showRematchWaiting(){const o=document.createElement('div');o.id='rematchOverlay';o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Orbitron,sans-serif;';o.innerHTML='<div style="color:#00d4ff;font-size:28px;margin-bottom:10px;">⏳ WAITING</div><div style="color:#6b7b9a;font-size:14px;margin-bottom:20px;">Waiting for opponent to accept...</div><button onclick="cancelRematch()" class="btn" style="margin-top:20px;min-width:200px;">❌ Cancel</button>';document.body.appendChild(o)}
function cancelRematch(){rematchRequested=!1;rematchAccepted=!1;if(rematchTimer){clearInterval(rematchTimer);rematchTimer=null}const o=document.getElementById('rematchOverlay');if(o)o.remove();toast('❌ Rematch cancelled')}
function showRematchRequest(){const o=document.createElement('div');o.id='rematchRequestOverlay';o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Orbitron,sans-serif;';o.innerHTML='<div style="color:#ff6b35;font-size:24px;margin-bottom:10px;">🔄 REMATCH REQUEST</div><div style="color:#e8f0ff;font-size:14px;margin-bottom:20px;">Opponent wants to play again!</div><div style="display:flex;gap:10px;"><button onclick="acceptRematch()" class="btn primary" style="min-width:120px;">✅ Accept</button><button onclick="declineRematch()" class="btn danger" style="min-width:120px;">❌ Decline</button></div>';document.body.appendChild(o)}
function acceptRematch(){const o=document.getElementById('rematchRequestOverlay');if(o)o.remove();rematchAccepted=!0;netSend({t:'rematch_accept'});toast('✅ Rematch accepted!');resetWeapon();setTimeout(()=>startMultiplayerMatch(!isHost),500)}
function declineRematch(){const o=document.getElementById('rematchRequestOverlay');if(o)o.remove();netSend({t:'rematch_decline'});toast('❌ Rematch declined')}
function handleRematchData(data){if(data.t==='rematch_request')showRematchRequest();else if(data.t==='rematch_accept'){rematchAccepted=!0;const o=document.getElementById('rematchOverlay');if(o)o.remove();toast('✅ Opponent accepted!');resetWeapon();setTimeout(()=>startMultiplayerMatch(isHost),500)}else if(data.t==='rematch_decline'){const o=document.getElementById('rematchOverlay');if(o)o.remove();rematchRequested=!1;toast('❌ Opponent declined')}}

// ---------- DAILY MISSIONS ----------
let dailyMissions=JSON.parse(localStorage.getItem('strikeZone_daily'))||{date:new Date().toDateString(),missions:[]};
const DAILY_MISSIONS=[{id:'daily_kill',name:'Kill 10 enemies',target:10,type:'kills',reward:50},{id:'daily_win',name:'Win 1 mission',target:1,type:'wins',reward:75},{id:'daily_headshot',name:'Get 5 headshots',target:5,type:'headshots',reward:60}];
function resetDailyMissions(){const today=new Date().toDateString();if(dailyMissions.date!==today){dailyMissions={date:today,missions:DAILY_MISSIONS.map(m=>({...m,progress:0,completed:!1}))};localStorage.setItem('strikeZone_daily',JSON.stringify(dailyMissions))}}
resetDailyMissions();

function updateDailyProgress(type,amount=1){dailyMissions.missions.forEach(m=>{if(m.type===type&&!m.completed){m.progress=Math.min(m.target,m.progress+amount);if(m.progress>=m.target){m.completed=!0;addCoins(m.reward);toast('📅 DAILY COMPLETE: '+m.name+'! +'+m.reward+' COINS')}}});localStorage.setItem('strikeZone_daily',JSON.stringify(dailyMissions));updateDailyUI();updateMainMenuDaily()}
function updateDailyUI(){const l=document.getElementById('dailyMissionListFull');if(l)l.innerHTML=dailyMissions.missions.map(m=>`<div class="mission-item"><span>${m.completed?'✅':'⏳'} ${m.name}</span><span class="progress">${m.progress}/${m.target} ${m.completed?' (+'+m.reward+'💰)':''}</span></div>`).join('')}
// NEW: Update main menu daily missions
function updateMainMenuDaily(){const l=document.getElementById('dailyMissionListMain');if(l)l.innerHTML=dailyMissions.missions.map(m=>`<div class="d-item"><span>${m.completed?'✅':'⏳'} ${m.name}</span><span class="d-progress">${m.progress}/${m.target}</span><span class="d-reward">+${m.reward}💰</span></div>`).join('')}

// ---------- ACHIEVEMENTS ----------
const ACHIEVEMENTS=[{id:'first_kill',name:'First Blood',desc:'Get your first kill',check:()=>killCount>=1,reward:50},{id:'kill_50',name:'Killer Instinct',desc:'Kill 50 enemies',check:()=>killCount>=50,reward:200},{id:'survive_60',name:'Survivor',desc:'Survive 60 seconds',check:()=>state&&state.elapsed>=60,reward:150},{id:'combo_10',name:'Combo Master',desc:'Reach 10x combo',check:()=>comboCount>=10,reward:300},{id:'win_10',name:'Champion',desc:'Win 10 missions',check:()=>totalWins>=10,reward:500}];
let unlockedAchievements=JSON.parse(localStorage.getItem('strikeZone_achievements'))||[];
function checkAchievements(){ACHIEVEMENTS.forEach(a=>{if(!unlockedAchievements.includes(a.id)&&a.check()){unlockedAchievements.push(a.id);localStorage.setItem('strikeZone_achievements',JSON.stringify(unlockedAchievements));addCoins(a.reward);toast('🏆 ACHIEVEMENT: '+a.name+'! +'+a.reward+' COINS');showAnnouncement('🏆 '+a.name)}})}
function updateProgressionUI(){const l=document.getElementById('achievementList');if(l)l.innerHTML=ACHIEVEMENTS.map(a=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">${unlockedAchievements.includes(a.id)?'✅':'⬜'} ${a.name} — ${a.desc} ${unlockedAchievements.includes(a.id)?'(+'+a.reward+'💰)':''}</div>`).join('');const s=document.getElementById('skinList');if(s)s.innerHTML='Skins coming soon!'}

// ---------- CHAT ----------
let chatMessages=[],chatOpen=!1;
function initChatUI(){const c=document.getElementById('chatContainer');c.innerHTML='<div id="chatMessages" style="flex:1;overflow-y:auto;color:#e8f0ff;font-size:12px;font-family:monospace;margin-bottom:8px;"></div><div style="display:flex;gap:6px;"><input id="chatInput" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px;color:#fff;font-size:12px;" placeholder="Type..."><button id="chatSend" class="action-btn reload-btn" style="padding:6px 12px;">SEND</button></div>';document.getElementById('chatSend').onclick=sendChatMessage;document.getElementById('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')sendChatMessage()})}
function sendChatMessage(){const input=document.getElementById('chatInput');if(!input.value.trim())return;const msg=input.value.trim();input.value='';const username=isHost?'Host':playerName;const full=username+': '+msg;chatMessages.push(full);updateChatUI();if(conn&&conn.open)netSend({t:'chat',msg:full})}
function updateChatUI(){const c=document.getElementById('chatMessages');if(!c)return;c.innerHTML=chatMessages.map(m=>'<div>'+m+'</div>').join('');c.scrollTop=c.scrollHeight}
function toggleChat(){chatOpen=!chatOpen;document.getElementById('chatContainer').style.display=chatOpen?'flex':'none';if(chatOpen)document.getElementById('chatInput').focus()}

// ---------- SPECTATOR ----------
let spectatorMode=!1;
function toggleSpectator(){if(mode==='offline'){toast('⛔ Spectator mode only in Multiplayer');return}spectatorMode=!spectatorMode;if(state)state.player.spectating=spectatorMode;toast(spectatorMode?'👁️ SPECTATOR ON':'👁️ SPECTATOR OFF')}

// ---------- PERFORMANCE ----------
let performanceMode=!1,frameCounter=0;
function togglePerformanceMode(){performanceMode=!performanceMode;toast(performanceMode?'⚡ PERFORMANCE MODE ON (30fps)':'⚡ PERFORMANCE MODE OFF')}
let batterySaver=!1,batteryLevel=1;
if(navigator.getBattery){navigator.getBattery().then(b=>{batteryLevel=b.level;b.addEventListener('levelchange',()=>{batteryLevel=b.level;if(batteryLevel<.2&&!batterySaver){batterySaver=!0;togglePerformanceMode();toast('🔋 BATTERY SAVER ACTIVATED')}})})}
function toggleBatterySaver(){batterySaver=!batterySaver;if(batterySaver){togglePerformanceMode();toast('🔋 BATTERY SAVER ON')}else toast('🔋 BATTERY SAVER OFF')}

// ---------- AUDIO ----------
let audioCtx=null,masterVolume=.6;
function initAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)()}
function playSound(type){initAudio();if(!audioCtx)return;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);g.gain.value=masterVolume*.3;switch(type){case'shoot':o.type='sawtooth';o.frequency.setValueAtTime(800,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(200,audioCtx.currentTime+.05);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.05);o.start();o.stop(audioCtx.currentTime+.05);break;case'explosion':o.type='sawtooth';o.frequency.setValueAtTime(150,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(40,audioCtx.currentTime+.3);g.gain.value=masterVolume*.5;g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.3);o.start();o.stop(audioCtx.currentTime+.3);break;case'kill':o.type='square';o.frequency.setValueAtTime(600,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(1200,audioCtx.currentTime+.1);g.gain.value=masterVolume*.4;g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.1);o.start();o.stop(audioCtx.currentTime+.1);break;case'powerup':o.type='sine';o.frequency.setValueAtTime(400,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(800,audioCtx.currentTime+.15);g.gain.value=masterVolume*.3;g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.15);o.start();o.stop(audioCtx.currentTime+.15);break}}catch(e){}}
function playVoiceLine(type){initAudio();if(!audioCtx)return;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);g.gain.value=masterVolume*.2;o.type='square';switch(type){case'mission_start':o.frequency.setValueAtTime(523,audioCtx.currentTime);o.frequency.setValueAtTime(659,audioCtx.currentTime+.15);o.frequency.setValueAtTime(784,audioCtx.currentTime+.3);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.5);o.start();o.stop(audioCtx.currentTime+.5);break;case'kill_streak':o.frequency.setValueAtTime(880,audioCtx.currentTime);o.frequency.setValueAtTime(1047,audioCtx.currentTime+.1);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.25);o.start();o.stop(audioCtx.currentTime+.25);break;case'game_over':o.frequency.setValueAtTime(330,audioCtx.currentTime);o.frequency.setValueAtTime(277,audioCtx.currentTime+.2);o.frequency.setValueAtTime(220,audioCtx.currentTime+.4);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.6);o.start();o.stop(audioCtx.currentTime+.6);break}}catch(e){}}
const originalToast=toast;toast=function(msg){originalToast(msg);if(msg.includes('BOSS'))playSound('explosion');if(msg.includes('LEVEL'))playSound('powerup');if(msg.includes('COMBO'))playSound('kill');if(msg.includes('VICTORY'))playVoiceLine('mission_start');if(msg.includes('FAILED'))playVoiceLine('game_over')};

// ---------- EXTRA ----------
function enterImmersive(){const el=document.documentElement;const req=el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen;if(req)try{req.call(el).catch(()=>{})}catch(e){}if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{})}
function checkOrientation(){const o=document.getElementById('rotateOverlay');if(isTouchDevice&&innerWidth<innerHeight&&state&&!state.finished)o.classList.add('show');else o.classList.remove('show')}
addEventListener('resize',checkOrientation);addEventListener('orientationchange',checkOrientation);

// ---------- CSS ANIMATIONS ----------
const style=document.createElement('style');
style.textContent='@keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-60px) scale(1.3)}}@keyframes announceIn{0%{opacity:0;transform:translate(-50%,-50%) scale(.5)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.2)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}';
document.head.appendChild(style);

// ---------- AUTO-JOIN ----------
window.addEventListener('load',()=>{
 setupWeaponButtons();initChatUI();updateMainMenuDaily();
 const params=new URLSearchParams(location.search),room=params.get('room');
 if(room){showMultiplayer();document.getElementById('joinInput').value=room;setTimeout(joinGame,400)}
 updateDailyUI();updateProgressionUI()
});