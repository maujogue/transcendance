from difflib import ndiff
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from users.models import CustomUser
from .models import Match

def user_exists(func):
    def wrapper(request, user, *args, **kwargs):
        try:
            userAuth = CustomUser.objects.get(username=user)
        except CustomUser.DoesNotExist:
            return JsonResponse({"error": "User not found"}, status=404)
        return func(request, userAuth.tournament_username, *args, **kwargs)
    return wrapper

@require_http_methods(["GET"])
@user_exists
def get_all_user_matchs(request, user):
    matchs = Match.objects.filter(player1=user) | Match.objects.filter(player2=user)
    return JsonResponse({"matchs": list(matchs.values())}, status=200)

@require_http_methods(["GET"])
@user_exists
def get_point_scored_per_match(request, user):
    matchs = Match.objects.filter(player1=user) | Match.objects.filter(player2=user)
    if matchs.count() == 0:
        return JsonResponse({"average_scored_per_match": 0, "average_conceded_per_match": 0}, status=200)
    total_score = 0
    total_score_against = 0
    for match in matchs:
        if match.player1 == user:
            total_score += match.player1_score
            total_score_against += match.player2_score
        else:
            total_score += match.player2_score
            total_score_against += match.player1_score
    return JsonResponse({
        "average_scored_per_match": round(total_score / matchs.count(), 2),
        "average_conceded_per_match": round(total_score_against / matchs.count(), 2),
        }, status=200)

@require_http_methods(["GET"])
@user_exists
def get_user_winrate(request, user):
    matchsWin = Match.objects.filter(winner=user).count()
    matchsTotal = Match.objects.count()
    if (matchsTotal == 0):
        return JsonResponse({"winrate": 0}, status=200)
    return JsonResponse({"winrate": round(matchsWin / matchsTotal * 100)}, status=200)

@require_http_methods(["GET"])
@user_exists
def get_user_win_matchs(request, user):
    matchs = Match.objects.filter(winner=user)
    return JsonResponse({"matchs": list(matchs.values())}, status=200)

@require_http_methods(["GET"])
@user_exists
def get_average_exchange_before_goal(request, user):
    matchs = Match.objects.filter(player1=user) | Match.objects.filter(player2=user)
    if matchs.count() == 0:
        return JsonResponse({"average_exchange_before_goal": 0}, status=200)
    total_exchange = 0
    for match in matchs:
        if match.player1 == user:
            total_exchange += match.player1_average_exchange
        else:
            total_exchange += match.player2_average_exchange
    return JsonResponse({"average_exchange_before_goal": round(total_exchange / matchs.count(), 2)}, status=200)

@require_http_methods(["GET"])
@user_exists
def get_user_win_streak(request, user):
    matches = Match.objects.filter(player1=user) | Match.objects.filter(player2=user)
    matches.order_by('date')
    max_series_length = 0 
    current_series_length = 0 

    for match in matches:
        if match.winner == user:
            current_series_length += 1
        else:
            max_series_length = max(max_series_length, current_series_length)  
            current_series_length = 0 
    max_series_length = max(max_series_length, current_series_length)

    return JsonResponse({"win_streak": max_series_length}, status=200)

@require_http_methods(["GET"])
@user_exists
def get_user_loose_matchs(request, user):
    matchs = Match.objects.filter(loser=user)
    return JsonResponse({"matchs": list(matchs.values())}, status=200)

@require_http_methods(["GET"])
def get_all_matchs(request):
    matchs = Match.objects.all()
    return JsonResponse({"matchs": list(matchs.values())}, status=200)

@require_http_methods(["GET"])
def get_all_matchs(request):
    matchs = Match.objects.all()
    return JsonResponse({"matchs": list(matchs.values())}, status=200)
