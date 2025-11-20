# SEE.io — Socxal Event Engine Frontend

Starter Next.js app scaffold for the SEE.io event discovery and organizer portal.

Getting started

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

Environment

Create a `.env.local` with keys. You can copy `.env.local.example` as a starting point.

Required for initial dev:

- NEXT_PUBLIC_SEE_API_URL — SEE.API base URL (example: https://socxalapi-prod-e3btc0b3h8bccsgv.eastus2-01.azurewebsites.net/SEEAPI)
- NEXT_PUBLIC_SOCXAL_API_URL — Socxal auth server base URL. For your environment use:
	https://socxalapi-prod-e3btc0b3h8bccsgv.eastus2-01.azurewebsites.net/SocxalAPI/

Firebase (required for Socxal -> Firebase token exchange flow):

- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

Stripe (for later):

- NEXT_PUBLIC_STRIPE_PK


Notes

- SEE.API handles authentication mapping and storage. The frontend authenticates against SocxalAPI (using `/api/Auth/login` or `/api/Auth/register`), calls `/api/Auth/exchange-to-firebase` to receive a Firebase custom token, signs into Firebase with that token, then calls SocxalAPI `/admin/auth/me` with the Firebase ID token to get the mapped SEE profile.
- For development, use the `.env.local.example` file we included. For production, set these environment variables in Vercel (or your deployment target) and prefer server-side httpOnly cookies for session tokens.

Server-side (production) secrets

- FIREBASE_SERVICE_ACCOUNT — JSON string for Firebase Admin SDK service account. Required for server-side session cookie creation and token verification. In Vercel, store this as a secret and set it as an environment variable.

Notes

- SEE.API handles authentication, user profiles, and storage for events in this architecture. The frontend calls SEE.API endpoints for auth, event CRUD, and media upload; we do not manage auth/storage directly in the frontend.
