from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, BoardView
from files.views import TaskFileListCreateView, TaskFileDetailView

router = DefaultRouter()
router.register(r'', TaskViewSet, basename='tasks')

urlpatterns = [
    path('boards/', BoardView.as_view()),
    path('<int:task_id>/files/', TaskFileListCreateView.as_view(), name='taskfile-list-create'),
    path('<int:task_id>/files/<int:pk>/', TaskFileDetailView.as_view(), name='taskfile-detail'),
    path('', include(router.urls)),
]
