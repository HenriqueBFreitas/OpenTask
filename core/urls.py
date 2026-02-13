from rest_framework.routers import DefaultRouter
from .views import PaginaViewSet

router = DefaultRouter()
router.register(r'paginas', PaginaViewSet)

urlpatterns = router.urls
