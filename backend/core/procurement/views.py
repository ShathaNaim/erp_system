from django.shortcuts import render
from .serializer import RawMaterialSerializer,SupplierSerializer,PurchaseOrderSerializer
from .models import RawMaterial, Supplier,PurchaseOrder
from rest_framework import viewsets
from accounts.permissions import IsProcurementManager,IsProcurementEmployee
from rest_framework.permissions import IsAuthenticated
# Create your views here.
class RawMaterialViewSet(viewsets.ModelViewSet):
    queryset = RawMaterial.objects.all()
    serializer_class = RawMaterialSerializer
     
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsProcurementManager]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes=[IsAuthenticated, IsProcurementManager]
        else:
            permission_classes=[IsAuthenticated]

        return [permission() for permission in permission_classes]      

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated,IsProcurementEmployee]

