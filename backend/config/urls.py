from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/core/', include('core.urls')),
    path('api/users/', include('users.urls')),
    path('api/tasks/', include('tasks.urls')),

    path('accounts/', include('allauth.urls')),
]
