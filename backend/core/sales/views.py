from django.db.models import ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from production.models import FinishedProduct
from .models import Customer, SalesOrder, SalesOrderLine
from .serializer import (
    CustomerSerializer,
    FinishedProductSerializer,
    SalesOrderSerializer,
    SalesOrderLineSerializer,
)
from .services import confirm_and_route_sales_order
from accounts.permissions import (
    DemoReadOnlyPermission,
    IsSalesEmployee,
    IsSalesManager,
)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [
        IsAuthenticated,
        DemoReadOnlyPermission,
        IsSalesEmployee | IsSalesManager,
    ]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This customer has sales orders and cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.all()
    serializer_class = SalesOrderSerializer
    permission_classes = [
        IsAuthenticated,
        DemoReadOnlyPermission,
        IsSalesEmployee | IsSalesManager,
    ]

    def update(self, request, *args, **kwargs):
        sales_order = self.get_object()
        if sales_order.status != SalesOrder.Status.DRAFT:
            return Response(
                {"detail": "Only draft sales orders can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        sales_order = self.get_object()
        if sales_order.status != SalesOrder.Status.DRAFT:
            return Response(
                {"detail": "Only draft sales orders can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        sales_order = self.get_object()
        if sales_order.status != SalesOrder.Status.DRAFT:
            return Response(
                {"detail": "Only draft sales orders can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        sales_order = self.get_object()
        sales_order = confirm_and_route_sales_order(sales_order)
        serializer = self.get_serializer(sales_order)
        return Response(serializer.data)

class SalesOrderLineViewSet(viewsets.ModelViewSet):
    queryset = SalesOrderLine.objects.all()
    serializer_class = SalesOrderLineSerializer
    permission_classes = [
        IsAuthenticated,
        DemoReadOnlyPermission,
        IsSalesEmployee | IsSalesManager,
    ]


class FinishedProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FinishedProduct.objects.filter(is_active=True).order_by("name")
    serializer_class = FinishedProductSerializer
    permission_classes = [
        IsAuthenticated,
        DemoReadOnlyPermission,
        IsSalesEmployee | IsSalesManager,
    ]
