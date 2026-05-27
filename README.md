# Infralift V1.1 - Azure Infrastructure Automation Platform

A production-grade onboarding wizard UI for Azure automation platform built with Next.js 14+, FastAPI, Redis, and modern web technologies.

## 🚀 Features

- **Enterprise-Grade UI**: Professional dashboard layout inspired by Azure Portal
- **Interactive Onboarding Wizard**: Step-by-step Azure tenant setup process
- **Real-time Verification**: API integration for validating Azure CLI commands
- **Resource Sync**: Automated Azure resource synchronization with progress tracking
- **Dark Mode Support**: Full dark mode implementation with theme persistence
- **Responsive Design**: Mobile-first responsive layout
- **State Management**: Zustand for efficient client-side state management
- **Session Management**: Redis-backed session persistence
- **Type Safety**: Full TypeScript implementation
- **Modular Architecture**: Scalable component structure

## 📋 Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: TailwindCSS + Custom design system
- **UI Components**: Radix UI primitives
- **State Management**: Zustand with persistence
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **TypeScript**: Full type safety

### Backend
- **Framework**: FastAPI (Python)
- **Async Support**: Async/await throughout
- **Session Store**: Redis
- **Validation**: Pydantic schemas
- **API Documentation**: Automatic OpenAPI docs

### Infrastructure
- **Session Management**: Redis with TTL
- **CORS**: Configured for development
- **Environment Variables**: Secure configuration

## 🏗️ Project Structure

```
Infralift/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── onboarding/ # Onboarding wizard page
│   │   │   ├── layout.tsx  # Root layout
│   │   │   └── page.tsx    # Home page
│   │   ├── components/      # Reusable components
│   │   │   ├── cards/      # Setup cards
│   │   │   ├── layout/     # Header, layout components
│   │   │   ├── sidebar/    # Sidebars (left & right)
│   │   │   ├── ui/         # Base UI components
│   │   │   ├── wizard/     # Wizard stepper
│   │   │   ├── providers.tsx
│   │   │   └── theme-provider.tsx
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── services/       # API service layer
│   │   ├── store/          # Zustand stores
│   │   └── types/          # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── next.config.js
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/v1/        # API routes
│   │   │   ├── auth.py    # Authentication endpoints
│   │   │   ├── onboarding.py # Onboarding endpoints
│   │   │   └── resources.py  # Resource management
│   │   ├── core/          # Core configuration
│   │   │   ├── config.py  # Settings
│   │   │   └── redis.py   # Redis session manager
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   └── main.py        # Application entry
│   ├── requirements.txt
│   └── .env.example
├── shared/                 # Shared types and utilities
│   └── types/
└── README.md
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Redis server

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:3000`

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Configuration

Create `.env` files:

**Backend (.env)**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
DEBUG=True
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running the Application

**Start Redis** (if not running)
```bash
redis-server
```

**Start Backend**
```bash
cd backend
python -m app.main
```

Backend will be available at `http://localhost:8000`
API Docs at `http://localhost:8000/api/docs`

**Start Frontend**
```bash
cd frontend
npm run dev
```

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Onboarding
- `POST /api/v1/onboarding/verify` - Verify Azure CLI command
- `POST /api/v1/onboarding/connect-tenant` - Connect Azure tenant
- `GET /api/v1/onboarding/sync-status/{user_id}` - Get sync status
- `POST /api/v1/onboarding/start-sync/{user_id}` - Start resource sync
- `POST /api/v1/onboarding/complete-step` - Complete onboarding step
- `GET /api/v1/onboarding/session/{user_id}` - Get user session

### Resources
- `GET /api/v1/resources/` - List all resources
- `GET /api/v1/resources/{id}` - Get specific resource
- `GET /api/v1/resources/stats/summary` - Get resource statistics

## 🎨 Design System

### Colors
- **Azure Blue**: Primary brand color
- **Dark Sidebar**: Professional dark theme
- **Green**: Success states
- **Yellow**: Warning states
- **Gray**: Neutral backgrounds

### Typography
- **Font**: Inter (system-ui fallback)
- **Hierarchy**: Clear heading structure
- **Spacing**: Enterprise dashboard spacing

### Components
- **Cards**: Rounded corners, subtle shadows
- **Buttons**: Multiple variants (primary, outline, ghost)
- **Inputs**: Clean, focused states
- **Progress**: Smooth animations

## 🔒 Security Features

- **Session Management**: Redis-backed sessions with TTL
- **CORS Protection**: Configured allowed origins
- **Input Validation**: Pydantic schemas for API validation
- **Type Safety**: Full TypeScript coverage
- **Least Privilege**: Security notices for Azure permissions

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test
```

### Backend Tests
```bash
cd backend
pytest
```

## 📦 Building for Production

### Frontend
```bash
cd frontend
npm run build
npm start
```

### Backend
```bash
cd backend
# Set DEBUG=False in .env
python -m app.main
# Or with gunicorn:
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 🚀 Deployment

### Frontend Deployment
- Vercel (recommended for Next.js)
- Netlify
- Docker container

### Backend Deployment
- Docker container
- Cloud Run (GCP)
- Azure App Service
- Heroku

### Redis Deployment
- Azure Cache for Redis
- AWS ElastiCache
- Redis Labs
- Self-hosted

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support, please contact the development team or refer to the internal documentation.

## 🗺️ Roadmap

- [ ] Azure Resource Graph integration
- [ ] Multi-tenant support
- [ ] Advanced analytics dashboard
- [ ] Automated remediation workflows
- [ ] Policy as Code implementation
- [ ] Cost optimization features
- [ ] Mobile application

## 🎯 Architecture Highlights

### Frontend Architecture
- **Component-First**: Modular, reusable components
- **State Management**: Zustand for predictable state updates
- **API Layer**: Centralized API service with error handling
- **Type Safety**: End-to-end TypeScript
- **Performance**: Server-side rendering ready

### Backend Architecture
- **Service Layer**: Separation of business logic
- **Repository Pattern**: Clean data access
- **Async/Await**: Non-blocking operations
- **Session Management**: Redis for scalability
- **API Documentation**: Auto-generated OpenAPI specs

### Scalability
- **Horizontal Scaling**: Stateless backend design
- **Session Storage**: Redis for distributed sessions
- **Component Reusability**: Shared component library
- **API Versioning**: Structured API endpoints

---

Built with ❤️ for enterprise DevOps teams
