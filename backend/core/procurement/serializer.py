from .models import RawMaterial, Supplier, PurchaseOrder, PurchaseOrderLine
from rest_framework import serializers

class RawMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawMaterial
        fields = "__all__"

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"

class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderLine
        fields = ["id", "raw_material", "quantity", "unit_price"]

class PurchaseOrderSerializer(serializers.ModelSerializer):
    lines = PurchaseOrderLineSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "order_number",
            "supplier",
            "order_date",
            "expected_date",
            "status",
            "notes",
            "created_at",
            "updated_at",
            "lines",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        purchase_order = PurchaseOrder.objects.create(**validated_data)

        for line_data in lines_data:
            PurchaseOrderLine.objects.create(
                purchase_order=purchase_order,
                **line_data,
            )

        return purchase_order

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if lines_data is not None:
            instance.lines.all().delete()
            for line_data in lines_data:
                PurchaseOrderLine.objects.create(
                    purchase_order=instance,
                    **line_data,
                )

        return instance
