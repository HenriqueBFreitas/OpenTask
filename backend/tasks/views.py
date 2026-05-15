from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .models import Task, SubTask, TaskImage, Board
from .serializers import TaskSerializer, SubTaskSerializer, TaskImageSerializer, BoardSerializer
from rest_framework.views import APIView


class TaskViewSet(ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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

class BoardView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        board, _ = Board.objects.get_or_create(user=request.user)
        return Response(BoardSerializer(board).data)
    def put(self, request):
        board, _ = Board.objects.get_or_create(user=request.user)
        serializer = BoardSerializer(board, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
