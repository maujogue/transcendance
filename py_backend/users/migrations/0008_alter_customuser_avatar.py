# Generated by Django 4.2.9 on 2024-04-04 08:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_alter_customuser_avatar'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='avatar',
            field=models.ImageField(default='avatar.jpg', upload_to='profile_avatars'),
        ),
    ]