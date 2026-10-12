MAK MART

Student marketplace for the Makerere University community: products, events and campus services. Built with React 18 + Vite + Supabase (Postgres, Auth, Storage). Installable as a PWA.

Local development
bash
npm install
cp .env.example .env      # then fill in your two Supabase values
npm run dev
Command	What it does
npm run dev	Start the dev server
npm run build	Production build into dist/
npm run preview	Preview the production build
npm run lint	Run ESLint
npm test	Run unit tests (Vitest)
Environment variables
Variable	Where to find it
VITE_SUPABASE_URL	Supabase -> Project Settings -> API
VITE_SUPABASE_PUBLISHABLE_KEY	Same page (the anon / publishable key)

Never put the service_role key in a VITE_ variable - it would be public.

Database setup

See supabase/README.md for the exact order to run the SQL files and how to create the first admin.

Deploying

The build output is a static site (dist/).

Create the Supabase project and run the SQL (see above).
In Supabase -> Authentication -> URL Configuration, set Site URL to your live URL and add https://YOUR-DOMAIN/update-password and https://YOUR-DOMAIN/login to Redirect URLs (password-reset and confirmation emails link back to these).
Create the site on Netlify or Vercel:
Build command: npm run build
Publish directory: dist
Environment variables: the two VITE_ values above
Single-page-app routing is already configured (public/_redirects for Netlify, vercel.json for Vercel), so refreshing any URL works.
Accounts and roles
Who	Sign up at	After signing up
Customer	/signup	Can place orders that are recorded in the database
Vendor	/vendor/signup	Waits for admin approval, then dashboard at /vendor
Service provider	/provider/signup	Waits for admin approval, then dashboard at /provider
Admin	(created by SQL)	Dashboard at /admin

Guests can still order through WhatsApp without an account.