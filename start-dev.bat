@echo off
REM Infralift Development Startup Script for Windows

echo 🚀 Starting Infralift Development Environment...

REM Check if Redis is running
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Redis is not running. Please start Redis manually or use Docker.
    echo docker run -d -p 6379:6379 --name infralift-redis redis:7-alpine
    pause
    exit /b 1
)

REM Start Backend
echo 🔧 Starting Backend...
cd backend
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt >nul 2>&1
start "Infralift Backend" python -m app.main
cd ..

REM Start Frontend
echo 🎨 Starting Frontend...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)
start "Infralift Frontend" npm run dev
cd ..

echo ✅ Development environment started!
echo 📱 Frontend: http://localhost:3000
echo 🔌 Backend API: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/api/docs
echo.
echo Press any key to close this window (servers will continue running)
pause
