from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BillOfMaterialViewSet,
    FinishedProductViewSet,
    MachineViewSet,
    ProductionOrderViewSet,
    ProductionScheduleViewSet,
)

router = DefaultRouter()
router.register(r"finished-products", FinishedProductViewSet, basename="finishedproduct")
router.register(r"bill-of-materials", BillOfMaterialViewSet, basename="billofmaterial")
router.register(r"machines", MachineViewSet, basename="machine")
router.register(r"production-orders", ProductionOrderViewSet, basename="productionorder")
router.register(r"production-schedules", ProductionScheduleViewSet, basename="productionschedule")

urlpatterns = [
    path("", include(router.urls)),
]
