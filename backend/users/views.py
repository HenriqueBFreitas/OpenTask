from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.db import IntegrityError
import requests

from .utils import generate_unique_username
from .models import CustomUser
from .serializers import RegisterSerializer, EmailTokenObtainPairSerializer


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [AllowAny]


class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')

        if not token:
            return Response(
                {'error': 'Token não enviado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            google_response = requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'id_token': token},
                timeout=5
            )
        except requests.RequestException:
            return Response(
                {'error': 'Erro ao conectar com o Google'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        if google_response.status_code != 200:
            return Response(
                {'error': 'Token inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = google_response.json()

        if data.get('aud') != settings.GOOGLE_CLIENT_ID:
            return Response(
                {'error': 'Token inválido para este app'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if data.get('email_verified') is not True:
            return Response(
                {'error': 'Email não verificado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = data.get('email')
        google_id = data.get('sub')
        picture = data.get('picture', '')

        if not email or not google_id:
            return Response(
                {'error': 'Dados do Google incompletos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = CustomUser.objects.filter(email=email).first()

            if user:
                if not user.google_id:
                    user.google_id = google_id

                user.avatar_url = picture
                user.save()
            else:
                base = email.split('@')[0]
                username = generate_unique_username(base)

                user = CustomUser.objects.create_user(
                    username=username,
                    email=email,
                    password=None
                )

                user.google_id = google_id
                user.avatar_url = picture
                user.save()

        except IntegrityError:
            return Response(
                {'error': 'Erro ao criar usuário'},
                status=status.HTTP_400_BAD_REQUEST
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })