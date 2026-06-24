from rest_framework.routers import DefaultRouter
from .views import (
    CustomerViewSet,
    FinishedProductViewSet,
    SalesOrderViewSet,
    SalesOrderLineViewSet,
)

router = DefaultRouter()
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"sales-orders", SalesOrderViewSet, basename="salesorder")
router.register(r"sales-order-lines", SalesOrderLineViewSet, basename="salesorderline")
router.register(r"products", FinishedProductViewSet, basename="finishedproduct")
urlpatterns = router.urls
