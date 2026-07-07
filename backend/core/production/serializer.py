from decimal import Decimal

from rest_framework import serializers

from .models import (
    BillOfMaterial,
    BillOfMaterialLine,
    FinishedProduct,
    Machine,
    MaterialConsumption,
    ProductionOrder,
    ProductionSchedule,
)


class FinishedProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinishedProduct
        fields = "__all__"


class BillOfMaterialLineSerializer(serializers.ModelSerializer):
    raw_material_name = serializers.CharField(source="raw_material.name", read_only=True)
    raw_material_sku = serializers.CharField(source="raw_material.sku", read_only=True)

    class Meta:
        model = BillOfMaterialLine
        fields = [
            "id",
            "raw_material",
            "raw_material_sku",
            "raw_material_name",
            "quantity_per_unit",
            "scrap_percent",
        ]
        read_only_fields = ["id", "raw_material_sku", "raw_material_name"]


class BillOfMaterialSerializer(serializers.ModelSerializer):
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    lines = BillOfMaterialLineSerializer(many=True)

    class Meta:
        model = BillOfMaterial
        fields = [
            "id",
            "product",
            "product_sku",
            "product_name",
            "version",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
            "lines",
        ]
        read_only_fields = ["id", "product_sku", "product_name", "created_at", "updated_at"]

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        bill_of_material = BillOfMaterial.objects.create(**validated_data)

        for line_data in lines_data:
            BillOfMaterialLine.objects.create(
                bill_of_material=bill_of_material,
                **line_data,
            )

        return bill_of_material

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                BillOfMaterialLine.objects.create(
                    bill_of_material=instance,
                    **line_data,
                )

        return instance


class MachineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Machine
        fields = "__all__"


class ProductionScheduleSerializer(serializers.ModelSerializer):
    machine_name = serializers.CharField(source="machine.name", read_only=True)
    production_order_number = serializers.CharField(
        source="production_order.order_number",
        read_only=True,
    )

    class Meta:
        model = ProductionSchedule
        fields = [
            "id",
            "machine",
            "machine_name",
            "production_order",
            "production_order_number",
            "start_time",
            "end_time",
        ]
        read_only_fields = ["id", "machine_name", "production_order_number"]


class ProductionOrderSerializer(serializers.ModelSerializer):
    source = serializers.SerializerMethodField()
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    bill_of_material_version = serializers.CharField(
        source="bill_of_material.version",
        read_only=True,
    )
    sales_order_number = serializers.CharField(
        source="sales_order_line.sales_order.order_number",
        read_only=True,
    )
    material_consumptions = serializers.SerializerMethodField()

    class Meta:
        model = ProductionOrder
        fields = [
            "id",
            "order_number",
            "source",
            "sales_order_line",
            "sales_order_number",
            "product",
            "product_sku",
            "product_name",
            "bill_of_material",
            "bill_of_material_version",
            "planned_quantity",
            "produced_quantity",
            "status",
            "due_date",
            "notes",
            "material_consumptions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "source",
            "product_sku",
            "product_name",
            "bill_of_material_version",
            "sales_order_number",
            "material_consumptions",
            "created_at",
            "updated_at",
        ]

    def get_source(self, order):
        if order.sales_order_line_id:
            return "sales"

        return "inventory"

    def get_material_consumptions(self, order):
        consumptions = order.material_consumptions.order_by("-consumed_at", "-id")
        return MaterialConsumptionSerializer(consumptions, many=True).data

    def validate(self, attrs):
        product = attrs.get(
            "product",
            self.instance.product if self.instance else None,
        )
        sales_order_line = attrs.get(
            "sales_order_line",
            self.instance.sales_order_line if self.instance else None,
        )
        bill_of_material = attrs.get(
            "bill_of_material",
            self.instance.bill_of_material if self.instance else None,
        )

        if sales_order_line and product and sales_order_line.product_id != product.id:
            raise serializers.ValidationError(
                {"product": "Product must match the selected sales order line."}
            )

        if bill_of_material and product and bill_of_material.product_id != product.id:
            raise serializers.ValidationError(
                {"bill_of_material": "BOM must belong to the selected product."}
            )

        return attrs


class CompleteProductionOrderSerializer(serializers.Serializer):
    produced_quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        min_value=Decimal("0.001"),
    )


class MaterialConsumptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialConsumption
        fields = [
            "id",
            "production_order",
            "raw_material_name",
            "quantity",
            "consumed_at",
        ]
        read_only_fields = ["id", "production_order", "consumed_at"]


class ConsumeMaterialSerializer(serializers.Serializer):
    raw_material_name = serializers.CharField(max_length=255)
    quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        min_value=Decimal("0.001"),
    )


class ConsumeBillOfMaterialSerializer(serializers.Serializer):
    production_quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        min_value=Decimal("0.001"),
        required=False,
    )
