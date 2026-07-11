import os
from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from tasks.models import Task
import uuid


ALLOWED_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'webp', 'md"
    'pdf', 'doc', 'docx', 'xls', 'xlsx',
    'ppt', 'pptx',
    'txt', 'csv',
]


def user_file_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f'{uuid.uuid4()}.{ext}'
    return f'users/{instance.user.id}/{filename}'


class File(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='files'
    )

    file = models.FileField(
        upload_to=user_file_path,
        blank=True,
        null=True
    )

    original_name = models.CharField(
        max_length=255,
        editable=False  # nunca editável após criação
    )

    nickname = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Apelido',
        help_text='Nome amigável opcional para o arquivo.'
    )

    size = models.BigIntegerField(default=0)

    # Preenchido quando o arquivo é uma imagem (upload via Cloudinary)
    image_url = models.URLField(blank=True, null=True)

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    # Generic FK — permite vincular o arquivo a qualquer model do projeto
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='files'
    )
    object_id = models.PositiveIntegerField(
        null=True,
        blank=True
    )
    content_object = GenericForeignKey('content_type', 'object_id')

    def save(self, *args, **kwargs):
        if self.file and not self.original_name:
            self.original_name = os.path.basename(self.file.name)
        if self.file and not self.size:
            self.size = self.file.size
        super().save(*args, **kwargs)

    def display_name(self):
        """Retorna apelido se existir, caso contrário o nome original."""
        return self.nickname if self.nickname else self.original_name

    def __str__(self):
        return self.display_name()


class TaskFile(models.Model):
    class Meta:
        unique_together = ['task', 'file']

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='task_files'
    )

    file = models.ForeignKey(
        File,
        on_delete=models.CASCADE,
        related_name='task_files'
    )

    attached_at = models.DateTimeField(
        auto_now_add=True
    )
