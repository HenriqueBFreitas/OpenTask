import cloudinary.uploader
from django.db.models import Q
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

def _extract_cloudinary_public_id(url):
    """Extrai o public_id de uma URL do Cloudinary para uso no destroy."""
    try:
        parts = url.split('/upload/')
        if len(parts) != 2:
            return None
        path = parts[1]
        if path.startswith('v') and '/' in path:
            path = path.split('/', 1)[1]
        public_id = path.rsplit('.', 1)[0]
        return public_id
    except Exception:
        return None

from .models import Task, SubTask, TaskImage, Board
from .serializers import TaskSerializer, SubTaskSerializer, TaskImageSerializer, BoardSerializer

def user_group_ids(user):
    return user.group_memberships.values_list('group_id', flat=True)

class TaskViewSet(ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        groups = user_group_ids(user)
        return Task.objects.filter(
            Q(user=user) |
            Q(groups__in=groups)
        ).distinct()

    def perform_create(self, serializer):
        # 'groups' e 'is_personal' já vêm validados pelo serializer (incluindo
        # a conversão de string 'true'/'false' para bool, e os IDs de grupo
        # para instâncias de Group). Só aplicamos um valor padrão para
        # is_personal quando o cliente não o enviou explicitamente.
        groups = serializer.validated_data.get('groups', [])
        is_personal = serializer.validated_data.get('is_personal', not groups)

        # Isso preserva a escolha do usuário: uma tarefa pode ser pessoal
        # E pertencer a uma ou mais equipes ao mesmo tempo. O DRF já cuida
        # de popular o M2M 'groups' a partir do validated_data.
        serializer.save(user=self.request.user, is_personal=is_personal)

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
            result = cloudinary.uploader.upload(file, folder='tasks/images')
            img = TaskImage.objects.create(task=task, image_url=result["secure_url"])
            created.append(TaskImageSerializer(img, context={'request': request}).data)
        return Response(created, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['delete'],
        url_path='remove-image',
    )
    def remove_image(self, request, pk=None):
        """
        DELETE /api/tasks/<id>/remove-image/
        Remove todas as imagens da task e as apaga do Cloudinary.
        Opcionalmente aceita ?image_id=<id> para remover apenas uma imagem específica.
        """
        task = self.get_object()
        image_id = request.query_params.get('image_id')

        if image_id:
            try:
                img = TaskImage.objects.get(pk=image_id, task=task)
            except TaskImage.DoesNotExist:
                return Response({'error': 'Imagem não encontrada.'}, status=404)
            imgs = [img]
        else:
            imgs = list(task.images.all())

        for img in imgs:
            if img.image_url:
                try:
                    public_id = _extract_cloudinary_public_id(img.image_url)
                    if public_id:
                        cloudinary.uploader.destroy(public_id, resource_type='image')
                except Exception:
                    pass
            img.delete()

        return Response(status=204)

class SubTaskViewSet(ModelViewSet):
    serializer_class = SubTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        groups = user_group_ids(user)
        return SubTask.objects.filter(
            Q(task__user=user) |
            Q(task__groups__in=groups)
        ).distinct()

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
