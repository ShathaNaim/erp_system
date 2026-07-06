from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from inventory.services import (
    consume_raw_material_for_production,
    receive_finished_product_from_production,
)

from .models import FinishedProduct, MaterialConsumption, ProductionOrder
from .serializer import (
    CompleteProductionOrderSerializer,
    ConsumeMaterialSerializer,
    FinishedProductSerializer,
    MaterialConsumptionSerializer,
    ProductionOrderSerializer,
)


class FinishedProductViewSet(viewsets.ModelViewSet):
    queryset = FinishedProduct.objects.all().order_by("name")
    serializer_class = FinishedProductSerializer
    permission_classes = [IsAuthenticated]


class ProductionOrderViewSet(viewsets.ModelViewSet):
    queryset = (
        ProductionOrder.objects.select_related(
            "product",
            "sales_order_line",
            "sales_order_line__sales_order",
        )
        .all()
        .order_by("-created_at")
    )
    serializer_class = ProductionOrderSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def release(self, request, pk=None):
        production_order = self.get_object()
        production_order.status = ProductionOrder.Status.RELEASED
        production_order.save(update_fields=["status", "updated_at"])
        serializer = self.get_serializer(production_order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        production_order = self.get_object()
        production_order.status = ProductionOrder.Status.IN_PROGRESS
        production_order.save(update_fields=["status", "updated_at"])
        serializer = self.get_serializer(production_order)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def complete(self, request, pk=None):
        production_order = self.get_object()
        request_serializer = CompleteProductionOrderSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        produced_quantity = request_serializer.validated_data["produced_quantity"]
        production_order.produced_quantity += produced_quantity

        if production_order.produced_quantity >= production_order.planned_quantity:
            production_order.status = ProductionOrder.Status.COMPLETED
        else:
            production_order.status = ProductionOrder.Status.IN_PROGRESS

        production_order.save(
            update_fields=["produced_quantity", "status", "updated_at"]
        )
        receive_finished_product_from_production(production_order, produced_quantity)

        serializer = self.get_serializer(production_order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="consume-material")
    @transaction.atomic
    def consume_material(self, request, pk=None):
        production_order = self.get_object()
        request_serializer = ConsumeMaterialSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        raw_material_name = request_serializer.validated_data["raw_material_name"]
        quantity = request_serializer.validated_data["quantity"]

        try:
            consume_raw_material_for_production(
                production_order,
                raw_material_name,
                quantity,
            )
        except ValueError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        material_consumption = MaterialConsumption.objects.create(
            production_order=production_order,
            raw_material_name=raw_material_name,
            quantity=quantity,
            consumed_at=timezone.now(),
        )
        serializer = MaterialConsumptionSerializer(material_consumption)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        production_order = self.get_object()
        production_order.status = ProductionOrder.Status.CANCELLED
        production_order.save(update_fields=["status", "updated_at"])
        serializer = self.get_serializer(production_order)
        return Response(serializer.data)
