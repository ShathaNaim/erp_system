from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from production.models import FinishedProduct
from sales.models import SalesOrder

from .serializer import (
    FinishedProductInventoryCheckRequestSerializer,
    FinishedProductInventoryCheckSerializer,
    FinishedProductStockSerializer,
    SalesOrderInventoryLineCheckSerializer,
)
from .services import (
    check_finished_product_availability,
    check_sales_order_inventory,
    ship_sales_order,
)


class FinishedProductStockListView(ListAPIView):
    queryset = FinishedProduct.objects.filter(is_active=True).order_by("name")
    serializer_class = FinishedProductStockSerializer
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

    def get(self, request, sales_order_id):
        sales_order = get_object_or_404(SalesOrder, id=sales_order_id)
        results = check_sales_order_inventory(sales_order)
        serializer = SalesOrderInventoryLineCheckSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SalesOrderShipmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, sales_order_id):
        sales_order = get_object_or_404(SalesOrder, id=sales_order_id)

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
