#!/bin/bash
set -e

echo "🚀 Starting Composphere setup..."

# 1. Setup Environment
if [ ! -f .env ]; then
    echo "📄 Creating .env file from .env.example..."
    cp .env.example .env
else
    echo "✅ .env file already exists."
fi

# 2. Configure Docker Group ID
echo "🔧 Configuring Docker Group ID..."
if command -v getent &> /dev/null; then
    HOST_DOCKER_GID=$(getent group docker | cut -d: -f3)
    if [ ! -z "$HOST_DOCKER_GID" ]; then
        # Use a temporary file for sed to be compatible with both GNU and macOS/BSD sed
        sed "s/^DOCKER_GID=.*/DOCKER_GID=${HOST_DOCKER_GID}/" .env > .env.tmp && mv .env.tmp .env
        echo "✅ Set DOCKER_GID to ${HOST_DOCKER_GID}"
    else
        echo "⚠️ Could not determine docker group ID automatically. Check if 'docker' group exists."
    fi
else
    echo "⚠️ 'getent' command not found. You might be on macOS or Windows."
    echo "If you have permission issues with docker.sock, please manually set DOCKER_GID in .env"
fi

# 3. Build and Start
echo "🐳 Building and starting Docker containers..."
docker compose up --build -d

echo ""
echo "✨ Composphere is ready!"
echo "🌐 Open your browser at: http://localhost:22414"
