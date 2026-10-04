# Abroad Fund

A private desk for one Pakistani rupee account. You type every entry. There is no bank connection.

The website (this Next.js app) goes on Vercel. The API and MySQL database go on your VPS. Every device reads that one database.

Remaining balance is opening balance + money in − money out. The trip target is separate from the opening balance.

## Database

On the VPS, create the tables:

```bash
mysql -u root -p < backend/schema.sql
```

The file is `backend/schema.sql`. It creates the `abroad_fund` database, the `settings` row, and the `entries` table.

## API on the VPS

```bash
cd backend
cp .env.example .env
```

Edit `.env`: MySQL user, password, database, `LEDGER_KEY`, and `CORS_ORIGIN` (your Vercel address).

```bash
npm install
npm start
```

The API listens on port 4000. Open that port, or put Nginx in front of it. Check `http://YOUR_SERVER:4000/health`.

## Website on Vercel

1. Import this GitHub repository.
2. Set `NEXT_PUBLIC_API_URL` to `http://YOUR_SERVER:4000` (or `https://` if you added a certificate). No slash at the end.
3. Deploy.

On each phone and laptop, open the site and enter the same `LEDGER_KEY` once. Without that key on the VPS, anyone who can reach the API can read and edit the desk.

## Run both on this computer

Start MySQL, import `backend/schema.sql`, then:

```bash
cd backend
npm install
npm start
```

In another terminal, from the project folder:

```bash
npm run dev -- -p 3847
```

Open http://localhost:3847. `.env.local` already points the site at `http://localhost:4000`.
