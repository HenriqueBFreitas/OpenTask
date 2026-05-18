from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, SubTaskViewSet, BoardView
from files.views import TaskFileListCreateView, TaskFileDetailView

router = DefaultRouter()
router.register(r'', TaskViewSet, basename='tasks')

subtask_router = DefaultRouter()
subtask_router.register(r'subtasks', SubTaskViewSet, basename='subtasks')

urlpatterns = [
    path('boards/', BoardView.as_view()),  # ← antes do router
    path('', include(router.urls)),
    path('', include(subtask_router.urls)),
    path('<int:task_id>/files/', TaskFileListCreateView.as_view(), name='taskfile-list-create'),
    path('<int:task_id>/files/<int:pk>/', TaskFileDetailView.as_view(), name='taskfile-detail'),
]
