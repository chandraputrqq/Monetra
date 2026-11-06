# MONETRA Personal v1

MONETRA is a personal finance tracker for one person. This version does not require an account, login, Supabase, or a cloud database.

## Privacy and storage

- Transactions, budgets, and savings goals are stored in the browser Local Storage on the current browser profile and website origin.
- Data is not synchronized between devices or browsers.
- Use Settings → Download backup to export a JSON copy.
- Use Settings → Import backup to restore that JSON file on this or another device.
- Clearing browser data may erase MONETRA records. Keep backups somewhere safe.

## Run locally

Install Node.js LTS, open this folder in a terminal, then run:

```bash
npm install
npm run dev
```

Open the local address printed by Vite (usually http://localhost:5173).

## Build

```bash
npm run build
```

## Important privacy note

Local Storage is not encrypted and is accessible to scripts running on the same website origin. Do not use a shared/public computer or browser profile for sensitive financial records. A deployed website can still be visited by people who know its URL; Local Storage keeps each visitor's data separate, it does not make the website itself private. For strictly private use, run MONETRA locally or enable access protection on the hosting project.
