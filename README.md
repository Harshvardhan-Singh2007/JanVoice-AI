# JanVoice AI

JanVoice AI is an AI-powered civic issue reporting platform. This repository currently contains project initialization only: no application pages, API routes, database models, authentication flows, or AI features have been implemented.

## Technology

- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, Axios, Framer Motion, React Hook Form
- Backend: Node.js, Express, TypeScript
- Planned integrations: MongoDB Atlas, JWT, Cloudinary, Google Maps, OpenAI API

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A MongoDB Atlas project, Cloudinary account, Google Maps API key, and OpenAI API key when those integrations are implemented

## Installation

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

   On PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Fill in the required values in `.env`. Before backend configuration is expanded, copy the backend variables into `backend/.env`; copy the `VITE_*` variables into `frontend/.env`.

3. Install workspace dependencies:

   ```bash
   npm install
   ```

4. Start both development servers:

   ```bash
   npm run dev
   ```

   Frontend defaults to `http://localhost:5173`; backend defaults to `http://localhost:5000`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run frontend and backend development servers together |
| `npm run dev:frontend` | Run the Vite frontend only |
| `npm run dev:backend` | Run the Express backend only |
| `npm run build` | Build both workspaces |
| `npm run typecheck` | Type-check both workspaces |
| `npm run lint` | Lint both workspaces |

See [docs/development-roadmap.md](docs/development-roadmap.md) for the staged implementation plan.
