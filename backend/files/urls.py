from django.urls import path
from .views import (
    FileListCreateView,
    FileDetailView,
    FileStorageStatsView,
    TaskFileListCreateView,
    TaskFileDetailView,
)

urlpatterns = [
    path('', FileListCreateView.as_view(), name='file-list-create'),
    path('stats/', FileStorageStatsView.as_view(), name='file-stats'),
    path('<int:pk>/', FileDetailView.as_view(), name='file-detail'),
]

# Rotas de TaskFile (incluir no urls.py principal dentro de tasks/)
# path('tasks/<int:task_id>/files/', TaskFileListCreateView.as_view(), name='task-file-list-create'),
# path('tasks/<int:task_id>/files/<int:pk>/', TaskFileDetailView.as_view(), name='task-file-detail'),
