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

## Last Updated

This guide reflects the current state of the codebase as of the initial commit. Update as the project evolves.

## Contact

For questions about the codebase, refer to the main README.md or contact the development team.
