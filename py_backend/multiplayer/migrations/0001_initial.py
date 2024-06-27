# Generated by Django 4.2.9 on 2024-06-26 14:43

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
                ('player1', models.CharField(default=None, max_length=100, null=True)),
                ('player2', models.CharField(default=None, max_length=100, null=True)),
                ('player1_character', models.CharField(default=None, max_length=100, null=True)),
                ('player2_character', models.CharField(default=None, max_length=100, null=True)),
            ],
        ),
    ]
