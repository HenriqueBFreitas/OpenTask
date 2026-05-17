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

    file_url = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = [
            'id',
            'file',
            'file_url',
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
            'display_name',
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_display_name(self, obj):
        return obj.display_name()

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

    def validate_nickname(self, value):
        if value and len(value.strip()) == 0:
            raise serializers.ValidationError('O apelido não pode ser apenas espaços.')
        return value.strip() if value else value


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
