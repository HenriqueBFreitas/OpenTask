from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .models import Task, SubTask, TaskImage
from .serializers import TaskSerializer, SubTaskSerializer, TaskImageSerializer

class TaskViewSet(ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def upload_images(self, request, pk=None):
        task = self.get_object()

        files = request.FILES.getlist('images')

        if not files:
            return Response({"error": "Nenhuma imagem enviada"}, status=400)

        created = []
        for file in files:
            img = TaskImage.objects.create(task=task, image=file)
            created.append(TaskImageSerializer(img).data)

        return Response(created, status=201)

class SubTaskViewSet(ModelViewSet):
    serializer_class = SubTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SubTask.objects.filter(task__user=self.request.user)