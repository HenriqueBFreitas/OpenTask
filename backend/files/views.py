import cloudinary.uploader
from django.db import models as db_models
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from .models import File, TaskFile
from .serializers import FileSerializer, TaskFileSerializer


class FileListCreateView(APIView):
    """
    GET  /api/files/          → lista todos os arquivos do usuário autenticado
    POST /api/files/          → faz upload de um arquivo (multipart/form-data)
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        files = File.objects.filter(user=request.user).order_by('-uploaded_at')
        serializer = FileSerializer(files, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = FileSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FileDetailView(APIView):
    """
    GET    /api/files/<id>/   → retorna um arquivo
    DELETE /api/files/<id>/   → deleta o arquivo (registro + arquivo físico)
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return File.objects.get(pk=pk, user=user)
        except File.DoesNotExist:
            return None

    def get(self, request, pk):
        file = self.get_object(pk, request.user)
        if not file:
            return Response({'detail': 'Arquivo não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = FileSerializer(file, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, pk):
        file = self.get_object(pk, request.user)
        if not file:
            return Response({'detail': 'Arquivo não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if file.image_url:
            # Extrai o public_id do Cloudinary da URL e deleta
            try:
                # URL pattern: .../files/images/<public_id>.<ext>
                parts = file.image_url.split('/')
                public_id_with_ext = parts[-1]
                public_id = 'files/images/' + public_id_with_ext.rsplit('.', 1)[0]
                cloudinary.uploader.destroy(public_id)
            except Exception:
                pass  # Falha silenciosa — registro será deletado mesmo assim
        elif file.file:
            file.file.delete(save=False)
        file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskFileListCreateView(APIView):
    """
    GET  /api/tasks/<task_id>/files/   → lista arquivos vinculados a uma task
    POST /api/tasks/<task_id>/files/   → vincula um arquivo já existente a uma task
    body: { "file": <file_id> }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        task_files = (
            TaskFile.objects
            .filter(task_id=task_id, task__user=request.user)
            .select_related('file')
            .order_by('-attached_at')
        )
        serializer = TaskFileSerializer(task_files, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, task_id):
        data = request.data.copy()
        data['task'] = task_id

        file_id = data.get('file')
        if not File.objects.filter(pk=file_id, user=request.user).exists():
            return Response({'detail': 'Arquivo não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TaskFileSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TaskFileDetailView(APIView):
    """
    DELETE /api/tasks/<task_id>/files/<id>/  → desvincula arquivo da task
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, task_id, pk):
        try:
            task_file = TaskFile.objects.get(pk=pk, task_id=task_id, task__user=request.user)
        except TaskFile.DoesNotExist:
            return Response({'detail': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        task_file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FileStorageStatsView(APIView):
    """
    GET /api/files/stats/  → retorna uso de armazenamento do usuário
    """
    permission_classes = [IsAuthenticated]

    MAX_STORAGE = 500 * 1024 * 1024  # 500 MB

    def get(self, request):
        result = File.objects.filter(user=request.user).aggregate(
            total_size=db_models.Sum('size'),
            total_files=db_models.Count('id'),
        )
        used = result['total_size'] or 0
        return Response({
            'total_files': result['total_files'],
            'used_bytes': used,
            'used_mb': round(used / (1024 * 1024), 2),
            'limit_bytes': self.MAX_STORAGE,
            'limit_mb': 500,
            'available_bytes': max(0, self.MAX_STORAGE - used),
        })
