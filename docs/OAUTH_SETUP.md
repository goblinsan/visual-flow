# OAuth / Sign-in Setup (Cloudflare Access)

This project relies on Cloudflare Access for human user authentication. Cloudflare Access can be configured to permit sign-in via Google, GitHub, and Apple (as well as other IdPs). The repository includes a simple front-end `SignIn` component which redirects users to the Cloudflare Access sign-in and sign-out endpoints.

This document explains how to enable the OAuth providers in Cloudflare Access and some optional notes on a custom OAuth implementation.

## Recommended approach: Cloudflare Access (production-ready)

1. In the Cloudflare dashboard, select the account and site hosting your app (the domain that serves the app).
2. Go to `Access` → `Applications` and create an **Application** for your app (type: `Self-hosted` or `Login with CF Access`).
3. Under **Application settings** set the `Application domain` to your app domain (e.g. `app.example.com`).
4. Under **Identity providers** add the providers you want:
   - **Google**: Add Google as an IdP and follow steps to configure OAuth client (Cloudflare UI will guide you to create a Google OAuth Client ID / secret in Google Cloud Console). Supply authorized redirect URIs that Cloudflare lists.
   - **GitHub**: Add GitHub and create an OAuth app in GitHub (set the callback/redirect URL per Cloudflare instructions). Use the Client ID/Secret in Cloudflare.
   - **Apple**: Add Apple (Sign in with Apple) in Cloudflare — Apple requires you to register a Service ID and configure keys in the Apple Developer portal. Cloudflare's UI shows required values.
5. Configure **Policies** for the Access Application (allow emails, teams, or any authenticated user depending on your org). Example policy: `Emails ending with @your-org.com` or `Allow specific emails`.
6. After saving the application and IdPs, users visiting your app will be redirected to Cloudflare Access when they hit a protected route. The SignIn component in the app redirects to `/_cf_access/sign_in` on the same origin and will show available providers.

### Sign-in and Sign-out URLs
- Sign-in redirect (used by the `SignIn` component): `https://<your-app>/ _cf_access/sign_in?redirect_url=<encoded_return>`
- Sign-out redirect: `https://<your-app>/cdn-cgi/access/logout?redirect=<encoded_return>`

Note: Cloudflare Access sets the header `CF-Access-Authenticated-User-Email` on requests proxied through Access. Server-side code (Cloudflare Workers) in this repo already checks that header and maps it to a user.

## Optional: Implement your own OAuth callbacks (Workers)

If you prefer not to use Cloudflare Access or want to implement provider-specific flows inside the Workers API, you'll need to:

1. Create OAuth applications in Google, GitHub, and Apple consoles and record Client ID / Client Secret and required redirect URLs.
2. Add secure storage for secrets (Workers `wrangler` `secrets` or environment variables via `wrangler.toml`/KV/Secrets). Do NOT commit secrets to the repo.
3. Implement endpoints in the Workers API that perform the OAuth authorization flow:
   - `GET /auth/:provider/start` — redirect user to provider's authorization URL (scope, client_id, redirect_uri, state)
   - `GET /auth/:provider/callback` — provider redirects here with `code` and `state`; exchange `code` for tokens (POST to provider), validate `state` and then identify user email from token/userinfo.
4. On successful auth, create a session cookie (HttpOnly, Secure, SameSite=Lax/Strict) or issue an internal token that the front-end will send on subsequent requests.
5. Update the Workers `authenticateUser` logic to accept the session mechanism you've implemented.

This repo already contains authentication helpers under `workers/api/src/auth.ts` that expect `CF-Access-Authenticated-User-Email` in production and `X-User-Email` for local testing. If you implement custom OAuth, make sure your callback sets a cookie or header the API recognizes.

## Local development tips
- For fast local testing you can set the header `CF-Access-Authenticated-User-Email` in curl requests (the Workers API accepts `X-User-Email` in development). Example used in test scripts:

```bash
curl -H "CF-Access-Authenticated-User-Email: you@example.com" http://localhost:62587/api/canvases
```

- You can also simulate sign-in by adding `X-User-Email` in local requests when `ENVIRONMENT !== 'production'`.

## Summary
- Recommended: Use Cloudflare Access to enable Google, GitHub and Apple authentication without implementing provider code.
- This repo includes a simple `SignIn` UI that redirects to Cloudflare Access sign-in and sign-out endpoints.
- If you need a custom OAuth implementation, implement the `/auth/*` flows in `workers/api` and store secrets securely.
