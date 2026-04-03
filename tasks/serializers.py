from rest_framework import serializers
from .models import Task, SubTask

class TaskSerializer(serializers.ModelSerializer):

    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ["user"]

class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = ['id', 'task', 'title', 'completed', 'created_at']
        read_only_fields = ['created_at']

    def validate_task(self, value):
        request = self.context.get('request')

        if request and value.user != request.user:
            raise serializers.ValidationError("Você não pode usar essa task.")

        return value