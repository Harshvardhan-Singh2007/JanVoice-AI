# JAN Voice AI buildathon demo setup

This guide creates a controlled demo workflow using synthetic reports. Do not point the demo at a production database or use real citizen data.

## Before demo day

1. Create a dedicated, empty MongoDB development/staging database such as `janvoice_stage7_demo`. Use a database user limited to that database. Keep the connection string private.
2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI`, `JWT_SECRET` (32+ characters), and `CLIENT_URL=http://localhost:5173`. Add backend-only Gemini and Cloudinary credentials only if those parts of the demo will be shown.
3. Copy `frontend/.env.example` to `frontend/.env`. Set `VITE_API_BASE_URL=http://localhost:5000`. Keep all backend credentials out of this file.
4. Install and start the app from the repository root with `npm install` and `npm run dev`.
5. Confirm the backend is ready at `http://localhost:5000/api/health`; it should report the database as connected.
6. Register one Citizen through the public signup page. Public registration can only create Citizen accounts.
7. Prepare an Admin and an Authority account in this isolated demo database using your trusted staging account-provisioning process. The application has no staff-account creation UI or seeder. Do not promote a production Citizen or copy production account records. Configure a test department for the Authority before the live workflow.
8. Confirm sign-in for all three demo roles before presenting. Keep demo passwords in a private password manager and never commit them to this repository or presentation materials.

If you cannot securely provision the Admin and Authority accounts, present the Citizen workflow and explain the staff workflow from the interface walkthrough without claiming that a live role-based handoff was demonstrated.

## Suggested synthetic scenario

Use a clearly fictional place, for example: “A streetlight near Sample Park on Example Road has been out for two nights.” Do not use a real resident's name, phone, home address, photograph, or precise GPS coordinate.

## Live walkthrough

1. On the landing page, explain that JAN Voice AI is a prototype and has no government integration.
2. Register or sign in as the Citizen. Show that public signup creates only a Citizen account.
3. Open **Report Issue**. Enter a synthetic title, description, category, and fictional location.
4. Optionally run Gemini analysis when a backend key is configured. Explain that its category, department, priority, language, and summary are suggestions. Review or edit them before submission. If Gemini is unavailable, submit without AI.
5. Optionally dictate a transcript in a supported browser. Review the text. Explain that the app sends the transcript; browser speech recognition behavior may depend on the browser/provider.
6. Optionally press **Share current location** from a localhost/secure browser context and grant permission. Explain that GPS is optional and map markers are approximate. Skipping GPS must not block submission.
7. Optionally run the possible-duplicate check. Show the warning/reference, and explain that it neither blocks nor merges reports.
8. Submit and show the report in **My Reports**. Open its timeline and status history. The initial Pending state is an application workflow state, not an official receipt.
9. Sign in as the test Admin. Assign the report to the test Authority's existing department. Use the queue's details action to show the saved assignment.
10. Sign in as that Authority. Verify the scoped queue shows the report. Record a permitted status update and remarks.
11. Return to the Citizen account. Refresh **My Reports** and **Notifications** to show the update saved by the backend.
12. Show the map's graceful empty/unavailable state if no test report used coordinates or tile access is disabled.

## Optional integrations

- Gemini: set `GEMINI_API_KEY` in the backend environment only. A live Gemini request was not validated by this guide; test the configured key in staging before relying on it during the presentation.
- Cloudinary: set all three Cloudinary backend variables. If absent, skip image upload in the demo.
- Browser GPS, microphone permission, speech recognition, and external OSM tiles: verify in the actual presentation browser. Use localhost or HTTPS for browser permission APIs.

## Demo safety

- Use only an isolated staging database and synthetic records.
- Never run a seed or cleanup operation against production. This repository does not include an automated seeder or destructive reset command.
- Do not show credentials, backend environment screens, private tokens, or private account details to the audience.
- Do not describe staff-entered status as a government action, official delivery, verified outcome, or measured impact.
