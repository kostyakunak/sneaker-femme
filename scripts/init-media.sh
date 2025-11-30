#!/bin/sh
# Script to initialize media volume on Railway
echo "Checking media volume..."

# Debug: Show current state of media directory
echo "Current contents of /app/media:"
ls -la /app/media/ 2>/dev/null || echo "Directory does not exist or is empty"

# Check if media volume has the required files
if [ ! -f "/app/media/main-logo.jpg" ] || [ ! -d "/app/media/catalog" ] || [ ! -s "/app/media/main-logo.jpg" ]; then
    echo "Media volume is missing required files. Initializing from template..."
    # Copy media files from template directory to volume
    if [ -d "/app/media-template" ]; then
        echo "Copying files from /app/media-template to /app/media..."
        cp -r /app/media-template/* /app/media/ 2>/dev/null || true
        echo "Media files copied to volume"

        # Verify copy was successful
        if [ -f "/app/media/main-logo.jpg" ] && [ -d "/app/media/catalog" ]; then
            echo "✓ Copy successful - required files found"
        else
            echo "✗ Copy failed - required files still missing"
        fi
    else
        echo "Warning: media-template directory not found"
        echo "Contents of /app:"
        ls -la /app/ | head -20
    fi
else
    echo "Media volume already initialized with required files"
fi

echo "Fixing permissions on /app/media volume..."
chmod -R 755 /app/media 2>/dev/null || true
echo "Permissions fixed. Media volume ready."

# Start the application
echo "Starting application..."
exec npm run start
