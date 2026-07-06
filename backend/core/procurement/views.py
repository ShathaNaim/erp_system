from .serializer import RawMaterialSerializer,SupplierSerializer,PurchaseOrderSerializer
from .models import RawMaterial, Supplier,PurchaseOrder
from inventory.services import receive_purchase_order
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.response import Response
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

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        purchase_order = self.get_object()
        try:
            purchase_order = receive_purchase_order(purchase_order)
        except ValueError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(purchase_order)
        return Response(serializer.data)

