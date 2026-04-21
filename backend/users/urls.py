from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView,
    RegisterView,
    GoogleLoginView,
    CheckUsernameView,
)

app_name = 'users'

urlpatterns = [

    path('login/', LoginView.as_view(), name='login'),
    path('login/google/', GoogleLoginView.as_view(), name='google_login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('register/', RegisterView.as_view(), name='register'),

    path('check-username/', CheckUsernameView.as_view(), name='check_username'),
]