from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from production.models import FinishedProduct
from procurement.models import RawMaterial
from sales.models import SalesOrder

from .serializer import (
    FinishedProductInventoryCheckRequestSerializer,
    FinishedProductInventoryCheckSerializer,
    FinishedProductStockSerializer,
    RawMaterialStockSerializer,
    SalesOrderInventoryLineCheckSerializer,
)
from .services import (
    check_finished_product_availability,
    check_sales_order_inventory,
    ship_sales_order,
)


def get_sales_order_by_reference(sales_order_ref):
    if str(sales_order_ref).isdigit():
        sales_order = SalesOrder.objects.filter(id=sales_order_ref).first()
        if sales_order:
            return sales_order

    return get_object_or_404(SalesOrder, order_number=sales_order_ref)


class FinishedProductStockListView(ListAPIView):
    queryset = FinishedProduct.objects.filter(is_active=True).order_by("name")
    serializer_class = FinishedProductStockSerializer
    permission_classes = [IsAuthenticated]


class RawMaterialStockListView(ListAPIView):
    queryset = RawMaterial.objects.filter(is_active=True).order_by("name")
    serializer_class = RawMaterialStockSerializer
    permission_classes = [IsAuthenticated]


class FinishedProductInventoryCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request_serializer = FinishedProductInventoryCheckRequestSerializer(
            data=request.data
        )
        request_serializer.is_valid(raise_exception=True)

        result = check_finished_product_availability(
            request_serializer.validated_data["product"],
            request_serializer.validated_data["quantity"],
        )
        response_serializer = FinishedProductInventoryCheckSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class SalesOrderInventoryCheckView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, sales_order_ref):
        sales_order = get_sales_order_by_reference(sales_order_ref)
        results = check_sales_order_inventory(sales_order)
        serializer = SalesOrderInventoryLineCheckSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SalesOrderShipmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sales_order_ref):
        sales_order = get_sales_order_by_reference(sales_order_ref)

        try:
            shipped_order = ship_sales_order(sales_order)
        except ValueError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "id": shipped_order.id,
                "order_number": shipped_order.order_number,
                "status": shipped_order.status,
            },
            status=status.HTTP_200_OK,
        )
