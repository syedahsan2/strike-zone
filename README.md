# Strike Zone — Shooting Game

A top-down shooter featuring offline missions and online 1v1 multiplayer functionality via shareable links. The game operates without any in-app currency or coin systems. It is built as a Progressive Web App (PWA), making it installable on Android home screens with offline capabilities.

## Project Structure
- `index.html` — UI screens and interface components
- `game.js` — Core game engine (offline AI missions + PeerJS multiplayer implementation)
- `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png` — PWA configuration for offline support and installation

---

## 1. Local Testing Environment

The `file://` protocol in browsers does not support service workers or camera-related APIs. Therefore, a local server is required for testing. Execute the following command in your terminal:

```bash
cd shooter-game
python3 -m http.server 8080
```

Access the game at: `http://localhost:8080`

For mobile device testing on the same WiFi network, retrieve your PC's local IP address (`ipconfig` / `ifconfig`) and open `http://192.168.x.x:8080` in your phone's browser. To test multiplayer functionality, open two devices/tabs — one to "Create Room" and the other to "Join" using the provided link.

## 2. Free Public Hosting Deployment

**Recommended: GitHub Pages (Free, Permanent URL)**
1. Create a new repository on GitHub (e.g., `strike-zone`)
2. Push the entire `shooter-game` folder to the repository
3. Navigate to Repository → Settings → Pages → Source: `main` branch, `/root` → Save
4. Within 1-2 minutes, your live URL will be available: `https://<username>.github.io/strike-zone/`

**Alternative (No Git Required): Netlify Drop**
- Visit https://app.netlify.com/drop and drag-and-drop the entire folder for an instant live link.

This URL serves as the multiplayer entry point — players simply open the link and enter the room code to join.

## 3. APK Generation for Android Installation

Due to the sandboxed environment lacking Android SDK/Gradle, direct APK compilation is not feasible. However, after hosting, **PWABuilder** (Microsoft's official tool) can generate an APK within minutes — no coding required:

1. Ensure your live URL (from step 2) is hosted and accessible
2. Visit https://www.pwabuilder.com, paste your URL, and click "Start"
3. The tool will automatically detect your `manifest.json` and `sw.js` files (pre-configured for this purpose)
4. Select the "Android" package → Click "Generate" → Download the APK/AAB file
5. Install the APK on your phone (enable "Install from unknown sources" if prompted)

This is Google's recommended approach for PWA-to-APK conversion, ensuring a bug-free, secure process as it wraps your existing web game without custom native code.

## Gameplay Specifications

- **Offline Missions**: 5 mission types (elimination, survival, defense) against AI bots. No internet connection required. No coins or currency — purely skill-based objective completion.
- **Online Multiplayer**: Host clicks "Create Room" to generate a link/code. The second player opens the same link and automatically joins. Connection utilizes WebRTC (peer-to-peer), transmitting minimal data (only position and shot events) — optimized for low-bandwidth or unstable connections. (Note: Zero-internet multiplayer is not possible; the Offline Missions mode serves this purpose.)
- **Controls**: 
  - PC: WASD for movement, mouse for aiming, click to fire
  - Mobile: Left joystick for movement, right FIRE button, drag on the right half of the screen to aim

## Customization Options

Please inform me if you require any modifications or additions — difficulty scaling, mission count adjustments, graphical style changes (character sprites, maps), or damage/health balancing can be easily tweaked within `game.js`.
