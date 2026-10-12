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


## Backup e transferência entre dispositivos (v1.8.0)

Na aba **Histórico**, use **Exportar backup** no dispositivo de origem. O app baixa um arquivo `shot-track-backup-AAAA-MM-DD.json`. Transfira esse arquivo para o outro dispositivo (por cabo, AirDrop, Drive ou outro meio privado), abra o Shot Track nele e use **Importar backup**.

A importação valida o formato e pede confirmação antes de substituir os dados locais atuais. Se o aparelho de destino já tiver registros, exporte primeiro um backup dele caso queira preservá-los. O arquivo inclui aplicações, planos, substâncias e locais; mantenha-o em local privado, pois contém dados pessoais.

Este recurso transfere dados manualmente: não sincroniza automaticamente computador e celular.
