# Database
# Use Postgres in Docker; SQLite only for local dev
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'pulsco',          # matches POSTGRES_DB in docker-compose
        'USER': 'pulsco',          # matches POSTGRES_USER
        'PASSWORD': 'password',    # matches POSTGRES_PASSWORD
        'HOST': 'db',              # service name in docker-compose.yml
        'PORT': 5432,
    }
}
