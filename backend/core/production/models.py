from django.db import models


class FinishedProduct(models.Model):
    sku = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    unit = models.CharField(max_length=30, default="piece")
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.sku} - {self.name}"


class BillOfMaterial(models.Model):
    product = models.ForeignKey(
        FinishedProduct,
        on_delete=models.CASCADE,
        related_name="bills_of_material",
    )
    version = models.CharField(max_length=50, default="1")
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("product", "version")

    def __str__(self):
        return f"{self.product.name} BOM v{self.version}"


class BillOfMaterialLine(models.Model):
    bill_of_material = models.ForeignKey(
        BillOfMaterial,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    raw_material = models.ForeignKey(
        "procurement.RawMaterial",
        on_delete=models.PROTECT,
        related_name="bom_lines",
    )
    quantity_per_unit = models.DecimalField(max_digits=12, decimal_places=3)
    scrap_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        unique_together = ("bill_of_material", "raw_material")

    def __str__(self):
        return f"{self.bill_of_material} - {self.raw_material.name}"


class Machine(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        RUNNING = "running", "Running"
        MAINTENANCE = "maintenance", "Maintenance"
        INACTIVE = "inactive", "Inactive"

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.AVAILABLE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ProductionOrder(models.Model):
    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        RELEASED = "released", "Released"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    order_number = models.CharField(max_length=100, unique=True)
    sales_order_line = models.ForeignKey(
        "sales.SalesOrderLine",
        on_delete=models.SET_NULL,
        related_name="production_orders",
        null=True,
        blank=True,
    )
    product = models.ForeignKey(
        FinishedProduct,
        on_delete=models.PROTECT,
        related_name="production_orders",
    )
    bill_of_material = models.ForeignKey(
        BillOfMaterial,
        on_delete=models.PROTECT,
        related_name="production_orders",
        null=True,
        blank=True,
    )
    planned_quantity = models.DecimalField(max_digits=12, decimal_places=3)
    produced_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PLANNED,
    )
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.order_number


class ProductionSchedule(models.Model):
    machine = models.ForeignKey(
        Machine,
        on_delete=models.PROTECT,
        related_name="production_schedules",
    )
    production_order = models.ForeignKey(
        ProductionOrder,
        on_delete=models.CASCADE,
        related_name="schedules",
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    class Meta:
        ordering = ("start_time",)

    def __str__(self):
        return f"{self.machine.name} - {self.production_order.order_number}"


class MaterialConsumption(models.Model):
    production_order = models.ForeignKey(
        ProductionOrder,
        on_delete=models.CASCADE,
        related_name="material_consumptions",
    )
    raw_material = models.ForeignKey(
        "procurement.RawMaterial",
        on_delete=models.PROTECT,
        related_name="production_consumptions",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    consumed_at = models.DateTimeField()

    def __str__(self):
        return f"{self.production_order.order_number} - {self.raw_material.name}"
