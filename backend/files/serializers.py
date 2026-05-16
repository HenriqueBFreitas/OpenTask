import os

from django.db import models
from rest_framework import serializers

from .models import (
    TaskFile,
    File,
    ALLOWED_EXTENSIONS
)

MAX_FILE_SIZE = 100 * 1024 * 1024       # 100 MB
MAX_USER_STORAGE = 500 * 1024 * 1024    # 500 MB


class FileSerializer(serializers.ModelSerializer):

    # URL absoluta para o frontend consumir direto
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = [
            'id',
            'file',
            'file_url',
            'original_name',
            'size',
            'uploaded_at',
        ]

        read_only_fields = [
            'original_name',
            'size',
            'uploaded_at',
            'file_url',
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

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


class TaskFileSerializer(serializers.ModelSerializer):

    # Inclui os detalhes do arquivo junto (útil para o frontend)
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
        # Evita duplicata (task + file já vinculados)
        if TaskFile.objects.filter(task=data['task'], file=data['file']).exists():
            raise serializers.ValidationError(
                'Este arquivo já está vinculado a esta task.'
            )
        return data
