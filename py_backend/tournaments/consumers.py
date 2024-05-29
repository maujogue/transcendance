import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async

from users.models import CustomUser
from .models import Tournament, TournamentMatch
from .bracket import generate_bracket

class TournamentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.tournament = await self.get_tournament()
        if self.tournament is None:
            return await self.close()
        await self.accept()
        await self.channel_layer.group_add(
            self.tournament.name,
            self.channel_name
        )
        participants = await self.get_tournament_participants()
        await self.channel_layer.group_send(
            self.tournament.name,
            {
                'type': 'tournament.participants',
                'participants': participants
            }
        )

    async def receive(self, text_data):
        print("receive")
        text_data_json = json.loads(text_data)
        print(text_data_json)
        if text_data_json.get('type') == 'auth':
            username = text_data_json.get('username')
            user = await self.authenticate_user_with_username(username)
            if user:
                print("user authenticated: ", user.username)
                self.scope["user"] = user
                await self.send(text_data=json.dumps({"type": "auth", "status": "success"}))
                await self.check_tournament_start()
            else:
                print("user not authenticated")
                await self.send(text_data=json.dumps({"type":"auth", "status": "failed"}))

    async def disconnect(self, close_code):
        print('disconnected')
        participants = await self.get_tournament_participants()
        await self.channel_layer.group_send(
            self.tournament.name,
            {
                'type': 'tournament.participants',
                'participants': participants
            }
        )
        await self.channel_layer.group_discard(
            self.tournament.name,
            self.channel_name
        )

    @database_sync_to_async
    def get_tournament(self):
        try:
            return Tournament.objects.get(pk=self.scope['url_route']['kwargs']['tournament_id'])
        except Tournament.DoesNotExist:
            return None

    @database_sync_to_async
    def get_tournament_participants(self):
        return [p.tournament_username for p in self.tournament.participants.all()]

    async def check_tournament_start(self):
        print("check_tournament_start")
        if await self.is_tournament_full() and not self.tournament.started:
            print("Tournament is full and not started")
            self.tournament.started = True
            await sync_to_async(self.tournament.save)()
            await sync_to_async(generate_bracket)(self.tournament)
            await self.send_matchups()

    
    async def send_matchups(self):
        await self.channel_layer.group_send(
            self.tournament.name,
            {
                'type': 'tournament.matchups'
            }
        )

    @database_sync_to_async
    def is_tournament_full(self):
        if self.tournament.participants.count() == self.tournament.max_players:
            return True
        return False

    @database_sync_to_async
    def get_player_match(self, user):
        match = TournamentMatch.objects.filter(player_1=user.id).first()
        if match == None:
            match = TournamentMatch.objects.filter(player_2=user.id).first()
        print(match)
        return match

    @database_sync_to_async
    def get_match_infos(self, match):
        return {
            'lobby_id': str(match.lobby.uuid),
            'player_1': match.player_1.username,
            'player_2': match.player_2.username if match.player_2 else None,
            'round': match.round
        }
    
    @database_sync_to_async
    def authenticate_user_with_username(self, username):
        try:
            return CustomUser.objects.get(username=username)
        except CustomUser.DoesNotExist:
            return None

    async def tournament_participants(self, event):
        await self.send(
            text_data=json.dumps({'type': 'participants', 'participants': event['participants']}))
        
    async def tournament_matchups(self, event):
        match = await self.get_player_match(self.scope['user'])
        if match:
            match_infos = await self.get_match_infos(match)
            await self.send(text_data=json.dumps({'type': 'matchup', 'match': match_infos}))
