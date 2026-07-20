from django.db.models import ProtectedError
from .serializer import RawMaterialSerializer,SupplierSerializer,PurchaseOrderSerializer
from .models import RawMaterial, Supplier,PurchaseOrder
from inventory.services import receive_purchase_order
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework import status
from rest_framework.response import Response
from accounts.permissions import (
    DemoReadOnlyPermission,
    IsProcurementEmployee,
    IsProcurementManager,
)
from rest_framework.permissions import IsAuthenticated
# Create your views here.
class RawMaterialViewSet(viewsets.ModelViewSet):
    queryset = RawMaterial.objects.all()
    serializer_class = RawMaterialSerializer
     
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [
                IsAuthenticated,
                DemoReadOnlyPermission,
                IsProcurementManager,
            ]
        else:
            permission_classes = [IsAuthenticated, DemoReadOnlyPermission]
        return [permission() for permission in permission_classes]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This material is used by orders or inventory and cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [
                IsAuthenticated,
                DemoReadOnlyPermission,
                IsProcurementManager,
            ]
        else:
            permission_classes = [IsAuthenticated, DemoReadOnlyPermission]

        return [permission() for permission in permission_classes]      

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This supplier has purchase records and cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [
        IsAuthenticated,
        DemoReadOnlyPermission,
        IsProcurementEmployee,
    ]

    def update(self, request, *args, **kwargs):
        purchase_order = self.get_object()
        if purchase_order.status != PurchaseOrder.Status.DRAFT:
            return Response(
                {"detail": "Only draft purchase orders can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        purchase_order = self.get_object()
        if purchase_order.status != PurchaseOrder.Status.DRAFT:
            return Response(
                {"detail": "Only draft purchase orders can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        purchase_order = self.get_object()
        if purchase_order.status != PurchaseOrder.Status.DRAFT:
            return Response(
                {"detail": "Only draft purchase orders can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)

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

