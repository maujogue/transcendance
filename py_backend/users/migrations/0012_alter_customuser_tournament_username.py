# Generated by Django 4.2.9 on 2024-05-16 07:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0011_alter_customuser_tournament_username'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='tournament_username',
            field=models.CharField(default='Wujupotowepo', max_length=25, unique=True),
        ),
    ]