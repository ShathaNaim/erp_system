from production.models import FinishedProduct
from procurement.models import RawMaterial

from .models import StockLot, StockMovement, Warehouse


def get_finished_product_available_quantity(product):
    return StockLot.available_finished_quantity(product)


def get_finished_product_shortage(product, required_quantity):
    if product.product_type == FinishedProduct.ProductType.CUSTOM:
        return required_quantity

    return StockLot.finished_product_shortage(product, required_quantity)


def check_finished_product_availability(product, required_quantity):
    available_quantity = get_finished_product_available_quantity(product)
    shortage_quantity = get_finished_product_shortage(product, required_quantity)

    return {
        "product": product,
        "required_quantity": required_quantity,
        "available_quantity": available_quantity,
        "shortage_quantity": shortage_quantity,
        "route": "production" if shortage_quantity > 0 else "inventory",
    }


def check_sales_order_inventory(sales_order):
    return [
        {
            "sales_order_line": line,
            **check_sales_order_line_availability(line),
        }
        for line in sales_order.lines.select_related("product")
    ]


def check_sales_order_line_availability(line):
    available_quantity = get_finished_product_available_quantity(line.product)
    shortage_quantity = line.quantity - available_quantity

    if shortage_quantity < 0:
        shortage_quantity = 0

    return {
        "product": line.product,
        "required_quantity": line.quantity,
        "available_quantity": available_quantity,
        "shortage_quantity": shortage_quantity,
        "route": "production" if shortage_quantity > 0 else "inventory",
    }


def get_default_warehouse():
    warehouse, _ = Warehouse.objects.get_or_create(
        name="Main Warehouse",
        defaults={"location": "Default inventory warehouse"},
    )
    return warehouse


def receive_finished_product_from_production(
    production_order,
    quantity,
    warehouse=None,
):
    warehouse = warehouse or get_default_warehouse()
    stock_lot, _ = StockLot.objects.get_or_create(
        warehouse=warehouse,
        finished_product=production_order.product,
        raw_material=None,
        lot_number=production_order.order_number,
        defaults={"quantity_on_hand": 0},
    )
    stock_lot.quantity_on_hand += quantity
    stock_lot.save(update_fields=["quantity_on_hand", "updated_at"])

    StockMovement.objects.create(
        warehouse=warehouse,
        stock_lot=stock_lot,
        finished_product=production_order.product,
        movement_type=StockMovement.MovementType.PRODUCTION_OUTPUT,
        quantity=quantity,
        occurred_at=production_order.updated_at,
        reference=production_order.order_number,
        notes="Finished goods received from production.",
    )

    return stock_lot


def find_raw_material_by_name(raw_material_name):
    return RawMaterial.objects.filter(name__iexact=raw_material_name).first() or (
        RawMaterial.objects.filter(sku__iexact=raw_material_name).first()
    )


def consume_raw_material_for_production(production_order, raw_material_name, quantity):
    raw_material = find_raw_material_by_name(raw_material_name)

    if raw_material is None:
        raise ValueError("Raw material was not found in procurement.")

    remaining_quantity = quantity
    stock_lots = StockLot.objects.filter(
        raw_material=raw_material,
        quantity_on_hand__gt=0,
    ).order_by("created_at", "id")

    available_quantity = sum(lot.quantity_on_hand for lot in stock_lots)
    if available_quantity < quantity:
        raise ValueError("Not enough raw material quantity in inventory.")

    for stock_lot in stock_lots:
        if remaining_quantity <= 0:
            break

        consumed_quantity = min(stock_lot.quantity_on_hand, remaining_quantity)
        stock_lot.quantity_on_hand -= consumed_quantity
        stock_lot.save(update_fields=["quantity_on_hand", "updated_at"])

        StockMovement.objects.create(
            warehouse=stock_lot.warehouse,
            stock_lot=stock_lot,
            raw_material=raw_material,
            movement_type=StockMovement.MovementType.MATERIAL_CONSUMPTION,
            quantity=-consumed_quantity,
            occurred_at=production_order.updated_at,
            reference=production_order.order_number,
            notes=f"Consumed by production: {raw_material_name}.",
        )
        remaining_quantity -= consumed_quantity

    return raw_material


def ship_sales_order(sales_order):
    from django.utils import timezone

    from sales.models import SalesOrder

    lines = list(sales_order.lines.select_related("product"))
    availability_results = [check_sales_order_line_availability(line) for line in lines]
    shortages = [
        result
        for result in availability_results
        if result["shortage_quantity"] > 0
    ]

    if shortages:
        raise ValueError("Not enough finished product stock to ship this order.")

    occurred_at = timezone.now()

    for line in lines:
        remaining_quantity = line.quantity
        stock_lots = StockLot.objects.filter(
            finished_product=line.product,
            quantity_on_hand__gt=0,
        ).order_by("created_at", "id")

        for stock_lot in stock_lots:
            if remaining_quantity <= 0:
                break

            shipped_quantity = min(stock_lot.quantity_on_hand, remaining_quantity)
            stock_lot.quantity_on_hand -= shipped_quantity
            stock_lot.save(update_fields=["quantity_on_hand", "updated_at"])

            StockMovement.objects.create(
                warehouse=stock_lot.warehouse,
                stock_lot=stock_lot,
                finished_product=line.product,
                movement_type=StockMovement.MovementType.SHIPMENT,
                quantity=-shipped_quantity,
                occurred_at=occurred_at,
                reference=sales_order.order_number,
                notes=f"Shipped for sales order {sales_order.order_number}.",
            )
            remaining_quantity -= shipped_quantity

    sales_order.status = SalesOrder.Status.SHIPPED
    sales_order.save(update_fields=["status", "updated_at"])

    return sales_order
