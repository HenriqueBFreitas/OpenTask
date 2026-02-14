from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated
from .models import Pagina
from .serializers import PaginaSerializer

# Create your views here.

class PaginaViewSet(ModelViewSet):
    queryset = Pagina.objects.all()
    serializer_class = PaginaSerializer
    permission_classes = [IsAuthenticated]

class LoginView(TokenObtainPairView):
    pass