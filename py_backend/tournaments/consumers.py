import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from django.utils import timezone

from users.models import CustomUser
from stats.models import Match
from multiplayer.models import Lobby
from .models import Tournament, TournamentMatch
from .bracket import generate_bracket

class TournamentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.match = None
        self.task = None
        self.tournament = await self.get_tournament()
        if self.tournament is None:
            return await self.close()
        await self.accept()
        await self.channel_layer.group_add(
            self.tournament.name,
            self.channel_name
        )
        await self.check_tournament_status()

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            if text_data_json.get('type') == 'auth':
                await self.auth(text_data_json)
            if text_data_json.get('type') == 'status':
                await self.handler_status(text_data_json.get('status'))
            if text_data_json.get('type') == 'bracket':
                await self.send_self_bracket()
            if text_data_json.get('type') == 'getRanking':
                await self.send_tournament_ranking()
        except Exception as e:
            print('error: ', e)

    async def disconnect(self, close_code):
        if not self.tournament.started:
            participants = await self.get_tournament_participants()
            await self.channel_layer.group_send(
                self.tournament.name,
                {
                    'type': 'tournament.participants',
                    'participants': participants
                }
            )
        if self.task:
            self.task.cancel()
        await self.channel_layer.group_discard(self.tournament.name, self.channel_name)

    async def handler_status(self, status):
        if status == 'endGame':
            if self.task:
                self.task.cancel()
            await self.endGame()

    async def endGame(self):
        if not await self.validate_foreign_keys():
            return
        await self.set_match_info()
        await self.match_is_over()

        if self.match.winner == self.scope['user'].tournament_username:
            await self.send(text_data=json.dumps({'type': 'status', 'status': 'waiting'}))
        if self.match.winner == self.scope['user'].tournament_username and await self.check_if_all_matches_finished():
            await self.advance_in_tournament()
        else:
            await self.send_self_bracket()
            asyncio.create_task(self.tournament_state())

    async def tournament_state(self):
        while not self.tournament.finished:
            await asyncio.sleep(10)
            if await self.check_if_all_matches_finished():
                await self.advance_in_tournament()
                break
            

    async def match_is_over(self):
        if not self.match:
            self.match = await self.get_player_match(self.scope['user'].tournament_username)
        self.match.finished = True
        await self.match.asave()

    async def auth(self, text_data_json):
        username = text_data_json.get('username')
        user = await self.authenticate_user_with_username(username)
        if user:
            self.scope["user"] = user
            self.match = await self.get_player_match(self.scope['user'].tournament_username)
            await self.send(text_data=json.dumps({"type": "auth", "status": "success"}))
            await self.check_tournament_start()
            await self.check_if_disqualified()
        else:
            await self.send(text_data=json.dumps({"type":"auth", "status": "failed"}))

    async def set_tournament_over(self):
        self.tournament.finished = True
        await self.tournament.asave()
        await self.send_tournament_end()

    async def generate_round(self):
        await sync_to_async(generate_bracket)(self.tournament)
        await self.send_bracket(True)
        await self.send_all_matchups()

    async def advance_in_tournament(self):
        if self.tournament.current_round < self.tournament.max_round:
            await self.tournament.increase_round()
            await self.generate_round()
        else:
            await self.set_tournament_over()

    async def check_if_all_matches_finished(self):
        self.tournament = await self.get_tournament()
        all_matches = await sync_to_async(list)(self.tournament.matchups.filter(round=self.tournament.current_round))
        if all(matches.finished for matches in all_matches) and len(all_matches) > 0:
            return True
        return False
    
    async def create_history_match(self, lobby):
        try:
            self.match = await Match.objects.aget(lobby_id=str(lobby.uuid))
            return self.match
        except Match.DoesNotExist:
            winner = lobby.player1 if lobby.player1 else lobby.player2
            if not winner:
                winner = self.match.player1
            loser = self.match.player2 if winner == self.match.player1 else self.match.player1
            match = Match(  lobby_id=str(lobby.uuid),
                            player1=self.match.player1, 
                            player2=self.match.player2, 
                            player1_average_exchange=0,
                            player2_average_exchange=0,
                            winner=winner,
                            loser=loser,
                            player1_score=0,
                            player2_score=0)
            await match.asave()
            return match

    async def launch_match_timer(self, match):
        match.timer = timezone.now()
        await match.asave()
        if match.player1 == self.scope['user'].tournament_username:
            await asyncio.sleep(30)
        if match.player2 == self.scope['user'].tournament_username:
            await asyncio.sleep(32)

    async def cancel_match(self, match):
        await self.send(text_data=json.dumps({'type': 'status', 'status': 'cancelled', 'message': f'Match not started in time, {match.winner} wins!'}))
        await asyncio.sleep(5)
        await self.endGame()

    async def check_if_match_is_started(self, match):
        try:
            lobby = await Lobby.objects.aget(pk=match.lobby_id)

            if lobby.game_started or lobby.finished:
                return True
            return False
        except Lobby.DoesNotExist:
            return True

    async def check_if_match_started_in_time(self, match): 
        try:
            await self.launch_match_timer(match)
            if not await self.check_if_match_is_started(match):
                lobby = await Lobby.objects.aget(pk=match.lobby_id)
                res_match = await self.create_history_match(lobby)
                await self.cancel_match(res_match)
        except Lobby.DoesNotExist:
            try:
                res_match = await TournamentMatch.objects.aget(lobby_id=match.lobby_id)
                await self.cancel_match(res_match)
            except TournamentMatch.DoesNotExist:
                return
        except Exception as e:
            print('error: ', e)
            return
        
    async def check_tournament_status(self):
        if self.tournament.finished:
            await self.send_tournament_end()
        elif not self.tournament.started:
            await self.send_participants_list()


    async def set_match_info(self):
        try:
            match = await Match.objects.aget(lobby_id=str(self.match.lobby_id))
            self.match.player1 = match.player1
            self.match.player2 = match.player2
            self.match.score_player_1 = match.player1_score
            self.match.score_player_2 = match.player2_score
            self.match.winner = match.winner
            self.match.finished = True
            loser = match.player1 if match.winner == match.player2 else match.player2
            await self.match.asave()
            await self.send_disqualified(loser)
            await self.remove_lobby()
        except Match.DoesNotExist:
            return
        
    async def remove_lobby(self):
        try:
            lobby = await Lobby.objects.aget(pk=self.match.lobby_id)
            await lobby.adelete()
        except Lobby.DoesNotExist:
            return
        
    async def launch_tournament(self):
        await self.channel_layer.group_send(
            self.tournament.name,
            {
                'type': 'tournament.status',
                'status': 'start'
            }
        )
        self.tournament.started = True
        await sync_to_async(self.tournament.save)()
        await self.generate_round()
    
    @database_sync_to_async
    def is_tournament_full(self):
        if self.tournament.participants.count() == self.tournament.max_players:
            return True
        return False
    
    async def check_tournament_start(self):
        if await self.is_tournament_full() and not self.tournament.started:
            await self.launch_tournament()
        elif self.tournament.started and not self.tournament.finished:
            if self.match and not self.match.finished and self.match.player2:
                if not await self.check_if_match_is_started(self.match):
                    await self.send_self_matchup()
            else:
                await self.send_bracket(False)
    
    async def validate_foreign_keys(self):
        try:
            if not self.match:
                self.match = await self.get_player_match(self.scope['user'].tournament_username)
            tournament = await Tournament.objects.aget(id=self.scope['url_route']['kwargs']['tournament_id'])
            match = await TournamentMatch.objects.aget(lobby_id=self.match.lobby_id)
            return True
        except Tournament.DoesNotExist:
            return False
        except TournamentMatch.DoesNotExist:
            return False
        
    async def check_if_disqualified(self):
        if await sync_to_async(self.tournament.check_if_player_is_disqualified)(self.scope['user']):
            await self.send(text_data=json.dumps({'type': 'status', 'status': 'disqualified'}))

    async def get_player_match(self, username):
        self.tournament = await self.get_tournament()
        return await sync_to_async(self.tournament.get_matches_by_player)(username)

    def get_match_infos(self, match):
        return {
            'lobby_id': str(match.lobby_id),
            'player_1': match.player1,
            'player_2': match.player2 if match.player2 else None,
            'round': match.round
        }
    
    @database_sync_to_async
    def get_tournament(self):
        try:
            return Tournament.objects.get(pk=self.scope['url_route']['kwargs']['tournament_id'])
        except Tournament.DoesNotExist:
            return None

    @database_sync_to_async
    def get_tournament_participants(self):
        return [p.tournament_username for p in self.tournament.participants.all()]

    def get_elapsed_time(self, timer):
        current_time = timezone.now()

        return (current_time - timer).seconds
    
    @database_sync_to_async
    def authenticate_user_with_username(self, username):
        try:
            return CustomUser.objects.get(username=username)
        except CustomUser.DoesNotExist:
            return None
        
    async def send_self_bracket(self):
        bracket = await sync_to_async(self.tournament.get_tournament_bracket)()
        await self.send(text_data=json.dumps({'type': 'bracket', 'bracket': bracket}))

    async def send_self_matchup(self):
        self.match = await self.get_player_match(self.scope['user'].tournament_username)
        if self.match and not self.match.finished and self.match.player2:
            match_infos = self.get_match_infos(self.match)
            timer = 30 - self.get_elapsed_time(self.match.timer)
            if timer > 0:
                await self.send(text_data=json.dumps({'type': 'matchup', 'match': match_infos, 'timer': timer}))
            else:
                await self.send(text_data=json.dumps({'type': 'status', 'status': 'waiting'}))

    async def send_all_matchups(self):
        await self.channel_layer.group_send(
            self.tournament.name,
            {
                'type': 'tournament.matchups'
            }
        )

    async def send_disqualified(self, username):
        await self.channel_layer.group_send(
            self.tournament.name,
            {
                'type': 'tournament.status',
                'status': 'disqualified',
                'username': username
            }
        )

    async def send_bracket(self, forAll):
        bracket = await sync_to_async(self.tournament.get_tournament_bracket)()
        await self.channel_layer.group_send(
            self.tournament.name,
            {
                'type': 'tournament.bracket',
                'bracket': bracket,
                'forAll': forAll
            }
        )

    async def send_participants_list(self):
        participants = await self.get_tournament_participants()
        await self.channel_layer.group_send(
            self.tournament.name,
            {
                'type': 'tournament.participants',
                'participants': participants
            }
        )

    async def send_tournament_end(self):
        await self.channel_layer.group_send(
            self.tournament.name,
            {
                'type': 'tournament.status',
                'status': 'endTournament'
            }
        )

    async def send_tournament_ranking(self):
        winner = await sync_to_async(self.tournament.get_winner)()
        ranking = await sync_to_async(self.tournament.get_ranking)()
        await self.send(text_data=json.dumps({'type': 'ranking', 'winner': winner, 'ranking': ranking}))
    
    async def tournament_participants(self, event):
        await self.send(
            text_data=json.dumps({'type': 'participants', 'participants': event['participants']}))
        
    async def tournament_matchups(self, event):
        self.match = await self.get_player_match(self.scope['user'].tournament_username)
        if self.match:
            if not self.match.finished and self.match.player2:
                match_infos = self.get_match_infos(self.match)
                await self.send(text_data=json.dumps({'type': 'matchup', 'match': match_infos, 'timer': 30}))
    
                if self.task:
                    self.task.cancel()
                self.task = asyncio.create_task(self.check_if_match_started_in_time(self.match))
            else:
                await self.send(text_data=json.dumps({'type': 'status', 'status': 'waiting'}))
                

    async def tournament_status(self, event):
        if event['status'] == 'disqualified':
            if event['username'] == self.scope['user'].tournament_username:
    
                await self.send(text_data=json.dumps({'type': 'status', 'status': 'disqualified'}))
        elif event['status'] == 'endTournament':
            await self.send(text_data=json.dumps({'type': 'status', 'status': 'endTournament'}))
            await self.send_tournament_ranking()
        else:
            try:
                message = event.get('message')
            except:
                message = None
            await self.send(text_data=json.dumps({'type': 'status', 'status': event['status'], 'message': message}))



    async def tournament_bracket(self, event):
        if event['forAll'] or not await sync_to_async(self.tournament.check_if_player_is_in_match)(self.scope['user'].tournament_username):
            await self.send(text_data=json.dumps({'type': 'bracket', 'bracket': event['bracket']}))
        if event['forAll']:
            await asyncio.sleep(8)