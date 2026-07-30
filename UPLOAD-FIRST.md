# People First Network V3 — Upload First

This ZIP is a complete Vite project with one correct application structure.

## Repository contents to upload
Upload everything inside this folder to the ROOT of the GitHub repository:

- src/
- supabase/
- .env.example
- index.html
- package.json
- vite.config.js
- README.md
- worker-ai.js

The repository must show `src` as a folder. Do not upload the files inside `src` directly to the repository root.

## Required Cloudflare build settings
- Production branch: main
- Build command: npm run build
- Root directory: /
- Build output directory: dist

## Required application environment variables
Keep the same working values already used by the live app:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_AI_ENDPOINT

## Personalized AI notes
`src/pages/Profile.jsx` sends the complete person record and saved interaction history to the AI endpoint.

`worker-ai.js` is the replacement code for the AI Worker. It tells the model to:
- use only stored facts;
- never invent meetings, invitations, discussions, or compliments;
- mention concrete relationship details;
- write shorter notes when little evidence exists;
- return `note_evidence` showing which facts were used.

Deploy `worker-ai.js` separately in the Cloudflare Worker used by `VITE_AI_ENDPOINT`.

## Suggested commit message
Replace repository with complete PFN V3 application
