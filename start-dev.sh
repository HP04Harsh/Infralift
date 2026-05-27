#!/bin/bash

# Infralift Development Startup Script

echo "🚀 Starting Infralift Development Environment..."

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis is not running. Starting Redis..."
    if command -v docker &> /dev/null; then
        docker run -d -p 6379:6379 --name infralift-redis redis:7-alpine
        echo "✅ Redis started with Docker"
    else
        echo "❌ Docker not found. Please start Redis manually."
        exit 1
    fi
fi

# Start Backend
echo "🔧 Starting Backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
python -m app.main &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "🎨 Starting Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Development environment started!"
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/api/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM

# Wait for both processes
wait
