from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, SubTaskViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='tasks')
router.register(r'subtasks', SubTaskViewSet, basename='subtasks')

urlpatterns = router.urls

urlpatterns = [
    path('', include(router.urls)),
]