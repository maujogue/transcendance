from django.http import JsonResponse
import random
import string

from django.contrib.auth import get_user_model
from users.decorators import custom_login_required as login_required
from django.views.decorators.http import require_http_methods

from django.core.exceptions import ValidationError
from django.db import IntegrityError

from .models import Tournament

CustomUser = get_user_model()

import json

@login_required
@require_http_methods(["POST"])
def create_tournament(request):
	try:
		data = json.loads(request.body.decode("utf-8"))
	except json.JSONDecodeError:
		return JsonResponse(data = {"errors": "Invalid JSON format"},
					status=406)

	name = str(data.get('name'))
	try:
		max_players = int(data.get('max_players'))
	except ValueError:
		return JsonResponse({"errors": "Invalid number of players."},
					status=400)
	
	if not name:
		return JsonResponse({"errors": "Name is required."},
					status=400)
	
	if len(name) > 15:
		return JsonResponse({"errors": "Name is too long."},
					status=400)
	
	if not name.isalnum():
		return JsonResponse({"errors": "Name must be alphanumeric."},
					status=400)

	if not max_players in range(2, 9):
		return JsonResponse({"errors": "Invalid number of players."}, status=400)

	try:
		tournament = Tournament.objects.create(
			name=name,
			max_players=max_players
		)
		tournament.participants.add(request.user)
	except IntegrityError as e:
		if 'unique constraint' in str(e).lower():
			return JsonResponse({"errors": "This name is already taken."},
					status=400)
		return JsonResponse({"errors": "Tournament could not be created."},
					status=400)

	tournamentJSON = {
		"id": tournament.id,
		"name": tournament.name,
		"max_players": tournament.max_players,
		"participants": [p.tournament_username for p in tournament.participants.all()]
	}
	return JsonResponse({"message": "Tournament created successfully.", "tournament": tournamentJSON},
					status=201)

@require_http_methods(["GET"])
def list_tournaments(request):
	tournaments = Tournament.objects.all().filter(started=False)
	tournaments = [{"id": t.id, "name": t.name, "max_players": t.max_players,
					"participants": [p.tournament_username for p in t.participants.all()]}
					for t in tournaments]
	return JsonResponse({"tournaments": tournaments},
					status=200)

@require_http_methods(["GET"])
def list_participants(request, tournament_id):
	try:
		tournament = Tournament.objects.get(pk=tournament_id)
	except Tournament.DoesNotExist:
		return JsonResponse({"errors": "Tournament not found."},
					status=404)
	participants = [p.tournament_username for p in tournament.participants.all()]
	return JsonResponse({"participants": participants},
					status=200)
	
@login_required
@require_http_methods(["POST"])
def join_tournament(request, tournament_id):
	try:
		tournament = Tournament.objects.get(pk=tournament_id)
	except Tournament.DoesNotExist:
		return JsonResponse({"errors": "Tournament not found."},
					status=404)

	if tournament.participants.filter(pk=request.user.pk).exists():
		return JsonResponse({"errors": "User has already joined the tournament."},
					status=400)
	if tournament.participants.count() >= tournament.max_players:
		return JsonResponse({"errors": "The tournament is already full."},
					status=400)

	tournament.participants.add(request.user)

	return JsonResponse({"message": "Tournament joined successfully.", "id": tournament.id},
					status=200)

@login_required
@require_http_methods(["POST"])
def quit_tournament(request, tournament_id):
	try:
		tournament = Tournament.objects.get(pk=tournament_id)
	except Tournament.DoesNotExist:
		return JsonResponse({"errors": "Tournament not found."},
					status=404)

	if not tournament.participants.filter(pk=request.user.pk).exists():
		return JsonResponse({"errors": "User in not a participant of the tournament.", "id": tournament.id},
					status=400)

	tournament.participants.remove(request.user)
	if tournament.participants.count() == 0:
		tournament.delete()
		return JsonResponse({"message": "Successfully quit the tournament and deleted it.", "id": tournament.id},
					status=200)
	return JsonResponse({"message": "Successfully quit the tournament.", "id": tournament.id},
					status=200)

@login_required
@require_http_methods(["DELETE"])
def delete_tournament(request, tournament_id):
	try:
		tournament = Tournament.objects.get(pk=tournament_id)
	except Tournament.DoesNotExist:
		return JsonResponse({"errors": "Tournament not found."},
					status=404)
	tournament.delete()
	return JsonResponse({"message": "Tournament deleted successfully."},
					status=200)

@login_required
@require_http_methods(["GET"])
def check_if_tournament_joined(request, username):
	try:
		user = CustomUser.objects.get(username=username)
	except CustomUser.DoesNotExist:
		return JsonResponse({"errors": "User not found."},
					status=404)
	tournaments = Tournament.objects.filter(participants=user, finished=False)
	if not tournaments:
		return JsonResponse({"message": "User has not joined any tournament.", "joined": False},
					status=200)
	for tournament in tournaments:
		if not tournament.check_if_player_is_disqualified(user.tournament_username):
			tournamentJSON = {"id": tournament.id, "name": tournament.name, "max_players": tournament.max_players,
							"participants": [p.username for p in tournament.participants.all()]}
			return JsonResponse({"message": "User has joined a tournament.", "tournament": tournamentJSON, "joined": True},
						status=200)
	return JsonResponse({"message": "User has joined a tournament.", "joined": False}, status=200)

@require_http_methods(["GET"])
def return_all_user_tournaments(request, username):
	try:
		user = CustomUser.objects.get(username=username)
	except CustomUser.DoesNotExist:
		return JsonResponse({"errors": "User not found."},
					status=404)
	tournaments = Tournament.objects.filter(participants=user, finished=True)
	if not tournaments:
		return JsonResponse({"message": "User has not joined any tournament.", "joined": False},
					status=200)
	
	tournaments_data = [{
			"id": tournament.id,
			"name": tournament.name,
			"max_players": tournament.max_players,
			"participants": [participant.username for participant in tournament.participants.all()],
			"finished": tournament.finished
		}
		for tournament in tournaments
	]
	return JsonResponse({"tournaments": tournaments_data},
					status=200)