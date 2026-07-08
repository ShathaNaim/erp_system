from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from production.models import FinishedProduct
from sales.models import Customer, SalesOrder, SalesOrderLine

from .models import StockLot
from .services import get_default_warehouse


class SalesOrderInventoryLookupTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="inventory-user",
            password="password",
        )
        self.client.force_authenticate(self.user)
        self.customer = Customer.objects.create(name="Customer")
        self.product = FinishedProduct.objects.create(
            sku="CUSTOM-001",
            name="Custom Product",
            product_type=FinishedProduct.ProductType.CUSTOM,
        )
        self.sales_order = SalesOrder.objects.create(
            order_number="667",
            customer=self.customer,
            order_date="2026-07-08",
        )
        SalesOrderLine.objects.create(
            sales_order=self.sales_order,
            product=self.product,
            quantity=Decimal("10.000"),
            unit_price=Decimal("5.00"),
        )
        StockLot.objects.create(
            warehouse=get_default_warehouse(),
            finished_product=self.product,
            lot_number="PROD-667",
            quantity_on_hand=Decimal("10.000"),
        )

    def test_sales_order_inventory_check_accepts_order_number(self):
        response = self.client.get("/api/inventory/sales-orders/667/check/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["sku"], "CUSTOM-001")
        self.assertEqual(response.data[0]["available_quantity"], "10.000")
        self.assertEqual(response.data[0]["shortage_quantity"], "0.000")
