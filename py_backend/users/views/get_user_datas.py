from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import requires_csrf_token
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from users.utils import convert_image_to_base64, utils_get_friendslist_data


@require_http_methods(["POST"])
@login_required
@requires_csrf_token
def get_user_data(request):
    user = request.user
    user_datas = {
        'username': user.username,
        'email': user.email,
        'email_is_verified': user.email_is_verified,
        'avatar': convert_image_to_base64(user.avatar),
        'bio': user.bio,
        'title': user.title,
        'winrate': user.winrate,
        'rank': user.rank,
        'n_games_played': user.n_games_played,
        'friendslist': utils_get_friendslist_data(user),
        'is_42auth': user.is_42auth
    }
    return JsonResponse({'status': 'success', 'user': user_datas}, status=200)

