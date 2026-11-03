#!/usr/bin/env bash
set -euo pipefail

# Directory of this script
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT="$SCRIPT_DIR"

# PocketBase version - latest stable at time of writing
PB_VERSION="0.22.9"
PB_URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip"

# Download and extract PocketBase
if [[ ! -f "$PROJECT_ROOT/pocketbase" ]]; then
  echo "Downloading PocketBase $PB_VERSION..."
  curl -L -o /tmp/pb.zip "$PB_URL"
  unzip -d "$PROJECT_ROOT" /tmp/pb.zip
  chmod +x "$PROJECT_ROOT/pocketbase"
  rm /tmp/pb.zip
else
  echo "PocketBase binary already present"
fi

# Ensure data directory exists
mkdir -p "$PROJECT_ROOT/data"

# Create pb_public if not exists (static assets will be placed here)
mkdir -p "$PROJECT_ROOT/pb_public"

echo "Installation complete. Run \"$PROJECT_ROOT/pocketbase serve --dir $PROJECT_ROOT/pb_public --http 100.117.176.41:8090\" to start PocketBase."
