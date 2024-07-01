#!/bin/sh
python manage.py makemigrations users tournaments stats multiplayer friends --noinput
python manage.py migrate --noinput
python manage.py collectstatic --noinput

pip install -U "Twisted[tls,http2]"
daphne -e ssl:8000:privateKey=/etc/nginx/ssl/ssl_certificate_key.key:certKey=/etc/nginx/ssl/ssl_certificate.crt -u /tmp/daphne.sock py_backend.asgi:application

if [ "$DJANGO_SUPERUSER_USERNAME" ]
then
    python manage.py createsuperuser \
        --noinput \
        --username $DJANGO_SUPERUSER_USERNAME \
        --email $DJANGO_SUPERUSER_EMAIL
fi