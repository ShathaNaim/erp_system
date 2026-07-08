from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from inventory.models import StockLot, StockMovement, Warehouse
from procurement.models import RawMaterial, Supplier, PurchaseOrder, PurchaseOrderLine
from production.models import (
    BillOfMaterial,
    BillOfMaterialLine,
    FinishedProduct,
    MaterialConsumption,
    ProductionOrder,
)
from sales.models import Customer, SalesOrder, SalesOrderLine


class Command(BaseCommand):
    help = "Seed realistic demo data for ERP dashboard, sales, inventory, production, and procurement."

    def handle(self, *args, **options):
        with transaction.atomic():
            warehouse = self.create_warehouse()
            raw_materials = self.create_raw_materials()
            products = self.create_finished_products()
            self.create_stock(warehouse, raw_materials, products)
            boms = self.create_boms(raw_materials, products)
            customers = self.create_customers()
            suppliers = self.create_suppliers()
            self.create_sales_orders(customers, products)
            self.create_production_orders(products, boms, raw_materials)
            self.create_purchase_orders(suppliers, raw_materials)

        self.stdout.write(self.style.SUCCESS("Demo ERP data seeded successfully."))

    def create_warehouse(self):
        warehouse, _ = Warehouse.objects.update_or_create(
            name="Main Warehouse",
            defaults={
                "location": "Amman operations warehouse",
                "is_active": True,
            },
        )
        return warehouse

    def create_raw_materials(self):
        materials = [
            ("RM-KRAFT-ROLL", "Kraft Paper Roll", "kg", "1.20", "120.000"),
            ("RM-CORR-SHEET", "Corrugated Cardboard Sheet", "sheet", "0.35", "300.000"),
            ("RM-CUP-BLANK", "Paper Cup Blank Roll", "kg", "1.60", "100.000"),
            ("RM-PE-ROLL", "PE Plastic Roll", "kg", "2.10", "80.000"),
            ("RM-GLUE", "Food Grade Glue", "kg", "3.40", "40.000"),
            ("RM-INK-BLK", "Printing Ink - Black", "L", "9.50", "15.000"),
            ("RM-INK-GRN", "Printing Ink - Green", "L", "10.25", "15.000"),
            ("RM-HANDLE", "Paper Bag Handle", "piece", "0.03", "1000.000"),
            ("RM-CUP-LID", "Cup Lid", "piece", "0.04", "1500.000"),
        ]

        result = {}
        for sku, name, unit, cost, reorder_level in materials:
            material, _ = RawMaterial.objects.update_or_create(
                sku=sku,
                defaults={
                    "name": name,
                    "description": f"Demo raw material: {name}.",
                    "unit": unit,
                    "standard_cost": Decimal(cost),
                    "reorder_level": Decimal(reorder_level),
                    "is_active": True,
                },
            )
            result[name] = material
        return result

    def create_finished_products(self):
        products = [
            ("FP-BAG-KRAFT-M", "Kraft Paper Bag - Medium", "piece", "0.28"),
            ("FP-BAG-PRINTED", "Printed Shopping Bag", "piece", "0.45"),
            ("FP-CUP-8", "Paper Cup 8 oz", "piece", "0.12"),
            ("FP-CUP-12", "Paper Cup 12 oz", "piece", "0.15"),
            ("FP-BOX-CORR-M", "Medium Corrugated Box", "piece", "0.55"),
            ("FP-PIZZA-M", "Pizza Box Medium", "piece", "0.38"),
            ("FP-FOOD-TAKE", "Takeaway Food Container", "piece", "0.32"),
        ]

        result = {}
        for sku, name, unit, price in products:
            product, _ = FinishedProduct.objects.update_or_create(
                sku=sku,
                defaults={
                    "name": name,
                    "description": f"Demo finished product: {name}.",
                    "product_type": FinishedProduct.ProductType.STANDARD,
                    "unit": unit,
                    "selling_price": Decimal(price),
                    "is_active": True,
                },
            )
            result[name] = product
        return result

    def create_stock(self, warehouse, raw_materials, products):
        raw_stock = {
            "Kraft Paper Roll": Decimal("420.000"),
            "Corrugated Cardboard Sheet": Decimal("950.000"),
            "Paper Cup Blank Roll": Decimal("180.000"),
            "PE Plastic Roll": Decimal("110.000"),
            "Food Grade Glue": Decimal("52.000"),
            "Printing Ink - Black": Decimal("18.000"),
            "Printing Ink - Green": Decimal("6.000"),
            "Paper Bag Handle": Decimal("1800.000"),
            "Cup Lid": Decimal("2600.000"),
        }
        product_stock = {
            "Kraft Paper Bag - Medium": Decimal("750.000"),
            "Printed Shopping Bag": Decimal("180.000"),
            "Paper Cup 8 oz": Decimal("2200.000"),
            "Paper Cup 12 oz": Decimal("900.000"),
            "Medium Corrugated Box": Decimal("320.000"),
            "Pizza Box Medium": Decimal("460.000"),
            "Takeaway Food Container": Decimal("240.000"),
        }

        for name, quantity in raw_stock.items():
            lot, _ = StockLot.objects.update_or_create(
                warehouse=warehouse,
                raw_material=raw_materials[name],
                finished_product=None,
                lot_number=f"DEMO-{raw_materials[name].sku}",
                defaults={"quantity_on_hand": quantity},
            )
            self.ensure_stock_movement(
                warehouse=warehouse,
                stock_lot=lot,
                raw_material=raw_materials[name],
                movement_type=StockMovement.MovementType.ADJUSTMENT,
                quantity=quantity,
                reference=f"DEMO-SEED-{raw_materials[name].sku}",
                notes="Initial demo raw material stock.",
            )

        for name, quantity in product_stock.items():
            lot, _ = StockLot.objects.update_or_create(
                warehouse=warehouse,
                raw_material=None,
                finished_product=products[name],
                lot_number=f"DEMO-{products[name].sku}",
                defaults={"quantity_on_hand": quantity},
            )
            self.ensure_stock_movement(
                warehouse=warehouse,
                stock_lot=lot,
                finished_product=products[name],
                movement_type=StockMovement.MovementType.ADJUSTMENT,
                quantity=quantity,
                reference=f"DEMO-SEED-{products[name].sku}",
                notes="Initial demo finished goods stock.",
            )

    def ensure_stock_movement(self, **kwargs):
        StockMovement.objects.update_or_create(
            reference=kwargs["reference"],
            movement_type=kwargs["movement_type"],
            defaults={
                "warehouse": kwargs["warehouse"],
                "stock_lot": kwargs["stock_lot"],
                "raw_material": kwargs.get("raw_material"),
                "finished_product": kwargs.get("finished_product"),
                "quantity": kwargs["quantity"],
                "occurred_at": timezone.now(),
                "notes": kwargs["notes"],
            },
        )

    def create_boms(self, raw_materials, products):
        bom_specs = {
            "Kraft Paper Bag - Medium": [
                ("Kraft Paper Roll", "0.080", "3.00"),
                ("Food Grade Glue", "0.010", "0.00"),
                ("Paper Bag Handle", "2.000", "0.00"),
                ("Printing Ink - Black", "0.002", "0.00"),
            ],
            "Printed Shopping Bag": [
                ("Kraft Paper Roll", "0.100", "4.00"),
                ("Food Grade Glue", "0.012", "0.00"),
                ("Paper Bag Handle", "2.000", "0.00"),
                ("Printing Ink - Green", "0.003", "0.00"),
            ],
            "Paper Cup 8 oz": [
                ("Paper Cup Blank Roll", "0.018", "2.00"),
                ("PE Plastic Roll", "0.004", "0.00"),
                ("Printing Ink - Green", "0.001", "0.00"),
            ],
            "Paper Cup 12 oz": [
                ("Paper Cup Blank Roll", "0.024", "2.00"),
                ("PE Plastic Roll", "0.005", "0.00"),
                ("Printing Ink - Black", "0.001", "0.00"),
            ],
            "Medium Corrugated Box": [
                ("Corrugated Cardboard Sheet", "1.000", "3.00"),
                ("Food Grade Glue", "0.015", "0.00"),
            ],
            "Pizza Box Medium": [
                ("Corrugated Cardboard Sheet", "0.750", "3.00"),
                ("Printing Ink - Green", "0.002", "0.00"),
            ],
            "Takeaway Food Container": [
                ("Kraft Paper Roll", "0.060", "3.00"),
                ("PE Plastic Roll", "0.008", "0.00"),
            ],
        }

        result = {}
        for product_name, lines in bom_specs.items():
            bom, _ = BillOfMaterial.objects.update_or_create(
                product=products[product_name],
                version="1",
                defaults={
                    "is_active": True,
                    "notes": "Demo BOM generated by seed_demo_data.",
                },
            )
            result[product_name] = bom
            for material_name, quantity, scrap in lines:
                BillOfMaterialLine.objects.update_or_create(
                    bill_of_material=bom,
                    raw_material=raw_materials[material_name],
                    defaults={
                        "quantity_per_unit": Decimal(quantity),
                        "scrap_percent": Decimal(scrap),
                    },
                )
        return result

    def create_customers(self):
        customers = [
            ("City Cafe", "Lina Haddad", "orders@citycafe.example", "+962-6-555-0101"),
            ("Green Market", "Omar Saleh", "supply@greenmarket.example", "+962-6-555-0102"),
            ("Amman Bakery", "Maya Nasser", "orders@ammanbakery.example", "+962-6-555-0103"),
        ]

        result = {}
        for name, contact, email, phone in customers:
            customer, _ = Customer.objects.update_or_create(
                name=name,
                defaults={
                    "contact_name": contact,
                    "email": email,
                    "phone": phone,
                    "address": "Amman, Jordan",
                    "is_active": True,
                },
            )
            result[name] = customer
        return result

    def create_suppliers(self):
        suppliers = [
            ("Amman Paper Supplies", "Rami Khalil", "sales@ammanpaper.example"),
            ("Jordan Packaging Materials", "Nour Qasem", "orders@jpm.example"),
            ("Levant Inks Co.", "Tareq Mansour", "supply@levantinks.example"),
        ]

        result = {}
        for name, contact, email in suppliers:
            supplier, _ = Supplier.objects.update_or_create(
                name=name,
                defaults={
                    "contact_name": contact,
                    "email": email,
                    "phone": "+962-6-555-0200",
                    "address": "Amman industrial area",
                    "is_active": True,
                },
            )
            result[name] = supplier
        return result

    def create_sales_orders(self, customers, products):
        today = timezone.localdate()
        orders = [
            (
                "SO-DEMO-1001",
                "City Cafe",
                SalesOrder.Status.READY,
                today,
                [(products["Paper Cup 8 oz"], "2000.000", "0.120", "Cafe branded cups.")],
            ),
            (
                "SO-DEMO-1002",
                "Green Market",
                SalesOrder.Status.IN_PRODUCTION,
                today - timedelta(days=1),
                [(products["Printed Shopping Bag"], "1000.000", "0.450", "Green ink shopping bags.")],
            ),
            (
                "SO-DEMO-1003",
                "Amman Bakery",
                SalesOrder.Status.CONFIRMED,
                today - timedelta(days=2),
                [(products["Pizza Box Medium"], "650.000", "0.380", "Bakery delivery packaging.")],
            ),
            (
                "SO-DEMO-1004",
                "City Cafe",
                SalesOrder.Status.SHIPPED,
                today - timedelta(days=4),
                [(products["Takeaway Food Container"], "300.000", "0.320", "Weekly takeaway packaging.")],
            ),
        ]

        for order_number, customer_name, status, order_date, lines in orders:
            order, _ = SalesOrder.objects.update_or_create(
                order_number=order_number,
                defaults={
                    "customer": customers[customer_name],
                    "order_date": order_date,
                    "due_date": order_date + timedelta(days=7),
                    "status": status,
                    "notes": "Demo sales order.",
                },
            )
            for product, quantity, unit_price, notes in lines:
                SalesOrderLine.objects.update_or_create(
                    sales_order=order,
                    product=product,
                    defaults={
                        "quantity": Decimal(quantity),
                        "unit_price": Decimal(unit_price),
                        "notes": notes,
                    },
                )

    def create_production_orders(self, products, boms, raw_materials):
        today = timezone.localdate()
        orders = [
            (
                "PROD-DEMO-2001",
                "Printed Shopping Bag",
                ProductionOrder.Status.IN_PROGRESS,
                "1000.000",
                "420.000",
                today + timedelta(days=3),
            ),
            (
                "PROD-DEMO-2002",
                "Paper Cup 8 oz",
                ProductionOrder.Status.RELEASED,
                "2000.000",
                "0.000",
                today + timedelta(days=5),
            ),
            (
                "PROD-DEMO-2003",
                "Kraft Paper Bag - Medium",
                ProductionOrder.Status.COMPLETED,
                "750.000",
                "750.000",
                today - timedelta(days=1),
            ),
            (
                "PROD-DEMO-2004",
                "Paper Cup 12 oz",
                ProductionOrder.Status.PLANNED,
                "1500.000",
                "0.000",
                today + timedelta(days=8),
            ),
            (
                "PROD-DEMO-2005",
                "Medium Corrugated Box",
                ProductionOrder.Status.IN_PROGRESS,
                "500.000",
                "180.000",
                today + timedelta(days=2),
            ),
            (
                "PROD-DEMO-2006",
                "Pizza Box Medium",
                ProductionOrder.Status.COMPLETED,
                "900.000",
                "900.000",
                today - timedelta(days=3),
            ),
            (
                "PROD-DEMO-2007",
                "Takeaway Food Container",
                ProductionOrder.Status.CANCELLED,
                "350.000",
                "0.000",
                today + timedelta(days=4),
            ),
        ]
        consumption_by_order = {
            "PROD-DEMO-2001": [
                ("Kraft Paper Roll", "45.000"),
                ("Food Grade Glue", "5.000"),
                ("Paper Bag Handle", "850.000"),
                ("Printing Ink - Green", "1.250"),
            ],
            "PROD-DEMO-2003": [
                ("Kraft Paper Roll", "61.800"),
                ("Food Grade Glue", "7.500"),
                ("Paper Bag Handle", "1500.000"),
                ("Printing Ink - Black", "1.500"),
            ],
            "PROD-DEMO-2005": [
                ("Corrugated Cardboard Sheet", "185.400"),
                ("Food Grade Glue", "2.800"),
            ],
            "PROD-DEMO-2006": [
                ("Corrugated Cardboard Sheet", "695.300"),
                ("Printing Ink - Green", "1.800"),
            ],
        }

        for order_number, product_name, status, planned, produced, due_date in orders:
            order, _ = ProductionOrder.objects.update_or_create(
                order_number=order_number,
                defaults={
                    "product": products[product_name],
                    "bill_of_material": boms[product_name],
                    "planned_quantity": Decimal(planned),
                    "produced_quantity": Decimal(produced),
                    "status": status,
                    "due_date": due_date,
                    "notes": "Demo production order.",
                },
            )

            for material_name, quantity in consumption_by_order.get(order_number, []):
                MaterialConsumption.objects.update_or_create(
                    production_order=order,
                    raw_material_name=raw_materials[material_name].name,
                    defaults={
                        "quantity": Decimal(quantity),
                        "consumed_at": timezone.now(),
                    },
                )

    def create_purchase_orders(self, suppliers, raw_materials):
        today = timezone.localdate()
        orders = [
            (
                "PO-DEMO-3001",
                "Amman Paper Supplies",
                PurchaseOrder.Status.ORDERED,
                today,
                [
                    ("Printing Ink - Green", "30.000", "10.250"),
                    ("Kraft Paper Roll", "250.000", "1.200"),
                ],
            ),
            (
                "PO-DEMO-3002",
                "Jordan Packaging Materials",
                PurchaseOrder.Status.DRAFT,
                today - timedelta(days=1),
                [("Paper Bag Handle", "2500.000", "0.030")],
            ),
            (
                "PO-DEMO-3003",
                "Levant Inks Co.",
                PurchaseOrder.Status.RECEIVED,
                today - timedelta(days=5),
                [("Printing Ink - Black", "25.000", "9.500")],
            ),
            (
                "PO-DEMO-3004",
                "Amman Paper Supplies",
                PurchaseOrder.Status.PARTIALLY_RECEIVED,
                today - timedelta(days=3),
                [
                    ("Paper Cup Blank Roll", "140.000", "1.600"),
                    ("PE Plastic Roll", "70.000", "2.100"),
                ],
            ),
            (
                "PO-DEMO-3005",
                "Jordan Packaging Materials",
                PurchaseOrder.Status.ORDERED,
                today + timedelta(days=1),
                [
                    ("Corrugated Cardboard Sheet", "600.000", "0.350"),
                    ("Food Grade Glue", "45.000", "3.400"),
                ],
            ),
            (
                "PO-DEMO-3006",
                "Levant Inks Co.",
                PurchaseOrder.Status.CANCELLED,
                today - timedelta(days=7),
                [("Printing Ink - Green", "12.000", "10.250")],
            ),
        ]

        for order_number, supplier_name, status, order_date, lines in orders:
            order, _ = PurchaseOrder.objects.update_or_create(
                order_number=order_number,
                defaults={
                    "supplier": suppliers[supplier_name],
                    "order_date": order_date,
                    "expected_date": order_date + timedelta(days=10),
                    "status": status,
                    "notes": "Demo purchase order.",
                },
            )
            for material_name, quantity, unit_price in lines:
                PurchaseOrderLine.objects.update_or_create(
                    purchase_order=order,
                    raw_material=raw_materials[material_name],
                    defaults={
                        "quantity": Decimal(quantity),
                        "unit_price": Decimal(unit_price),
                    },
                )
