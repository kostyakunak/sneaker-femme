#!/bin/sh
# Script to initialize media volume on Railway
echo "Checking media volume..."

# Check if media volume is empty
if [ ! -d "/app/media/main-logo.jpg" ] && [ ! -d "/app/media/catalog" ]; then
    echo "Media volume is empty. Initializing from template..."
    # Copy media files from template directory to volume
    if [ -d "/app/media-template" ]; then
        cp -r /app/media-template/* /app/media/ 2>/dev/null || true
        echo "Media files copied to volume"
    else
        echo "Warning: media-template directory not found"
    fi
else
    echo "Media volume already initialized"
fi

echo "Fixing permissions on /app/media volume..."
chmod -R 755 /app/media 2>/dev/null || true
echo "Permissions fixed. Media volume ready."

# Start the application
echo "Starting application..."
exec npm run start
