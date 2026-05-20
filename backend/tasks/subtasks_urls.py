from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubTaskViewSet

router = DefaultRouter()
router.register(r'', SubTaskViewSet, basename='subtasks')

urlpatterns = [
    path('', include(router.urls)),
]