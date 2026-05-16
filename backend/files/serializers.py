import os

from django.db import models
from rest_framework import serializers

from .models import (
    TaskFile,
    File,
    ALLOWED_EXTENSIONS
)

MAX_FILE_SIZE = 100 * 1024 * 1024
MAX_USER_STORAGE = 500 * 1024 * 1024


class FileSerializer(serializers.ModelSerializer):

    class Meta:
        model = File
        fields = [
            'id',
            'file',
            'original_name',
            'size',
            'uploaded_at'
        ]

        read_only_fields = [
            'original_name',
            'size',
            'uploaded_at'
        ]

    def create(self, validated_data):

        validated_data['user'] = (
            self.context['request'].user
        )

        return super().create(validated_data)

    def validate_file(self, value):

        ext = os.path.splitext(
            value.name
        )[1].lower().replace('.', '')

        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                'Tipo de arquivo não permitido.'
            )

        if value.size > MAX_FILE_SIZE:
            raise serializers.ValidationError(
                'Arquivo excede 100MB.'
            )

        user = self.context['request'].user

        total = File.objects.filter(
            user=user
        ).aggregate(
            total=models.Sum('size')
        )['total'] or 0

        if total + value.size > MAX_USER_STORAGE:
            raise serializers.ValidationError(
                'Limite total de 500MB atingido.'
            )

        return value

class TaskFileSerializer(serializers.ModelSerializer):

    class Meta:
        model = TaskFile
        fields = [
            'id',
            'task',
            'file',
            'attached_at'
        ]

        read_only_fields = [
            'attached_at'
        ]