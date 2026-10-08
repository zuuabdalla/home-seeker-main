# HomeFinder Kenya

A house-hunting site for Kenya. House hunters browse verified listings, save favourites, message landlords and book viewings without creating an account. Landlords and agents manage listings, inquiries and viewings from a dashboard, and can pay through M-Pesa to feature a listing. Admins review every listing before it goes live.

**Stack:** Node.js 18+, Express 5, EJS templates, MySQL. No front-end framework or build step.

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the database. This also loads demo data:

   ```bash
   mysql -u root -p < database/homefinder.sql
   ```

3. Configure the app. Copy `.env.example` to `.env`, then fill in your database login and a `SESSION_SECRET`:

   ```bash
   cp .env.example .env
   ```

4. Start the app with auto-reload:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000.

### Using XAMPP (Windows or Mac)

1. Open the XAMPP Control Panel and start **MySQL**. Apache is not needed.
2. Import the database in one of these two ways:
   - **phpMyAdmin:** start Apache too, open http://localhost/phpmyadmin, click **Import**, choose `database/homefinder.sql` and click **Go**.
   - **Command line (Mac):**
     ```bash
     /Applications/XAMPP/xamppfiles/bin/mysql -u root < database/homefinder.sql
     ```
   - **Command line (Windows):**
     ```bash
     C:\xampp\mysql\bin\mysql -u root < database\homefinder.sql
     ```
3. In `.env`, keep `DB_USER=root` and leave `DB_PASSWORD` empty (XAMPP's default), and set `DB_HOST=127.0.0.1`.
4. Run `npm install`, then `npm run dev`, and open http://localhost:3000.

Importing the SQL file replaces any existing `homefinder_db` database.

### Demo accounts

| Role     | Email                      | Password              |
|----------|----------------------------|-----------------------|
| Admin    | admin@homefinder.co.ke     | Admin@HomeFinder1     |
| Landlord | landlord@homefinder.co.ke  | Landlord@HomeFinder1  |
| Agent    | agent@homefinder.co.ke     | Agent@HomeFinder1     |

Change or delete these accounts before going live.

## Project layout

```
server.js            Starts the app (checks the DB, then listens)
app.js               Express setup: security headers, sessions, CSRF, routes
config/              Environment checks and the MySQL pool
lib/                 Constants, view helpers, input validation
middleware/          Login/role checks, CSRF + rate limits, image uploads
models/              One file per table; all SQL lives here
controllers/         Request handlers (public, auth, landlord, admin, payments, AI)
routes/              URL to controller mapping
services/            PayHero (M-Pesa) and Gemini (AI descriptions)
views/               EJS pages; partials/ holds the shared layout pieces
public/              CSS, JS, images and uploaded photos
scripts/check-views  Renders every page with sample data (npm run check)
```

## How the main flows work

- **Listings** are created as `pending`. An admin approves them at `/admin/properties`. Before that, only the owner and admins can see them. When a landlord edits a listing, it goes back to `pending`.
- **Inquiries and viewings** come from anonymous visitors. They are validated, rate limited, and notify the landlord.
- **Saved homes** are stored in the visitor's session, so no account is needed.
- **Payments:** the landlord picks a package, and PayHero sends an M-Pesa prompt to their phone. When PayHero calls `/payments/callback`, we **ask PayHero for the transaction status ourselves**. Only a confirmed `SUCCESS` features the listing. The callback URL also carries a secret token. If a callback never arrives, landlords can press "Check status".

## Security notes

- Passwords are hashed with bcrypt (cost 12). Sessions are stored in MySQL, use httpOnly and sameSite cookies, and get a new ID on login.
- Every form carries a CSRF token, including uploads (checked after multer parses them).
- Rate limits cover login, registration, public contact forms and the AI endpoint.
- Helmet sets a strict Content-Security-Policy.
- Uploads accept JPG, PNG or WEBP only, get random file names, and are capped at 5 MB. Files are deleted when a listing or image is removed.
- In production (`NODE_ENV=production`), the app refuses to start without a strong `SESSION_SECRET` or with payment simulation turned on.

## Useful commands

```bash
npm run dev      # start with auto-reload
npm start        # start for production
npm run check    # render every template with sample data
```
