# PFN Production + Email Login + Phase 1

## Upload to GitHub
Replace the repository with this package, preserving the folder structure. Commit:

`Enable production login and Phase 1 contact intelligence`

## Supabase
1. Open SQL Editor.
2. Run `supabase/003_production_auth_and_phase1.sql`.
3. Authentication > Providers > Email: enable Email.
4. Authentication > URL Configuration:
   - Site URL: `https://samdirito.com`
   - Redirect URLs: `https://samdirito.com/**` and `https://people-first-network.pages.dev/**`
5. To keep the app private, turn OFF “Allow new users to sign up” after creating Sam’s account.

### Existing contacts
If old contacts have a blank owner_id, run this after Sam creates/signs into his account. Replace the UUID with Sam's user ID from Authentication > Users:

```sql
update public.people set owner_id = 'SAM-USER-UUID' where owner_id is null;
update public.interactions set owner_id = 'SAM-USER-UUID' where owner_id is null;
update public.events set owner_id = 'SAM-USER-UUID' where owner_id is null;
```

## Cloudflare Pages variables
Settings > Variables and Secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AI_ENDPOINT`

Redeploy after adding/changing VITE variables.

## AI Worker
Replace the existing AI Worker code with `worker-ai.js`. Add:
- Secret: `OPENAI_API_KEY`
- Variable: `OPENAI_MODEL` = `gpt-5-mini`
- Variable: `SUPABASE_URL`
- Secret or variable: `SUPABASE_ANON_KEY`

Deploy the Worker. Phase 1 verifies the signed-in Supabase user, researches current public sources, stores structured intelligence on the contact, creates grounded questions, and writes the card only from Sam's saved relationship evidence.
