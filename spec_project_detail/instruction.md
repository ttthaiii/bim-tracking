# Instruction & Standards

## 1. Tech Stack
- **Frontend**: Next.js 15.5.3 (App Router), React 19.1.0, TypeScript
- **Styling**: TailwindCSS 3.4.14, MUI Material 7.3.2, Emotion
- **Backend**: Firebase (Firestore, Functions, Auth)
- **State Management**: React Context, Local Component State
- **Utilities**: Lodash, Day.js (implied or similar), Recharts/Chart.js

## 2. Development Workflow
### Prerequisites
- Node.js (v20+ recommended)
- `npm` or `yarn`

### How to Run (Local)
1. **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   - Runs on `http://localhost:3000`
   - Connects to **Production/Dev Firebase** (Check `src/lib/firebase.ts`)

2. **Backend (Functions)**:
   ```bash
   cd functions
   npm install
   npm run serve
   ```
   - Required only if modifying Cloud Functions locally.

## 3. Project Structure
- `frontend/`: Next.js Application
  - `src/app/`: App Router Pages
  - `src/components/`: Reusable Components
  - `src/contexts/`: Global State Contexts
  - `src/types/`: TypeScript Interfaces (Database models)
  - `src/services/`: API/Firebase interactions
  - `src/utils/`: Helper functions
- `functions/`: Firebase Cloud Functions (Backend Logic)

## 3. Conventions
- **Naming**: camelCase for functions/vars, PascalCase for Components/Interfaces.
- **Types**: All data models in `src/types/`.
- **Imports**: Relative imports or alias if configured.
- **Styling**: Tailwind classes preferred, with MUI components for complex UI.
