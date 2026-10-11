# Shot Track v1.7.0 — Mobile-first

Redesign mobile-first with a fixed bottom navigation and separate views for Home, Calendar, Plans, History and More.

## Features retained
- Local persistence through Zustand/localStorage
- Injection history and application plans
- Global location rotation suggestions
- Brand and concentration presets
- Intramuscular/subcutaneous application type
- Multi-substance same-syringe recording flow
- PWA manifest and service worker

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

Data remains in the browser's localStorage. This redesign does not migrate data or add cloud sync. Back up local data before changing browsers/devices.
