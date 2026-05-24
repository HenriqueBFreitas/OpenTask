import cloudinary.uploader
from django.db import models as db_models
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
import requests as http_requests
from django.http import HttpResponse

from .models import File, TaskFile
from .serializers import FileSerializer, TaskFileSerializer


class FileListCreateView(APIView):
    """
    GET  /api/files/          → lista todos os arquivos do usuário autenticado
    POST /api/files/          → faz upload de um arquivo (multipart/form-data)
                                campos opcionais: nickname, content_type, object_id
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
    GET    /api/files/<id>/   → retorna um arquivo (com ?download=1 faz download)
    PATCH  /api/files/<id>/   → atualiza nickname (original_name é protegido)
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

        if request.query_params.get('download') == '1':
            url = file.image_url or ''
            if not url:
                return Response({'detail': 'Sem arquivo.'}, status=404)
            try:
                r = http_requests.get(url, timeout=30)
                return HttpResponse(r.content, content_type=r.headers.get('Content-Type', 'application/octet-stream'))
            except Exception as e:
                return Response({'detail': str(e)}, status=502)

        serializer = FileSerializer(file, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, pk):
        file = self.get_object(pk, request.user)
        if not file:
            return Response({'detail': 'Arquivo não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data.pop('original_name', None)

        serializer = FileSerializer(file, data=data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        file = self.get_object(pk, request.user)
        if not file:
            return Response({'detail': 'Arquivo não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if file.image_url:
            try:
                parts = file.image_url.split('/')
                public_id_with_ext = parts[-1]
                public_id = 'files/images/' + public_id_with_ext.rsplit('.', 1)[0]
                cloudinary.uploader.destroy(public_id)
            except Exception:
                pass
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
