#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

echo "PULSCO Lifecycle: Running database migrations..."
python manage.py migrate --noinput

echo "PULSCO Lifecycle: Collecting static files..."
python manage.py collectstatic --noinput

# Start the application
# Gunicorn is used as the production-grade WSGI server
echo "PULSCO Lifecycle: Starting Gunicorn server on 0.0.0.0:8000"
exec gunicorn pulsco.wsgi:application --bind 0.0.0.0:8000