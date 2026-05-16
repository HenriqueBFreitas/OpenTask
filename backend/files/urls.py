from django.urls import path
from .views import (
    FileListCreateView,
    FileDetailView,
    TaskFileListCreateView,
    TaskFileDetailView,
    FileStorageStatsView,
)

urlpatterns = [
    # ── Arquivos do usuário ────────────────────────────────────────────────
    # GET    /api/files/         → lista arquivos do usuário
    # POST   /api/files/         → upload de arquivo (multipart/form-data)
    path('files/', FileListCreateView.as_view(), name='file-list-create'),

    # GET    /api/files/<id>/    → detalhes de um arquivo
    # DELETE /api/files/<id>/    → deleta arquivo (registro + arquivo físico)
    path('files/<int:pk>/', FileDetailView.as_view(), name='file-detail'),

    # GET    /api/files/stats/   → uso de armazenamento do usuário
    path('files/stats/', FileStorageStatsView.as_view(), name='file-stats'),

    # ── Arquivos vinculados a Tasks ────────────────────────────────────────
    # GET    /api/tasks/<task_id>/files/       → arquivos de uma task
    # POST   /api/tasks/<task_id>/files/       → vincula arquivo a uma task
    path('tasks/<int:task_id>/files/', TaskFileListCreateView.as_view(), name='taskfile-list-create'),

    # DELETE /api/tasks/<task_id>/files/<id>/  → desvincula arquivo da task
    path('tasks/<int:task_id>/files/<int:pk>/', TaskFileDetailView.as_view(), name='taskfile-detail'),
]
