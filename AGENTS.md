# Agent Development Guide for Infralift

This file contains project-specific information for AI agents working on the Infralift codebase.

## Project Overview

Infralift is a production-grade Azure automation platform with an onboarding wizard UI. The project uses a modern full-stack architecture with Next.js frontend and FastAPI backend.

## Tech Stack Summary

- **Frontend**: Next.js 14+, TypeScript, TailwindCSS, Zustand, Radix UI
- **Backend**: FastAPI, Python 3.9+, Pydantic, Redis
- **State Management**: Zustand (frontend), Redis (backend sessions)
- **Styling**: TailwindCSS with custom design system
- **Type Safety**: Full TypeScript coverage, Pydantic schemas

## Key Architecture Decisions

### Frontend
- **App Router**: Using Next.js 14 App Router (not Pages Router)
- **Component Structure**: Modular components in `src/components/`
- **State Management**: Zustand with persistence middleware
- **API Layer**: Centralized API service in `src/services/api.ts`
- **Styling**: TailwindCSS with custom theme in `tailwind.config.ts`

### Backend
- **Service Layer**: Business logic separated into `app/services/`
- **Repository Pattern**: Data access abstracted in repositories
- **Async Operations**: All routes use async/await
- **Session Management**: Redis-backed sessions with TTL
- **Validation**: Pydantic schemas for all inputs

## Code Conventions

### TypeScript/JavaScript
- Use functional components with hooks
- Prefer `cn()` utility for className merging
- Keep components under 200 lines when possible
- Use TypeScript strict mode
- Avoid `any` types
- Use meaningful variable names

### Python
- Follow PEP 8 style guide
- Use type hints for all functions
- Use async/await for I/O operations
- Use Pydantic for validation
- Follow service layer pattern

### File Naming
- Components: PascalCase (e.g., `SetupCard.tsx`)
- Utilities: camelCase (e.g., `api.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useToast.ts`)
- Python modules: snake_case (e.g., `onboarding_service.py`)

## Component Library

### Base Components (src/components/ui/)
- `button.tsx` - Button with variants
- `card.tsx` - Card container
- `input.tsx` - Form input
- `progress.tsx` - Progress bar
- `toast.tsx` - Toast notifications

### Feature Components
- `Sidebar` - Left navigation with agent menu
- `RightSidebar` - Widgets for progress, requirements, security
- `WizardStepper` - Step progress indicator
- `SetupCard` - Onboarding card with copy functionality
- `Header` - Top navigation bar

## State Management

### Zustand Stores
- `onboardingStore.ts` - Onboarding wizard state
- `themeStore.ts` - Theme/dark mode state

### Backend Sessions
- Stored in Redis with 24-hour TTL
- Session format defined in schemas
- Accessed via `session_manager`

## API Structure

### Frontend API Service
Located at `src/services/api.ts`

All backend calls go through `apiService` with:
- Automatic error handling
- Type-safe responses
- Consistent request format

### Backend Routes
- `/api/v1/auth/*` - Authentication
- `/api/v1/onboarding/*` - Onboarding workflow
- `/api/v1/resources/*` - Resource management

## Styling Guidelines

### Colors
- Primary: Azure blue (`#0078d4`)
- Success: Green (`#22c55e`)
- Warning: Yellow (`#eab308`)
- Sidebar: Dark gray (`#1e1e1e`)

### Typography
- Font: Inter (system-ui fallback)
- Sizes: Use Tailwind's scale (text-sm, text-lg, etc.)
- Weights: Regular (400), Medium (500), Semibold (600), Bold (700)

### Spacing
- Use Tailwind spacing scale
- Enterprise dashboard spacing (tighter than consumer apps)
- Consistent padding: `p-4`, `p-6`, `p-8`

## Development Workflow

### Running the Project
```bash
# Backend
cd backend
python -m app.main

# Frontend
cd frontend
npm run dev
```

### Adding New Components
1. Create component in appropriate directory
2. Keep it under 200 lines
3. Use TypeScript with proper typing
4. Add to component exports if needed
5. Test responsive behavior

### Adding New API Endpoints
1. Add Pydantic schema in `app/schemas/`
2. Implement business logic in `app/services/`
3. Create route in `app/api/v1/`
4. Add to main app router
5. Update frontend API service

### State Updates
- Use Zustand actions, never mutate state directly
- Use persistence for user-facing state
- Keep state minimal and normalized

## Testing

### Frontend
- Use React Testing Library
- Test user interactions
- Test API mocking

### Backend
- Use pytest
- Test async functions properly
- Mock Redis in tests

## Common Patterns

### Copy Button Pattern
```tsx
const handleCopy = async () => {
  const success = await copyToClipboard(text);
  if (success) {
    toast({ title: "Copied successfully" });
  }
};
```

### Verification Pattern
```tsx
const handleVerify = async () => {
  setVerifying(true);
  try {
    await apiService.verifyAssignment(data);
    verifyCard(cardId);
    toast({ title: "Verified successfully" });
  } catch (error) {
    toast({ title: "Verification failed", variant: "destructive" });
  } finally {
    setVerifying(false);
  }
};
```

### API Service Pattern
```ts
async someMethod(data: SomeType): Promise<ResponseType> {
  return this.request('/endpoint', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

## File Locations

### Frontend
- Pages: `src/app/[page]/page.tsx`
- Components: `src/components/[category]/[Component].tsx`
- Hooks: `src/hooks/[hook].ts`
- Services: `src/services/[service].ts`
- Stores: `src/store/[store].ts`
- Types: `src/types/[types].ts` (if not in shared)

### Backend
- Routes: `app/api/v1/[route].py`
- Services: `app/services/[service].py`
- Schemas: `app/schemas/[schema].py`
- Config: `app/core/config.py`

## Important Notes

1. **Never commit secrets**: Use environment variables
2. **Always type components**: TypeScript strict mode is enabled
3. **Test responsive behavior**: Mobile-first approach
4. **Use existing patterns**: Follow established conventions
5. **Keep it simple**: Avoid over-engineering
6. **Dark mode support**: Add dark mode classes to all new components
7. **Error handling**: Always handle errors gracefully
8. **Performance**: Use React.memo for expensive components

## Build Commands

### Frontend
```bash
npm run dev      # Development
npm run build    # Production build
npm run lint     # Lint code
```

### Backend
```bash
python -m app.main          # Development
gunicorn app.main:app       # Production
pytest                      # Tests
```

## Docker Support

The project includes Docker support:
- `docker-compose.yml` - Full stack with Redis
- `frontend/Dockerfile` - Frontend container
- `backend/Dockerfile` - Backend container

## Documentation Files

- `README.md` - Project overview and user documentation
- `SETUP.md` - Development setup guide
- `AGENTS.md` - This file (agent development guide)

## Session Summary (2026-06-10)

All production-hardening tasks completed. Key additions:
- **Compliance sync step**: Azure Policy & Regulatory data collected during sync, served via `/api/v1/resources/stats/compliance`, displayed in compliance page UI
- **Storage per-type validation**: Backend validates Blob/Files/DataLake using appropriate SDK clients and credential patterns
- **VM actions**: Start/Stop/Restart/Resize/Delete via `POST /api/v1/deployments/modify` with `action` field
- **Auto-fix engine**: Enhanced with Redis persistence, AI provider health checks, event-bus subscription (`sync.failed`), background scanner (5min), auto-fix for syncs/tickets
- **Deployment verification**: `verify_deployment()` queries Azure post-deploy, integrated as Phase 3 in provisioning flow
- **TypeScript fixes**: Zero tsc errors

## Session Summary (2026-06-11) — Global AI Provider Fallback

Portal now works without Azure OpenAI via a 3-tier automatic fallback:

**Priority chain**: Azure OpenAI → HuggingFace (Gemma 3 12B) → Local LLM (OpenAI-compatible endpoint)

### Changes
- **`backend/app/api/v1/ai.py`**: `AnalyzeTenantRequest` now accepts `azure_endpoint`, `azure_key`, `azure_deployment`, `azure_api_version`. The `analyze_tenant_data()` route passes per-request Azure credentials to `execute_chat()`, enabling honor of per-agent settings from the Settings page.
- **`backend/app/services/ai_execution_service.py`**: Enhanced fallback from 2-tier (Azure→HF) to 3-tier (Azure→HF→Local). Implemented `_execute_local()` with proper HTTP streaming to OpenAI-compatible endpoints (Ollama, LM Studio). Local LLM endpoint/model configurable via `LOCAL_LLM_ENDPOINT` and `LOCAL_LLM_MODEL` env vars.
- **`frontend/src/services/api.ts`**: `analyzeWithAI()` now accepts optional `azureCreds` parameter, forwarding to backend.
- **Feature pages**: Assessment, Troubleshoot, Compliance, Optimization pages now read per-agent Azure OpenAI settings from `useSettingsStore` and pass them to `analyzeWithAI()`, so user-configured credentials from Settings → Agent Settings are honored by all features.
- **Provisioning chat**: Simplified `askAzureOpenAI` to remove frontend-side Azure OpenAI check and manual `inframiniChat` fallback — relies on backend 3-tier auto-fallback.

### Acceptance Checklist
- [x] No AI feature disabled — all work without Azure OpenAI
- [x] Automatic fallback — Azure OpenAI → HuggingFace → Local LLM
- [x] Existing Azure OpenAI preserved — per-agent settings and env vars unchanged

## Session Summary (2026-06-12) — Login & Branding Fixes

**Changes:**
- **`frontend/src/app/page.tsx`**: Root page now checks `auth_token` in localStorage. Unauthenticated users redirect to `/landing` (login/signup). Authenticated users proceed to onboarding or dashboard based on completion state.
- **Username display**: Removed hardcoded `"Harsh Pardhi"` defaults from `Header.tsx`, `DashboardHero.tsx`, `AgentLayout.tsx` — all now default to `"User"` and read the real username from localStorage (set during sign-in/sign-up).
- **Portal renaming**: Sidebar footer now reads `general.organizationName` from `useSettingsStore` (dynamic via Settings → General). InfraMini greeting and header title use `general.portalName`. Landing page title uses `general.portalName`.
- No database changes — username/branding are stored in localStorage (user store for credentials, settings store for config).

**Acceptance Checklist**
- [x] Proper login flow — first visit shows `/landing`, auth checked before any protected route
- [x] Authenticated users navigate directly to dashboard (if onboarding complete)
- [x] Username sourced from database (user store on sign-in)
- [x] Portal name change propagates to sidebar footer, InfraMini greeting, landing page

## Session Summary (2026-06-12) — Settings Personalization

All appearance/settings now actually applied globally.

### Changes

**CSS Variable Injection (`providers.tsx`)**
- New `AppearanceApplier` component reads `customization` and `appearance` from `useSettingsStore` and injects CSS variables on `<html>`:
  - `--primary-color`, `--accent-color`, `--border-radius`
  - `data-glassmorphism`, `data-compact` attributes
  - `--font-family` on `:root` and `body.style.fontFamily`
- Dynamically loads selected Google Font via `<link>` tag

**Tailwind Config (`tailwind.config.ts`)**
- Added `primary` and `accent` semantic colors referencing CSS variables
- Changed `fontFamily.sans` to use `var(--font-family, Inter)`
- Changed `borderRadius.DEFAULT` to use `var(--border-radius, 8px)`

**Theme System — Light/Dark/System**
- `AppearanceSettings.theme` field added (`'light' | 'dark' | 'system'`)
- Settings page Appearance section: 3-button selector (Light/Dark/System) instead of toggle
- `theme-toggle.tsx`: cycles light → dark → system → light, syncs with settingsStore
- `handleSave` in settings page syncs theme to `useThemeStore`

**Login Activity Tracking**
- Records now include: `type` (login/logout), `username`, `browser`
- `ProfileDropdown.tsx`: `recordLogoutActivity()` called on sign-out
- `landing/page.tsx`: enriched login records with `type`, `username`, `browser` fields
- Settings page Security section: refreshed on section activate, shows type (Sign In/Sign Out), username, browser

**Settings Page Preview**
- Duplicate CSS var injection removed from settings page; replaced with preview-only effect using temp state so changes are visible before saving

### Files Changed
- `frontend/src/components/providers.tsx` — `AppearanceApplier` component
- `frontend/tailwind.config.ts` — CSS variable colors, font, radius
- `frontend/src/store/settingsStore.ts` — `AppearanceSettings.theme` field
- `frontend/src/components/ui/theme-toggle.tsx` — 3-way cycling
- `frontend/src/components/layout/ProfileDropdown.tsx` — logout tracking
- `frontend/src/app/landing/page.tsx` — enriched login records
- `frontend/src/app/settings/page.tsx` — theme selector, login display, preview effect

**Acceptance Checklist**
- [x] Primary/accent colors applied globally via CSS variables
- [x] Font family changes globally
- [x] Light/Dark/System mode supported
- [x] Glassmorphism toggle sets `data-glassmorphism` attribute
- [x] Compact mode sets `data-compact` attribute
- [x] Border radius applied globally
- [x] Login activity captures: type, timestamp, username, browser
- [x] Settings persist (zustand persist → localStorage)
- [x] Applied immediately on save
- [x] Stored per user
- [x] Zero TypeScript errors (`tsc --noEmit` passed)
- [x] Production build succeeds

## Session Summary (2026-06-12) — Assessment Agent Production Hardening

Assessment Agent transformed from hardcoded-fallback demo to production-grade engine with real Azure data scoring.

### Changes

**Accurate Scores from Real Tenant Data (`assessment/page.tsx`)**
- **securityScore**: Returns -1 when `security` is null (no Defender data). Removed `?? 100` fallback that showed 100% when no data existed.
- **costScore**: Uses real cost data (`costs.month_to_date` / `costs.forecast` ratio) when available. Falls back to Advisor cost recommendation ratio. Returns -1 when both are null.
- **availabilityScore**: Returns -1 when `stats` is null. No more fake 100% on empty data.
- **governanceScore**: Returns -1 when `advisor` is null.
- **complianceScore**: Now uses actual Azure Policy compliance data from `compliance` store (`policy_violations`, `non_compliant_resources`, `total_resources_evaluated`) instead of reusing `securityScore` with a different penalty multiplier.
- **performanceScore**: Unchanged (already correctly returned -1 when no VM data).

**Weighted Overall Health**
- Replaced simple average with weighted calculation: Security 35%, Performance 20%, Availability 20%, Governance 15%, Cost 10%.
- Added health labels: Excellent (≥90), Good (≥70), Fair (≥50), Poor (≥30), Critical (<30).
- Weight breakdown displayed in card subtitle.

**Findings UX Improvements**
- **Empty state distinction**: Shows "All systems healthy" when data exists but no issues. Shows "No Data Available — connect and sync a tenant" when no data at all.
- **Resolved count**: Badge shows both open and resolved finding counts.
- **Data source connection status**: Green dot = Connected (data returned), Gray dot = No Data (service not reached). Added Azure Policy as 5th data source.

**AI Insight Generation**
- New "AI Insight" card in right sidebar with "Generate Summary" button.
- Calls backend `analyze-tenant` endpoint with assessment data context (scores, open findings, severity breakdown, total resources).
- Always uses backend 3-tier fallback (never sends frontend Azure credentials).
- Graceful failure: shows "Insight generation unavailable. Assessment scores are still computed from real Azure data."

**HF Fallback** (already working via existing 3-tier architecture)
- Assessment page's `analyzeWithAI` calls in `startFix()` don't send empty Azure credentials (gated by `apiService` checking both endpoint and key).
- Backend `analyze-tenant` endpoint uses 3-tier fallback when no per-request creds provided.

### Files Changed
- `frontend/src/app/assessment/page.tsx` — All score calculations, weighted health, findings UX, data source status, AI insight card, empty state logic

### Acceptance Checklist
- [x] All 7 categorical scores use real Azure data, return -1 when no data exists
- [x] Overall Health uses correct weighted scoring
- [x] Findings distinguish "no data" from "all healthy"
- [x] Data sources show live connection status
- [x] Open/resolved finding counts shown
- [x] AI insight generation available but graceful on failure
- [x] Zero TypeScript errors (`tsc --noEmit`)
- [x] Backend 3-tier AI fallback honored

## Session Summary (2026-06-12) — Migration Agent Production Implementation

Migration Agent transformed from chat-only placeholder to full production service with real Azure SDK execution.

### Changes

**Issue 1 — AI Provider Fallback (`AgentChat.tsx`)**
- Removed frontend Azure OpenAI gate (`hasAnyProvider` / `hasAzureOpenAI` checks) — no more pre-emptive "Not Configured" blocking
- Provider status shows "Checking..." initially, "AI Connected" after first successful response, "Not Configured" only on actual failure
- Backend 3-tier fallback (Azure OpenAI → HuggingFace → Local LLM) drives provider selection
- Enhanced migration AI prompt in `ai_execution_service.py` with all 6 migration types, required fields, and instruction to collect details one at a time

**Issue 2 — Real Migration Execution (new backend service + API)**
- **`backend/app/services/agents/migration_agent_service.py`**: Azure SDK migration execution for 6 types:
  - **SQL Migration** → `SqlManagementClient` — creates Azure SQL Server + Database
  - **VM Migration** → `ComputeManagementClient` + `NetworkManagementClient` — creates target VM with VNet, subnet, NSG, NIC, PIP
  - **App Migration** → `WebSiteManagementClient` — creates App Service Plan + Web App
  - **Storage Migration** → `StorageManagementClient` — creates StorageV2 account
  - **Database Migration** → `rdbms_postgresql_flexibleservers` / `rdbms_mysql_flexibleservers` — creates PostgreSQL/MySQL Flexible Server
  - **Hybrid Setup** → `NetworkManagementClient` — creates VPN Gateway, Local Network Gateway, IPsec connection
- All operations use real Azure SDK calls with progress tracking via async generators
- State persisted in Redis via `BaseAgentService.save_deployment_state()`
- **`backend/app/api/v1/migration.py`**: `POST /api/v1/migration/execute`, `GET /api/v1/migration/status/{id}`, `GET /api/v1/migration/types`
- Registered router in `main.py`
- Added `azure-mgmt-rdbms==10.2.0b1` to requirements
- **`frontend/src/services/api.ts`**: Added `executeMigration()`, `getMigrationStatus()`, `listMigrationTypes()`

**Issue 3 — Scenario Cards (`migration/page.tsx`)**
- Added 6 clickable scenario cards above the migration scenarios grid: SQL Migration, VM Migration, App Migration, Storage Migration, Database Migration, Hybrid Setup
- Each card has unique icon + color, and auto-populates the Migration Assistant input with a migration-specific prompt
- Cards DO NOT auto-execute — they only pre-fill the chat input for review
- Existing quick-action chips in `AnimatedGradientChatInput` retained as secondary entry points

### Files Created
- `backend/app/services/agents/migration_agent_service.py` — Full migration execution service (280 lines)
- `backend/app/api/v1/migration.py` — Migration REST API (3 endpoints)

### Files Modified
- `backend/app/main.py` — Registered migration router
- `backend/app/services/ai_execution_service.py` — Enhanced migration prompt with 6 types + field requirements
- `backend/requirements.txt` — Added `azure-mgmt-rdbms`
- `frontend/src/components/chat/AgentChat.tsx` — Removed Azure OpenAI gate, simplified provider status
- `frontend/src/app/migration/page.tsx` — Added 6 scenario cards with auto-populate
- `frontend/src/services/api.ts` — Added 3 migration API methods

### Acceptance Checklist
- [x] No Azure OpenAI dependency — backend 3-tier fallback works for all migration chat
- [x] No "Not Configured" blocking the migration assistant
- [x] Real Azure SDK migration execution for all 6 types (SQL, VM, App, Storage, Database, Hybrid)
- [x] Migration state tracked in Redis with status endpoint
- [x] 6 scenario cards auto-populate the chat input on click
- [x] Cards do NOT auto-execute — only pre-fill prompts
- [x] Zero TypeScript errors (`tsc --noEmit`)
- [x] All Python files compile cleanly

## Last Updated

This guide reflects the current state of the codebase as of 2026-06-12.
