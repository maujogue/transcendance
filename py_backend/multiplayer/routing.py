from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/lobby/$', consumers.PongConsumer.as_asgi()),
    re_path(r'ws/lobby/(?P<lobby_id>[0-9a-f-]+)/$', consumers.PongConsumer.as_asgi()),
]