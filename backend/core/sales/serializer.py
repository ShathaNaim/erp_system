from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from production.models import FinishedProduct
from .models import Customer, SalesOrder, SalesOrderLine
from .services import (
    get_available_finished_stock,
    get_required_production_quantity,
    get_sales_order_line_route,
)


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"


class FinishedProductSerializer(serializers.ModelSerializer):
    available_stock = serializers.SerializerMethodField()

    class Meta:
        model = FinishedProduct
        fields = [
            "id",
            "sku",
            "name",
            "description",
            "product_type",
            "unit",
            "selling_price",
            "is_active",
            "available_stock",
        ]

    def get_available_stock(self, product):
        total = product.stock_lots.aggregate(total=Sum("quantity_on_hand"))["total"]
        return total or 0


class CustomProductSerializer(serializers.Serializer):
    sku = serializers.CharField(max_length=80)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    unit = serializers.CharField(max_length=30, default="piece")

    def validate_sku(self, value):
        if FinishedProduct.objects.filter(sku=value).exists():
            raise serializers.ValidationError("A product with this SKU already exists.")
        return value


class SalesOrderLineSerializer(serializers.ModelSerializer):
    custom_product = CustomProductSerializer(write_only=True, required=False)
    available_stock = serializers.SerializerMethodField()
    route = serializers.SerializerMethodField()
    production_required_quantity = serializers.SerializerMethodField()

    class Meta:
        model = SalesOrderLine
        fields = [
            "id",
            "sales_order",
            "product",
            "custom_product",
            "quantity",
            "unit_price",
            "notes",
            "available_stock",
            "route",
            "production_required_quantity",
        ]
        read_only_fields = [
            "id",
            "available_stock",
            "route",
            "production_required_quantity",
        ]
        extra_kwargs = {
            "sales_order": {"required": False},
            "product": {"required": False},
        }

    def get_available_stock(self, line):
        if not line.product_id:
            return 0

        return get_available_finished_stock(line.product)

    def get_route(self, line):
        if not line.product_id:
            return None

        return get_sales_order_line_route(line)

    def get_production_required_quantity(self, line):
        if not line.product_id:
            return 0

        return get_required_production_quantity(line)

    def validate(self, attrs):
        product = attrs.get("product")
        custom_product = attrs.get("custom_product")

        if bool(product) == bool(custom_product):
            raise serializers.ValidationError(
                "Choose an existing product or provide a custom product, not both."
            )

        if product and not product.is_active:
            raise serializers.ValidationError(
                {"product": "The selected product is inactive."}
            )

        return attrs


class SalesOrderSerializer(serializers.ModelSerializer):
    lines = SalesOrderLineSerializer(many=True)

    class Meta:
        model = SalesOrder
        fields = [
            "id",
            "order_number",
            "customer",
            "order_date",
            "due_date",
            "status",
            "notes",
            "created_at",
            "updated_at",
            "lines",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError(
                "A sales order must contain at least one order line."
            )

        custom_skus = [
            line["custom_product"]["sku"]
            for line in value
            if line.get("custom_product")
        ]
        if len(custom_skus) != len(set(custom_skus)):
            raise serializers.ValidationError(
                "Custom product SKUs must be unique within the order."
            )

        return value

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop("lines")
        sales_order = SalesOrder.objects.create(**validated_data)

        for line_data in lines_data:
            custom_product_data = line_data.pop("custom_product", None)

            if custom_product_data:
                product = FinishedProduct.objects.create(
                    **custom_product_data,
                    product_type=FinishedProduct.ProductType.CUSTOM,
                    selling_price=line_data["unit_price"],
                )
                line_data["product"] = product

            SalesOrderLine.objects.create(
                sales_order=sales_order,
                **line_data,
            )

        return sales_order

    @transaction.atomic
    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()

            for line_data in lines_data:
                custom_product_data = line_data.pop("custom_product", None)

                if custom_product_data:
                    product = FinishedProduct.objects.create(
                        **custom_product_data,
                        product_type=FinishedProduct.ProductType.CUSTOM,
                        selling_price=line_data["unit_price"],
                    )
                    line_data["product"] = product

                SalesOrderLine.objects.create(
                    sales_order=instance,
                    **line_data,
                )

        return instance
