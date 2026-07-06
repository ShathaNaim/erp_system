from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q, Sum


class Warehouse(models.Model):
    name = models.CharField(max_length=255, unique=True)
    location = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class StockLot(models.Model):
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="stock_lots",
    )
    raw_material = models.ForeignKey(
        "procurement.RawMaterial",
        on_delete=models.PROTECT,
        related_name="stock_lots",
        null=True,
        blank=True,
    )
    finished_product = models.ForeignKey(
        "production.FinishedProduct",
        on_delete=models.PROTECT,
        related_name="stock_lots",
        null=True,
        blank=True,
    )
    lot_number = models.CharField(max_length=100, blank=True)
    quantity_on_hand = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(raw_material__isnull=False, finished_product__isnull=True)
                    | Q(raw_material__isnull=True, finished_product__isnull=False)
                ),
                name="stocklot_exactly_one_item_type",
            )
        ]

    def clean(self):
        if bool(self.raw_material) == bool(self.finished_product):
            raise ValidationError(
                "A stock lot must reference either a raw material or a finished product."
            )

    @classmethod
    def available_finished_quantity(cls, product):
        total = cls.objects.filter(finished_product=product).aggregate(
            total=Sum("quantity_on_hand")
        )["total"]
        return total or 0

    @classmethod
    def finished_product_shortage(cls, product, required_quantity):
        available_quantity = cls.available_finished_quantity(product)
        shortage = required_quantity - available_quantity

        if shortage <= 0:
            return 0

        return shortage

    def __str__(self):
        item = self.raw_material or self.finished_product
        return f"{item} @ {self.warehouse.name}"


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        MATERIAL_RECEIPT = "material_receipt", "Material Receipt"
        MATERIAL_CONSUMPTION = "material_consumption", "Material Consumption"
        PRODUCTION_OUTPUT = "production_output", "Production Output"
        SHIPMENT = "shipment", "Shipment"
        ADJUSTMENT = "adjustment", "Adjustment"

    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )
    stock_lot = models.ForeignKey(
        StockLot,
        on_delete=models.PROTECT,
        related_name="movements",
        null=True,
        blank=True,
    )
    raw_material = models.ForeignKey(
        "procurement.RawMaterial",
        on_delete=models.PROTECT,
        related_name="stock_movements",
        null=True,
        blank=True,
    )
    finished_product = models.ForeignKey(
        "production.FinishedProduct",
        on_delete=models.PROTECT,
        related_name="stock_movements",
        null=True,
        blank=True,
    )
    movement_type = models.CharField(max_length=32, choices=MovementType.choices)
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        help_text="Positive quantities add stock. Negative quantities remove stock.",
    )
    occurred_at = models.DateTimeField()
    reference = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-occurred_at", "-id")
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(raw_material__isnull=False, finished_product__isnull=True)
                    | Q(raw_material__isnull=True, finished_product__isnull=False)
                ),
                name="stockmovement_exactly_one_item_type",
            )
        ]

    def clean(self):
        if bool(self.raw_material) == bool(self.finished_product):
            raise ValidationError(
                "A stock movement must reference either a raw material or a finished product."
            )

    def __str__(self):
        item = self.raw_material or self.finished_product
        return f"{self.get_movement_type_display()} - {item} - {self.quantity}"
