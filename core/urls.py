from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PageViewSet, TaskViewSet

router = DefaultRouter()
router.register(r'pages', PageViewSet, basename='page')
router.register(r'tasks', TaskViewSet, basename='tasks')

urlpatterns = router.urls

urlpatterns = [
    path('', include(router.urls)),
]