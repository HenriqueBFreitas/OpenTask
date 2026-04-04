from django.shortcuts import render
from rest_framework import generics
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User
from .serializers import RegisterSerializer

# Create your views here.

class LoginView(TokenObtainPairView):
    pass

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
