# Generated by Django 4.2.9 on 2024-03-27 15:06

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Tournament',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('max_players', models.IntegerField(validators=[django.core.validators.MinValueValidator(2), django.core.validators.MaxValueValidator(32)])),
                ('is_private', models.BooleanField()),
                ('password', models.CharField(blank=True, max_length=100, null=True)),
                ('host', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
