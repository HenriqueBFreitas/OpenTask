from rest_framework import serializers
from .models import Task,SubTask

class TaskSerializer(serializers.ModelSerializer):

    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ["user"]

class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = '__all__'

class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = '__all__'

    def validate_task(self, value):
        request = self.context['request']

        if value.user != request.user:
            raise serializers.ValidationError("Você não pode usar essa task.")

        return value