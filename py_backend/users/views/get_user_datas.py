from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import requires_csrf_token
from users.decorators import custom_login_required
from django.http import JsonResponse

from users.utils import convert_image_to_base64


@require_http_methods(["POST"])
@custom_login_required
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
        'is_42auth': user.is_42auth,
        'lang': user.lang
    }
    return JsonResponse({'status': 'success', 'user': user_datas, 'lang': user.lang }, status=200)