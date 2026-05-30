from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RawMaterialViewSet, SupplierViewSet, PurchaseOrderViewSet
router = DefaultRouter()
router.register(r"raw-materials", RawMaterialViewSet, basename="rawmaterial")   
router.register(r"suppliers", SupplierViewSet, basename="supplier")
router.register(r"purchase-orders", PurchaseOrderViewSet, basename="purchaseorder")

urlpatterns = router.urls
