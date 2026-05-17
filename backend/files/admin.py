from django.contrib import admin
from .models import File, TaskFile


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ['id', 'display_name', 'original_name', 'nickname', 'user', 'size', 'uploaded_at']
    list_filter = ['uploaded_at', 'user']
    search_fields = ['original_name', 'nickname']
    readonly_fields = ['original_name', 'size', 'uploaded_at', 'file']


@admin.register(TaskFile)
class TaskFileAdmin(admin.ModelAdmin):
    list_display = ['id', 'task', 'file', 'attached_at']
    list_filter = ['attached_at']
