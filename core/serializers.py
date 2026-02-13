from .models import Pagina
from rest_framework import serializers

class PaginaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagina
        fields = '__all__'