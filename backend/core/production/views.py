from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from inventory.services import (
    consume_raw_material_for_production,
    get_raw_material_available_quantity,
    receive_finished_product_from_production,
)

from .models import (
    BillOfMaterial,
    FinishedProduct,
    Machine,
    MaterialConsumption,
    ProductionOrder,
    ProductionSchedule,
)
from .serializer import (
    BillOfMaterialSerializer,
    CompleteProductionOrderSerializer,
    ConsumeBillOfMaterialSerializer,
    ConsumeMaterialSerializer,
    FinishedProductSerializer,
    MachineSerializer,
    MaterialConsumptionSerializer,
    ProductionOrderSerializer,
    ProductionScheduleSerializer,
)


class FinishedProductViewSet(viewsets.ModelViewSet):
    queryset = FinishedProduct.objects.all().order_by("name")
    serializer_class = FinishedProductSerializer
    permission_classes = [IsAuthenticated]


class BillOfMaterialViewSet(viewsets.ModelViewSet):
    queryset = (
        BillOfMaterial.objects.select_related("product")
        .prefetch_related("lines__raw_material")
        .all()
        .order_by("product__name", "version")
    )
    serializer_class = BillOfMaterialSerializer
    permission_classes = [IsAuthenticated]


class MachineViewSet(viewsets.ModelViewSet):
    queryset = Machine.objects.all().order_by("name")
    serializer_class = MachineSerializer
    permission_classes = [IsAuthenticated]


class ProductionScheduleViewSet(viewsets.ModelViewSet):
    queryset = (
        ProductionSchedule.objects.select_related("machine", "production_order")
        .all()
        .order_by("start_time")
    )
    serializer_class = ProductionScheduleSerializer
    permission_classes = [IsAuthenticated]


class ProductionOrderViewSet(viewsets.ModelViewSet):
    queryset = (
        ProductionOrder.objects.select_related(
            "product",
            "bill_of_material",
            "sales_order_line",
            "sales_order_line__sales_order",
        )
        .prefetch_related("material_consumptions")
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

    @action(detail=True, methods=["post"], url_path="consume-bom")
    @transaction.atomic
    def consume_bom(self, request, pk=None):
        production_order = self.get_object()
        request_serializer = ConsumeBillOfMaterialSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        if not production_order.bill_of_material_id:
            return Response(
                {"detail": "This production order does not have a bill of material."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        production_quantity = request_serializer.validated_data.get(
            "production_quantity"
        )
        if production_quantity is None:
            production_quantity = (
                production_order.planned_quantity - production_order.produced_quantity
            )

        if production_quantity <= 0:
            return Response(
                {"detail": "Production quantity must be greater than zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        material_consumptions = []
        required_materials = []
        bom_lines = list(
            production_order.bill_of_material.lines.select_related("raw_material")
        )

        if not bom_lines:
            return Response(
                {"detail": "This bill of material does not have any material lines."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for line in bom_lines:
            required_quantity = line.quantity_per_unit * production_quantity
            if line.scrap_percent:
                required_quantity += required_quantity * line.scrap_percent / 100

            available_quantity = get_raw_material_available_quantity(
                line.raw_material
            )
            if available_quantity < required_quantity:
                return Response(
                    {
                        "detail": (
                            f"Not enough {line.raw_material.name}. "
                            f"Required {required_quantity}, available {available_quantity}."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            required_materials.append((line, required_quantity))

        try:
            for line, required_quantity in required_materials:
                consume_raw_material_for_production(
                    production_order,
                    line.raw_material.sku,
                    required_quantity,
                )
                material_consumptions.append(
                    MaterialConsumption.objects.create(
                        production_order=production_order,
                        raw_material_name=line.raw_material.name,
                        quantity=required_quantity,
                        consumed_at=timezone.now(),
                    )
                )
        except ValueError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = MaterialConsumptionSerializer(material_consumptions, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        production_order = self.get_object()
        production_order.status = ProductionOrder.Status.CANCELLED
        production_order.save(update_fields=["status", "updated_at"])
        serializer = self.get_serializer(production_order)
        return Response(serializer.data)
