from decimal import Decimal

from rest_framework import serializers

from .models import FinishedProduct, MaterialConsumption, ProductionOrder

class FinishedProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinishedProduct
        fields = "__all__"


class ProductionOrderSerializer(serializers.ModelSerializer):
    source = serializers.SerializerMethodField()
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    sales_order_number = serializers.CharField(
        source="sales_order_line.sales_order.order_number",
        read_only=True,
    )

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
            "planned_quantity",
            "produced_quantity",
            "status",
            "due_date",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "source",
            "product_sku",
            "product_name",
            "sales_order_number",
            "created_at",
            "updated_at",
        ]

    def get_source(self, order):
        if order.sales_order_line_id:
            return "sales"

        return "inventory"

    def validate(self, attrs):
        sales_order_line = attrs.get("sales_order_line")
        product = attrs.get("product")

        if sales_order_line and product and sales_order_line.product_id != product.id:
            raise serializers.ValidationError(
                {"product": "Product must match the selected sales order line."}
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
