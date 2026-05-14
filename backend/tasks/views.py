from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db import models
from .models import Task, SubTask, TaskImage
from .serializers import TaskSerializer, SubTaskSerializer, TaskImageSerializer


class TaskViewSet(ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        task = self.get_object()
        new_completed = serializer.validated_data.get('completed', task.completed)

        if new_completed and not task.completed:
            task.subtasks.update(
                completed_before_task=models.F('completed'),
                completed=True
            )
        elif not new_completed and task.completed:
            for subtask in task.subtasks.all():
                subtask.completed = subtask.completed_before_task
                subtask.save()

        serializer.save()

    @action(
        detail=True,
        methods=['post'],
        url_path='upload-images',
        parser_classes=[MultiPartParser, FormParser]
    )
    def upload_images(self, request, pk=None):
        task = self.get_object()

        files = request.FILES.getlist('images')

        if not files:
            return Response({"error": "Nenhuma imagem enviada"}, status=400)

        created = []
        for file in files:
            img = TaskImage.objects.create(task=task, image=file)
            created.append(TaskImageSerializer(img, context={'request': request}).data)

        return Response(created, status=status.HTTP_201_CREATED)


class SubTaskViewSet(ModelViewSet):
    serializer_class = SubTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SubTask.objects.filter(task__user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context