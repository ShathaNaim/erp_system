from django.db import models


class Supplier(models.Model):
    name = models.CharField(max_length=255, unique=True)
    contact_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class RawMaterial(models.Model):
    sku = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    unit = models.CharField(max_length=30, default="kg")
    standard_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.sku} - {self.name}"


class PurchaseOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ORDERED = "ordered", "Ordered"
        PARTIALLY_RECEIVED = "partially_received", "Partially Received"
        RECEIVED = "received", "Received"
        CANCELLED = "cancelled", "Cancelled"

    order_number = models.CharField(max_length=100, unique=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    order_date = models.DateField()
    expected_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.order_number


class PurchaseOrderLine(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    raw_material = models.ForeignKey(
        RawMaterial,
        on_delete=models.PROTECT,
        related_name="purchase_order_lines",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = ("purchase_order", "raw_material")

    def __str__(self):
        return f"{self.purchase_order.order_number} - {self.raw_material.name}"


class MaterialReceipt(models.Model):
    receipt_number = models.CharField(max_length=100, unique=True)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.PROTECT,
        related_name="receipts",
        null=True,
        blank=True,
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="material_receipts",
    )
    received_at = models.DateTimeField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.receipt_number


class MaterialReceiptLine(models.Model):
    receipt = models.ForeignKey(
        MaterialReceipt,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    purchase_order_line = models.ForeignKey(
        PurchaseOrderLine,
        on_delete=models.PROTECT,
        related_name="receipt_lines",
        null=True,
        blank=True,
    )
    raw_material = models.ForeignKey(
        RawMaterial,
        on_delete=models.PROTECT,
        related_name="receipt_lines",
    )
    quantity_received = models.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    lot_number = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.receipt.receipt_number} - {self.raw_material.name}"
