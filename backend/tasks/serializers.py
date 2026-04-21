from rest_framework import serializers
from .models import Task, SubTask, TaskImage

class TaskImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskImage
        fields = ['id', 'image', 'uploaded_at']

class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = ['id', 'title', 'completed', 'created_at']
        read_only_fields = ['created_at']

    def validate_task(self, value):
        request = self.context.get('request')

        if not request:
            return value

        if value.user != request.user:
            raise serializers.ValidationError("Você não pode usar essa task.")

        return value

class TaskSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    images_data = TaskImageSerializer(source='images', many=True, read_only=True)
    subtasks = SubTaskSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'completed',
            'created_at',
            'images',
            'images_data',
            'subtasks'
        ]
        read_only_fields = ["user"]

    def create(self, validated_data):
        images = validated_data.pop('images', [])
        task = Task.objects.create(**validated_data)

        for image in images:
            TaskImage.objects.create(task=task, image=image)

        return task