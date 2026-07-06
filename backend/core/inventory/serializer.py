from rest_framework import serializers

from production.models import FinishedProduct

from .services import get_finished_product_available_quantity


class FinishedProductStockSerializer(serializers.ModelSerializer):
    available_quantity = serializers.SerializerMethodField()

    class Meta:
        model = FinishedProduct
        fields = [
            "id",
            "sku",
            "name",
            "product_type",
            "unit",
            "available_quantity",
        ]

    def get_available_quantity(self, product):
        return get_finished_product_available_quantity(product)


class FinishedProductInventoryCheckRequestSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=FinishedProduct.objects.filter(is_active=True)
    )
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=0)


class FinishedProductInventoryCheckSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(source="product.id")
    sku = serializers.CharField(source="product.sku")
    product_name = serializers.CharField(source="product.name")
    product_type = serializers.CharField(source="product.product_type")
    required_quantity = serializers.DecimalField(max_digits=12, decimal_places=3)
    available_quantity = serializers.DecimalField(max_digits=12, decimal_places=3)
    shortage_quantity = serializers.DecimalField(max_digits=12, decimal_places=3)
    route = serializers.CharField()


class SalesOrderInventoryLineCheckSerializer(FinishedProductInventoryCheckSerializer):
    sales_order_line_id = serializers.IntegerField(source="sales_order_line.id")
