from django.http import JsonResponse
from django.contrib.auth.models import AnonymousUser
from django.shortcuts import redirect

def custom_login_required(func):
    def wrapper(request, *args, **kwargs):
        if isinstance(request.user, AnonymousUser) or not request.user or not request.user.email_is_verified:
            return redirect('/dash')
        return func(request, *args, **kwargs)
    return wrapper