from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FinishedProductViewSet, ProductionOrderViewSet

router = DefaultRouter()
router.register(r"finished-products", FinishedProductViewSet, basename="finishedproduct")
router.register(r"production-orders", ProductionOrderViewSet, basename="productionorder")

urlpatterns = [
    path("", include(router.urls)),
]
