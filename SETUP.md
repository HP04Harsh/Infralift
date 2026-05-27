# Development Setup Guide

This guide will help you set up the Infralift development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or [yarn](https://yarnpkg.com/)
- **Python** (v3.9 or higher) - [Download](https://www.python.org/downloads/)
- **Redis** server - [Download](https://redis.io/download)
- **Git** - [Download](https://git-scm.com/downloads)

## Quick Start with Docker (Recommended)

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd Infralift

# Start all services
docker-compose up

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/api/docs
```

## Manual Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Infralift
```

### 2. Set Up Redis

**Option A: Using Docker**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Option B: Native Installation**
- **macOS**: `brew install redis && brew services start redis`
- **Ubuntu**: `sudo apt-get install redis-server && sudo systemctl start redis`
- **Windows**: Download and install from [Redis官网](https://redis.io/download)

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit .env and configure your settings
# vim .env  # or use your preferred editor

# Start the backend server
python -m app.main
```

The backend will start at `http://localhost:8000`

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local if needed (default should work for local development)
# vim .env.local

# Start the development server
npm run dev
```

The frontend will start at `http://localhost:3000`

## Development Workflow

### Running Tests

**Frontend Tests**
```bash
cd frontend
npm test
```

**Backend Tests**
```bash
cd backend
pytest
```

### Building for Production

**Frontend**
```bash
cd frontend
npm run build
npm start
```

**Backend**
```bash
cd backend
# Set DEBUG=False in .env
python -m app.main
```

### Code Quality

**Frontend Linting**
```bash
cd frontend
npm run lint
```

**Backend Linting**
```bash
cd backend
# Install development dependencies
pip install black flake8 mypy
# Run formatters
black .
flake8 .
mypy .
```

## Project Structure Overview

### Frontend Structure
```
frontend/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilities
│   ├── services/        # API services
│   ├── store/           # State management
│   └── types/           # TypeScript types
├── public/              # Static assets
└── package.json
```

### Backend Structure
```
backend/
├── app/
│   ├── api/v1/         # API routes
│   ├── core/           # Core configuration
│   ├── schemas/        # Pydantic schemas
│   ├── services/       # Business logic
│   └── main.py         # Application entry
├── requirements.txt
└── .env
```

## Common Issues & Solutions

### Port Already in Use

**Frontend (3000)**
```bash
# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Backend (8000)**
```bash
# Kill process on port 8000 (macOS/Linux)
lsof -ti:8000 | xargs kill -9
```

### Redis Connection Issues

```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG

# If not, start Redis:
# macOS: brew services start redis
# Linux: sudo systemctl start redis
# Docker: docker start <redis-container-name>
```

### Module Import Errors

**Backend**
```bash
# Ensure you're in the virtual environment
# and that you're running from the backend directory
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python -m app.main
```

**Frontend**
```bash
# Clear Next.js cache
rm -rf .next
rm -rf node_modules
npm install
npm run dev
```

## IDE Setup

### VS Code Extensions

Recommended extensions for development:

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Python** - Python language support
- **Python Extension Pack** - Additional Python tools
- **Docker** - Docker support
- **GitLens** - Git supercharged
- **Tailwind CSS IntelliSense** - Tailwind CSS autocomplete

### VS Code Settings

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

## Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload in development mode
2. **API Testing**: Use Swagger UI at `http://localhost:8000/api/docs`
3. **Redis CLI**: Use `redis-cli` to inspect session data
4. **State Inspection**: Use React DevTools to inspect Zustand state
5. **Network Inspection**: Use browser DevTools Network tab to debug API calls

## Environment Variables

### Required Variables

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

### Optional Variables

**Backend (.env)**
```env
REDIS_PASSWORD=your_redis_password
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id
```

## Next Steps

After setting up the development environment:

1. Review the [README.md](./README.md) for project overview
2. Explore the onboarding wizard at `http://localhost:3000`
3. Check API documentation at `http://localhost:8000/api/docs`
4. Start building new features

## Getting Help

If you encounter any issues:

1. Check the troubleshooting section above
2. Review logs in both frontend and backend terminals
3. Check Redis connection: `redis-cli ping`
4. Verify environment variables are set correctly
5. Contact the development team

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

Happy coding! 🚀
