from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from .models import Page, Task
from .serializers import PageSerializer, TaskSerializer



class PageViewSet(ModelViewSet):
    serializer_class = PageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Page.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
<<<<<<< HEAD
        serializer.save(user=self.request.user)


class TaskViewSet(ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
=======
>>>>>>> 69d3394 (feat: todo app with Page and Task models)
        serializer.save(user=self.request.user)