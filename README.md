# Strike Zone — Shooting Game

Top-down shooter. Offline missions + Online 1v1 multiplayer via shareable link.
No coins/currency system. PWA — installable on Android home screen, offline-capable.

## Files
- `index.html` — screens/UI
- `game.js` — game engine (offline AI missions + PeerJS multiplayer)
- `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png` — PWA/offline support

---

## 1. Local live test (apne PC/phone pe turant dekhna)

Browsers file:// se service worker aur camera-jaisi APIs allow nahi karte, isliye
local server chalana zaroori hai. Terminal me:

```bash
cd shooter-game
python3 -m http.server 8080
```

Phir browser me kholo: `http://localhost:8080`

Same WiFi pe phone se test karna ho toh apne PC ka local IP nikalo
(`ipconfig` / `ifconfig`) aur phone browser me `http://192.168.x.x:8080` kholo.
Do devices/tabs kholo — ek "Create Room", dusra link paste karke "Join" — multiplayer live test ho jayega.

## 2. Free live hosting (public URL, taake link kahin bhi kaam kare)

**Sabse aasan: GitHub Pages (free, permanent link)**
1. GitHub pe naya repo banao (e.g. `strike-zone`)
2. Ye poora `shooter-game` folder push kardo
3. Repo → Settings → Pages → Source: `main` branch, `/root` → Save
4. 1-2 min me live URL milega: `https://<username>.github.io/strike-zone/`

**Alternative (drag-and-drop, no git needed): Netlify Drop**
- https://app.netlify.com/drop pe jaake pura folder drag-drop karo, turant live link mil jayega.

Ye link hi tum players ko bhejoge for multiplayer (they open it, join room code).

## 3. APK file (Android install karne ke liye)

Is sandbox environment me Android SDK/Gradle nahi hai, isliye main real .apk yahan
compile nahi kar sakta. Lekin hosting ke baad, **PWABuilder** (Microsoft ka free
official tool) se 2 minute me APK ban jata hai — bina coding, bina bugs ke:

1. Apna live URL (step 2 wala) hosted hona chahiye (zaroori hai)
2. https://www.pwabuilder.com pe jao, apna URL paste karo, "Start"
3. Ye tumhara manifest.json + sw.js detect karega (already isi liye add kiya hai)
4. "Android" package select karo → "Generate" → APK/AAB download hoga
5. Us APK ko phone me install karo (unknown sources allow karna padega)

Yehi tareeqa Google khud recommend karta hai PWA-to-APK ke liye, safe aur bug-free hai
kyunki koi custom native code nahi likha, sirf tumhara existing web game wrap hota hai.

## Gameplay notes
- **Offline Missions**: 5 missions (eliminate / survive / defend types), bots ke against,
  koi internet zaroori nahi, koi coins/currency nahi — pure skill objectives.
- **Online Multiplayer**: Host "Create Room" dabata hai → link/code milta hai → dusra player
  wahi link kholta hai, auto-join ho jata hai. Connection WebRTC (peer-to-peer) hai, isliye
  connect hone ke baad data bohot halka jata hai (position + shot events only) — weak/laggy
  net pe bhi chalne layak hai. (Bilkul zero-internet pe multiplayer possible nahi — us ke liye
  hi Offline Missions mode hai.)
- Controls: PC pe WASD + mouse aim + click to fire. Mobile pe left joystick + right FIRE button,
  screen ke right half pe drag karke aim.

## Agar kuch add/change karwana ho
Bata dena — waves ki difficulty, mission count, graphics style (character sprites, maps),
ya damage/health balance sab easily tweak ho sakta hai `game.js` me.
