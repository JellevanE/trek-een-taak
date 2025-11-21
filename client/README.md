# Client — Task Tracker

This README is the client-specific companion to the repository's root `README.md`.

Quick start (see root `README.md` for repo-wide quick start):

```bash
cd client
npm install
npm start
```

This project was bootstrapped with Create React App.

For client-specific scripts and advanced CRA guidance, keep this file as the place to document frontend developer notes.

## Theme & Sound FX system

- Theme tokens live in `client/src/theme/index.js`. Each entry in `THEME_PROFILES` may define `colors`, `animations`, `card`, `cta`, and `soundFx`.
- If you need new sound events:
  1. Add/extend the identifier in `SOUND_EVENT_KEYS` (`client/src/theme/index.js`).
  2. Attach tone/sample metadata under `themeProfile.soundFx.events[eventKey]`. Set `sources` (array of `{ src, type }` for WebM/MP3 assets under `client/public/sounds/`) and/or a `tone` definition.
  3. Wire gameplay hooks to the event by calling `soundFx.play(SOUND_EVENT_KEYS.YOUR_EVENT)` inside `useQuests`/feature logic. Existing examples live in `client/src/hooks/useQuests.js`.
- Runtime playback, volume persistence, and reduced-motion muting are handled by `useSoundFx` (`client/src/hooks/useSoundFx.js`). Most components only need to consume the provided controller via `useQuestBoard`.
- To preview themes and verify sounds, visit `/themes` while running the dev server. The preview grid renders all quest states per theme and mirrors the FX slider you see in the main UI.
- For a deeper explanation of which CSS animations are themeable versus structural, see `client/src/theme/THEME_NOTES.md`.
