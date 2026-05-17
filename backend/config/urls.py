from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/core/', include('core.urls')),
    path('api/users/', include('users.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/files/', include('files.urls')),
    path('api/groups/', include('groups.urls')),
    path('api/friends/', include('friends.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
