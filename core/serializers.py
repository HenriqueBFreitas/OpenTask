from rest_framework import serializers
from .models import Page, Task

class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
<<<<<<< HEAD
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):

    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ["user"]
=======
        fields = '__all__'
>>>>>>> 69d3394 (feat: todo app with Page and Task models)
