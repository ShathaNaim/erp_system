from rest_framework import viewsets
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
from accounts.permissions import IsSalesEmployee, IsSalesManager


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsSalesEmployee | IsSalesManager]

class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.all()
    serializer_class = SalesOrderSerializer
    permission_classes = [IsAuthenticated, IsSalesEmployee | IsSalesManager]

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        sales_order = self.get_object()
        sales_order = confirm_and_route_sales_order(sales_order)
        serializer = self.get_serializer(sales_order)
        return Response(serializer.data)

class SalesOrderLineViewSet(viewsets.ModelViewSet):
    queryset = SalesOrderLine.objects.all()
    serializer_class = SalesOrderLineSerializer
    permission_classes = [IsAuthenticated, IsSalesEmployee | IsSalesManager]


class FinishedProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FinishedProduct.objects.filter(is_active=True).order_by("name")
    serializer_class = FinishedProductSerializer
    permission_classes = [IsAuthenticated, IsSalesEmployee | IsSalesManager]
