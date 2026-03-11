from rest_framework import serializers
from .models import Page, Task

class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = '__all__'