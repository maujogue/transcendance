# Generated by Django 4.2.9 on 2024-05-22 10:18

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Lobby',
            fields=[
                ('uuid', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('connected_user', models.IntegerField(default=0)),
                ('player_ready', models.IntegerField(default=0)),
                ('game_started', models.BooleanField(default=False)),
                ('player1Present', models.BooleanField(default=False)),
                ('player2Present', models.BooleanField(default=False)),
            ],
        ),
    ]
