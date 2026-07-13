import os
import cloudinary.uploader
from django.db import models
from rest_framework import serializers

from .models import (
    TaskFile,
    File,
    ALLOWED_EXTENSIONS,
)

IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}

MAX_FILE_SIZE = 100 * 1024 * 1024       # 100 MB
MAX_USER_STORAGE = 500 * 1024 * 1024    # 500 MB


class FileSerializer(serializers.ModelSerializer):

    file_url = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = File
        # 'file' foi removido intencionalmente: exporia a URL interna do Cloudinary.
        # Clientes devem usar 'file_url' (proxy autenticado para RAW, URL pública para imagens).
        fields = [
            'id',
            'file_url',
            'image_url',
            'original_name',
            'nickname',
            'display_name',
            'size',
            'uploaded_at',
            'content_type',
            'object_id',
        ]

        read_only_fields = [
            'original_name',
            'size',
            'uploaded_at',
            'file_url',
            'image_url',
            'display_name',
        ]

    def get_file_url(self, obj):
        # Imagens ficam como URL pública do Cloudinary (sem dados sensíveis).
        # Arquivos RAW (pdf, docx, pptx, etc.) são servidos pelo proxy autenticado
        # do backend — nunca expõe a URL direta do Cloudinary na API.
        if obj.image_url:
            return obj.image_url
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/api/files/{obj.pk}/?download=1')
            return f'/api/files/{obj.pk}/?download=1'
        return None

    def get_display_name(self, obj):
        return obj.display_name()

    def validate_file(self, value):
        ext = os.path.splitext(value.name)[1].lower().replace('.', '')

        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f'Tipo de arquivo não permitido. Permitidos: {", ".join(ALLOWED_EXTENSIONS)}'
            )

        if value.size > MAX_FILE_SIZE:
            raise serializers.ValidationError('Arquivo excede o limite de 100MB.')

        user = self.context['request'].user

        total = File.objects.filter(user=user).aggregate(
            total=models.Sum('size')
        )['total'] or 0

        if total + value.size > MAX_USER_STORAGE:
            raise serializers.ValidationError(
                'Limite de armazenamento de 500MB atingido.'
            )

        return value

    def validate_nickname(self, value):
        if value and len(value.strip()) == 0:
            raise serializers.ValidationError('O apelido não pode ser apenas espaços.')
        return value.strip() if value else value

    def create(self, validated_data):
        user = self.context['request'].user
        uploaded_file = validated_data.get('file')

        ext = os.path.splitext(uploaded_file.name)[1].lower().replace('.', '')

        if ext in IMAGE_EXTENSIONS:
            result = cloudinary.uploader.upload(uploaded_file, folder='files/images')
            instance = File.objects.create(
                user=user,
                file=None,
                original_name=uploaded_file.name,
                size=uploaded_file.size,
                image_url=result['secure_url'],
            )
            return instance

        validated_data['user'] = user
        return super().create(validated_data)


class TaskFileSerializer(serializers.ModelSerializer):

    file_detail = FileSerializer(source='file', read_only=True)

    class Meta:
        model = TaskFile
        fields = [
            'id',
            'task',
            'file',
            'file_detail',
            'attached_at',
        ]

        read_only_fields = [
            'attached_at',
            'file_detail',
        ]

    def validate(self, data):
        if TaskFile.objects.filter(task=data['task'], file=data['file']).exists():
            raise serializers.ValidationError(
                'Este arquivo já está vinculado a esta task.'
            )
        return data
