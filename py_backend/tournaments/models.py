from django.db import models
from django.db.models import Max
from django.conf import settings
import uuid
import django.utils.timezone as timezone

from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

from users.models import CustomUser
from multiplayer.models import Lobby

from math import log2, ceil

class TournamentMatch(models.Model):
	lobby_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	num = models.IntegerField(default=0)
	round = models.IntegerField(default=1)
	player1 = models.CharField(max_length=100, default='')
	player2 = models.CharField(max_length=100, default='', null=True, blank=True)
	winner = models.CharField(max_length=15, null=True, blank=True)
	score_player_1 = models.IntegerField(default=0)
	score_player_2 = models.IntegerField(default=0)
	finished = models.BooleanField(default=False)
	timer = models.DateTimeField(default=timezone.now)

	def __str__(self):
		return f"{self.round}: {self.player1} vs {self.player2}: {self.winner} wins! finished: {self.finished}"

class Tournament(models.Model):
	name = models.fields.CharField(max_length=15, unique=True)
	max_players = models.IntegerField(validators=[MinValueValidator(2), MaxValueValidator(9)])
	participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='joined_tournaments', blank=True)
	started = models.BooleanField(default=False)
	finished = models.BooleanField(default=False)
	matchups = models.ManyToManyField(TournamentMatch, blank=True)
	max_round = models.IntegerField(default=1)
	current_round = models.IntegerField(default=1)

	def __str__(self):
		return f'{self.name}'

	def clean(self):
		super().clean()

	def save(self, *args, **kwargs):
		if not self.pk:
			self.max_round = ceil(log2(self.max_players))
		super().save(*args, **kwargs)

	def get_matches_by_player(self, username):
		match = self.matchups.filter(
			(models.Q(player1=username) | models.Q(player2=username)),
			round=self.current_round
			).first()

		return match
	
	def get_disqualified_players(self):
		disqualified_players = []
		for match in self.matchups.all().filter(finished=True):
			disqualified_player = match.player1 if match.player1 != match.winner else match.player2
			disqualified_players.append(disqualified_player)
		return disqualified_players
	
	def check_if_player_is_disqualified(self, username):
		disqualified_players = self.get_disqualified_players()
		if username in disqualified_players:
			return True
		return False
	
	def get_player_tournament_username(self, username):
		try:
			return CustomUser.objects.get(username=username).tournament_username
		except CustomUser.DoesNotExist:
			return username
		
	def get_tournament_bracket(self):
		total_rounds = self.max_round

		bracket = {
		"tournament": {
			"name": self.name,
			"rounds": []
		}
		}
		for round_number in range(1, total_rounds + 1):
			matches = self.matchups.filter(round=round_number).order_by('num')
			round_info = {
				"name": self.get_round_name(round_number),
				"matches": []
			}
			if matches.exists():
				for match in matches:
					player1 = self.get_player_tournament_username(match.player1) if match.player1 else None
					player2 = self.get_player_tournament_username(match.player2) if match.player2 else None
					winner = self.get_player_tournament_username(match.winner) if match.winner else None
					match_info = {
						"match_id": str(match.lobby_id),
						"player1": player1,
						"player2": player2,
						"winner": winner,
						"player1_score": match.score_player_1,
						"player2_score": match.score_player_2
					}
					round_info["matches"].append(match_info)
			else:
				num_matches = 2 * (total_rounds - round_number)
				for _ in range(num_matches):
					match_info = {
						"match_id": None,
						"player1": None,
						"player2": None,
						"winner": None,
						"player1_score": 0,
						"player2_score": 0
					}
					round_info["matches"].append(match_info)
			bracket["tournament"]["rounds"].append(round_info)
		return bracket

	def get_ranking(self):
		ranking = []
		i = 1
		while i <= self.max_round:
			matches = self.matchups.filter(round=i)
			for match in matches:
				if match.player1 == match.winner:
					ranking.append(match.player2)
				else:
					ranking.append(match.player1)
			i += 1
		ranking.append(self.get_winner())
		return ranking
	
	def check_if_player_is_in_match(self, username):
		match = self.get_matches_by_player(username)
		if match and not match.finished:
			return True
		return False

	def get_winner(self):
		winner = self.matchups.filter(round=self.max_round).first().winner
		return winner
	
	def get_round_name(self, round_number):
		if round_number == self.max_round:
			return "Final"
		elif round_number == self.max_round - 1:
			return "semi-Final"
		else:
			return f"Round {round_number}"
		
	async def increase_round(self):
		self.current_round += 1
		self.asave()