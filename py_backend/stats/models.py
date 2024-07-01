from django.db import models
from django.utils import timezone
import uuid

# Create your models here.
class Match(models.Model):
    lobby_id = models.CharField(max_length=100, editable=False, blank=False, default="default", unique=False)
    player1 = models.CharField(max_length=100, default='', null=True)
    player2 = models.CharField(max_length=100, default='', null=True)
    player1_average_exchange = models.IntegerField(default=0)
    player2_average_exchange = models.IntegerField(default=0)
    winner = models.CharField(max_length=100, default='')
    loser = models.CharField(max_length=100, default='')
    player1_score = models.IntegerField(default=0)
    player2_score = models.IntegerField(default=0)
    date = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.player1} vs {self.player2}: {self.winner} wins!"