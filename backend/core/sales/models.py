from django.db import models


class Customer(models.Model):
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


class SalesOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        CONFIRMED = "confirmed", "Confirmed"
        IN_PRODUCTION = "in_production", "In Production"
        READY = "ready", "Ready"
        SHIPPED = "shipped", "Shipped"
        CANCELLED = "cancelled", "Cancelled"

    order_number = models.CharField(max_length=100, unique=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="sales_orders",
    )
    order_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
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


class SalesOrderLine(models.Model):
    sales_order = models.ForeignKey(
        SalesOrder,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    product = models.ForeignKey(
        "production.FinishedProduct",
        on_delete=models.PROTECT,
        related_name="sales_order_lines",
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.sales_order.order_number} - {self.product.name}"
