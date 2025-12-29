# Claude Instructions

## Project Structure
```
rocket-lander/
├── frontend/     # Next.js frontend (run commands from here)
├── backend/      # Backend server (placeholder)
└── shared/       # Shared types between frontend/backend
```

## Development Server
- NEVER start the dev server (`yarn dev`, `npm run dev`, etc.) - user manages this separately
- Commands can be run from root (e.g., `yarn dev`) or from `frontend/` directly

## Game Design Rules
- Level timer and total run timer (bottom corners) must ALWAYS run - including in start bubble, never pause
- Time bonus is awarded at end of each level based on completion time
- Multiplier bubbles increase end-of-stage score multiplier (riskier routes = higher multipliers)
- End-of-level screen: overlay with animated score counting up (time → multiplier → final score)
