from django.urls import path
from .views import (
    FileListCreateView,
    FileDetailView,
    FileStorageStatsView,
)

urlpatterns = [
    path('', FileListCreateView.as_view(), name='file-list-create'),
    path('stats/', FileStorageStatsView.as_view(), name='file-stats'),
    path('<int:pk>/', FileDetailView.as_view(), name='file-detail'),
]
