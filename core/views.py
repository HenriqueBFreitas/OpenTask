from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from .models import Pagina
from .serializers import PaginaSerializer

# Create your views here.

class PaginaViewSet(ModelViewSet):
    queryset = Pagina.objects.all()
    seryalizer_class = PaginaSerializer