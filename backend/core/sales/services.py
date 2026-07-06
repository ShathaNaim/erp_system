from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from inventory.services import (
    get_finished_product_available_quantity,
    get_finished_product_shortage,
)
from production.models import FinishedProduct, ProductionOrder

from .models import SalesOrder


def get_available_finished_stock(product):
    return get_finished_product_available_quantity(product)


def get_required_production_quantity(line):
    if line.product.product_type == FinishedProduct.ProductType.CUSTOM:
        return line.quantity

    shortage = get_finished_product_shortage(line.product, line.quantity)

    if shortage <= 0:
        return Decimal("0")

    existing_production = line.production_orders.exclude(
        status=ProductionOrder.Status.CANCELLED
    ).aggregate(total=Sum("planned_quantity"))["total"] or Decimal("0")

    remaining_shortage = shortage - existing_production
    return max(remaining_shortage, Decimal("0"))


def get_sales_order_line_route(line):
    required_quantity = get_required_production_quantity(line)

    if required_quantity > 0:
        return "production"

    return "inventory"


def _build_production_order_number(sales_order, line):
    return f"PROD-{sales_order.order_number}-{line.id}"


@transaction.atomic
def confirm_and_route_sales_order(sales_order):
    production_was_created = False

    if sales_order.status == SalesOrder.Status.DRAFT:
        sales_order.status = SalesOrder.Status.CONFIRMED
        sales_order.save(update_fields=["status", "updated_at"])

    for line in sales_order.lines.select_related("product"):
        required_quantity = get_required_production_quantity(line)

        if required_quantity <= 0:
            continue

        ProductionOrder.objects.get_or_create(
            sales_order_line=line,
            order_number=_build_production_order_number(sales_order, line),
            defaults={
                "product": line.product,
                "planned_quantity": required_quantity,
                "due_date": sales_order.due_date,
                "notes": f"Created from sales order {sales_order.order_number}.",
            },
        )
        production_was_created = True

    sales_order.status = (
        SalesOrder.Status.IN_PRODUCTION
        if production_was_created
        else SalesOrder.Status.READY
    )
    sales_order.save(update_fields=["status", "updated_at"])

    return sales_order
