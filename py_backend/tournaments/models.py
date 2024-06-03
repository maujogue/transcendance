from django.db import models
from django.conf import settings

from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

from users.models import CustomUser
from multiplayer.models import Lobby

from math import log2, ceil

class TournamentMatch(models.Model):
	round = models.IntegerField(default=1)
	player_1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='player1_match')
	player_2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='player2_match', null=True, blank=True)
	winner = models.CharField(max_length=15, null=True, blank=True)
	score_player_1 = models.IntegerField(default=0)
	score_player_2 = models.IntegerField(default=0)
	lobby = models.ForeignKey(Lobby, on_delete=models.CASCADE)
	finished = models.BooleanField(default=False)

	def __str__(self):
		return f"Round {self.round}: {self.player_1} vs {self.player_2}"

class Tournament(models.Model):
	name = models.fields.CharField(max_length=15, unique=True)
	max_players = models.IntegerField(validators=[MinValueValidator(2), MaxValueValidator(32)])
	participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='joined_tournaments', blank=True)
	started = models.BooleanField(default=False)
	matchups = models.ManyToManyField(TournamentMatch, blank=True)
	max_round = models.IntegerField(default=1)

	def __str__(self):
		return f'{self.name}'

	def clean(self):
		super().clean()

	def save(self, *args, **kwargs):
		if not self.pk:
			self.max_round = ceil(log2(self.max_players))
		super().save(*args, **kwargs)

	def get_matches_by_player(self, player_id):
		return self.matchups.filter(models.Q(player_1_id=player_id) | models.Q(player_2_id=player_id))
	
	def get_tournament_bracket(self):
		rounds = self.matchups.values_list('round', flat=True).distinct()
		bracket = {
			"tournament": {
				"name": self.name,
				"rounds": []
			}
		}

		for round_number in rounds:
			matches = self.matchups.filter(round=round_number)
			round_info = {
				"name": self.get_round_name(round_number),
				"matches": []
			}

			for match in matches:
				match_info = {
					"match_id": match.id,
					"player1": match.player_1.username,
					"player2": match.player_2.username if match.player_2 else None,
					"winner": match.winner,
					"player1_score": match.score_player_1,
					"player2_score": match.score_player_2
				}
				round_info["matches"].append(match_info)
			
			bracket["tournament"]["rounds"].append(round_info)
			return bracket
	

	def get_round_name(self, round_number):
		if round_number == self.max_round:
			return "Finale"
		elif round_number == self.max_round - 1:
			return "semi-Finale"
		else:
			return f"Round {round_number}"