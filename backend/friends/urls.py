from django.urls import path
from .views import (
    UserSearchView,
    FriendRequestSendView,
    FriendRequestRespondView,
    FriendListView,
    FriendRemoveView,
)

urlpatterns = [
    path('search/', UserSearchView.as_view()),
    path('', FriendListView.as_view()),
    path('request/<int:user_id>/', FriendRequestSendView.as_view()),
    path('request/<int:friendship_id>/respond/', FriendRequestRespondView.as_view()),
    path('remove/<int:user_id>/', FriendRemoveView.as_view()),
]
