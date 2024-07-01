from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from py_backend import settings
from PIL import Image
import random

def generate_random_pseudo(length):
	syllabes = ['ba', 'be', 'bi', 'bo', 'bu', 'da', 'de', 'di', 'do', 'du', 'fa', 'fe', 'fi', 'fo', 'fu',
				'ga', 'ge', 'gi', 'go', 'gu', 'ha', 'he', 'hi', 'ho', 'hu', 'ja', 'je', 'ji', 'jo', 'ju',
				'ka', 'ke', 'ki', 'ko', 'ku', 'la', 'le', 'li', 'lo', 'lu', 'ma', 'me', 'mi', 'mo', 'mu',
				'na', 'ne', 'ni', 'no', 'nu', 'pa', 'pe', 'pi', 'po', 'pu', 'ra', 're', 'ri', 'ro', 'ru',
				'sa', 'se', 'si', 'so', 'su', 'ta', 'te', 'ti', 'to', 'tu', 'va', 've', 'vi', 'vo', 'vu',
				'wa', 'we', 'wi', 'wo', 'wu', 'ya', 'ye', 'yi', 'yo', 'yu', 'za', 'ze', 'zi', 'zo', 'zu']
	
	random_pseudo = ''.join(random.choice(syllabes) for _ in range(length))
	return random_pseudo.capitalize() 


class CustomUser(AbstractUser):
	class Meta:
		verbose_name = 'Custom User'

	username = models.CharField(max_length=settings.MAX_LEN_USERNAME, unique=True)
	tournament_username = models.CharField(max_length=9, unique=True, default='')
	email = models.EmailField(max_length=settings.MAX_LEN_EMAIL, unique=True)
	email_is_verified = models.BooleanField(default=False)
	title = models.CharField(max_length=50, null=True)
	avatar = models.ImageField(default='avatar.jpg', upload_to='profile_avatars')
	bio = models.TextField(max_length=settings.MAX_LEN_TEXT, default="")
	banner = models.ImageField(null=True)
	winrate = models.DecimalField(max_digits=4, decimal_places=4, validators=[MinValueValidator(0), MaxValueValidator(1)], null=True)
	rank = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(50)], null=True)
	n_games_played = models.IntegerField(null=True)
	friends = models.ManyToManyField("self", blank=True)
	is_42auth = models.BooleanField(default=False)
	is_online = models.BooleanField(default=False)
	lang = models.CharField(max_length=2, default='en')
	
	def save(self, *args, **kwargs):
		if not self.tournament_username:
			self.tournament_username = generate_random_pseudo(random.randint(3, 5))
		super().save(*args, **kwargs)
		img = Image.open(self.avatar.path)
		if img.height > 300 or img.width > 300:
			output_size = (300, 300)
			img.thumbnail(output_size)
			img.save(self.avatar.path)