from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.db import IntegrityError
from .utils import generate_unique_username
from .models import CustomUser
from .serializers import (
    RegisterSerializer,
    EmailTokenObtainPairSerializer,
    UsernameUpdateSerializer,
    ProfileUpdateSerializer,
)
import requests
import cloudinary.uploader


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class CheckUsernameView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')

        if not username:
            return Response(
                {'error': 'Username é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        exists = CustomUser.objects.filter(username=username).exists()
        return Response({'exists': exists})


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

        if data.get('email_verified') != 'true':
            return Response(
                {'error': 'Email não verificado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = data.get('email')
        google_id = data.get('sub')
        picture = data.get('picture', '')
        google_name = data.get('name', '')

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
                if not user.avatar_set:
                    user.avatar_url = picture

                if not user.full_name and google_name:
                    user.full_name = google_name
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
                user.full_name = google_name
                user.username_set = False
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


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'username':     user.username,
            'full_name':    user.full_name,
            'email':        user.email,
            'avatar':       getattr(user, 'avatar_url', None),
            'username_set': user.username_set,
        })

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            instance=request.user,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'username':     user.username,
                'full_name':    user.full_name,
                'email':        user.email,
                'avatar':       getattr(user, 'avatar_url', None),
                'username_set': user.username_set,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        avatar = request.FILES.get('avatar')
        if not avatar:
            return Response({'detail': 'Nenhuma imagem enviada.'}, status=400)

        ext = avatar.name.split('.')[-1].lower()
        if ext not in {'jpg', 'jpeg', 'png', 'gif', 'webp'}:
            return Response({'detail': 'Formato não suportado.'}, status=400)

        if avatar.size > 5 * 1024 * 1024:
            return Response({'detail': 'Imagem maior que 5 MB.'}, status=400)

        try:
            result = cloudinary.uploader.upload(
                avatar,
                folder='avatars',
                transformation=[{'width': 400, 'height': 400, 'crop': 'fill', 'gravity': 'face'}],
            )
            request.user.avatar_url = result['secure_url']
            request.user.save()
            return Response({'avatar_url': result['secure_url']})
        except Exception as e:
            return Response({'detail': str(e)}, status=502)


class UsernameUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = UsernameUpdateSerializer(
            instance=request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'username': user.username,
                'username_set': user.username_set,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)