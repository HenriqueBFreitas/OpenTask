from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PageViewSet, NotificationListView, NotificationMarkReadView

router = DefaultRouter()
router.register(r'pages', PageViewSet, basename='page')

urlpatterns = [
    path('', include(router.urls)),
    path('notifications/', NotificationListView.as_view()),
    path('notifications/mark-read/', NotificationMarkReadView.as_view()),
]
