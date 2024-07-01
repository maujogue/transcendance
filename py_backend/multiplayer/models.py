from typing import Any
from django.db import models
import uuid

class Lobby(models.Model):
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connected_user = models.IntegerField(default=0)
    player_ready = models.IntegerField(default=0)
    game_started = models.BooleanField(default=False)
    finished = models.BooleanField(default=False)
    player1 = models.CharField(max_length=100, default=None, null=True)
    player2 = models.CharField(max_length=100, default=None, null=True)
    player1_character = models.CharField(max_length=100, default=None, null=True)
    player2_character = models.CharField(max_length=100, default=None, null=True)

    async def setPlayerReady(self, isReady, player):
        if isReady == 'true':
            self.player_ready += 1
            player.is_ready = True
        else:
            self.player_ready -= 1
            player.is_ready = False
        await self.asave(update_fields=['player_ready'])
    
    async def disconnectUser(self, player):
        if self.connected_user != 0:
            self.connected_user -= 1
        if player.is_ready == True and self.player_ready != 0:
            self.player_ready -= 1
        if self.connected_user == 0:
            self.player_ready = 0
        if player.name == 'player1':
            self.player1 = None
        else:
            self.player2 = None
        await self.asave()

    async def stopGame(self):
        self.player_ready = 0
        self.game_started = False
        self.finished = True
        await self.asave()

    async def startGame(self):
        self.game_started = True
        self.finished = False
        await self.asave()

    def check_if_game_is_ready(self):
        if self.player_ready == 2 and not self.game_started and self.player1_character is not None and self.player2_character is not None:
            return True
        # print(f'Game is not ready, player_ready: {self.player_ready}, player1: {self.player1}, player2: {self.player2}, game_started: {self.game_started}, player1_character: {self.player1_character}, player2_character: {self.player2_character}')
        return False
  