from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from inventory.models import StockLot
from inventory.services import get_default_warehouse
from procurement.models import RawMaterial

from .models import (
    BillOfMaterial,
    BillOfMaterialLine,
    FinishedProduct,
    MaterialConsumption,
    ProductionOrder,
)


class ProductionOrderMaterialValidationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="production-user",
            password="password",
        )
        self.client.force_authenticate(self.user)
        self.product = FinishedProduct.objects.create(
            sku="FP-001",
            name="Finished Product",
        )
        self.raw_material = RawMaterial.objects.create(
            sku="RM-001",
            name="Raw Material",
        )
        self.production_order = ProductionOrder.objects.create(
            order_number="PROD-001",
            product=self.product,
            planned_quantity=Decimal("5.000"),
        )

    def production_order_url(self, action):
        return f"/api/production/production-orders/{self.production_order.id}/{action}/"

    def create_bom(self, quantity_per_unit=Decimal("2.000")):
        bom = BillOfMaterial.objects.create(
            product=self.product,
            version="1",
        )
        BillOfMaterialLine.objects.create(
            bill_of_material=bom,
            raw_material=self.raw_material,
            quantity_per_unit=quantity_per_unit,
        )
        self.production_order.bill_of_material = bom
        self.production_order.save(update_fields=["bill_of_material", "updated_at"])
        return bom

    def add_raw_material_stock(self, quantity):
        return StockLot.objects.create(
            warehouse=get_default_warehouse(),
            raw_material=self.raw_material,
            lot_number="RM-LOT-001",
            quantity_on_hand=quantity,
        )

    def test_start_requires_bom_or_consumed_material(self):
        response = self.client.post(self.production_order_url("start"))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Attach a bill of material", response.data["detail"])

    def test_start_allows_existing_manual_material_consumption(self):
        MaterialConsumption.objects.create(
            production_order=self.production_order,
            raw_material_name=self.raw_material.sku,
            quantity=Decimal("1.000"),
            consumed_at=timezone.now(),
        )

        response = self.client.post(self.production_order_url("start"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.production_order.refresh_from_db()
        self.assertEqual(
            self.production_order.status,
            ProductionOrder.Status.IN_PROGRESS,
        )

    def test_receive_output_requires_bom_or_consumed_material(self):
        response = self.client.post(
            self.production_order_url("complete"),
            {"produced_quantity": "1.000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Attach a bill of material", response.data["detail"])

    def test_receive_output_rejects_when_bom_material_stock_is_short(self):
        self.create_bom()
        self.add_raw_material_stock(Decimal("1.000"))

        response = self.client.post(
            self.production_order_url("complete"),
            {"produced_quantity": "1.000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Not enough Raw Material", response.data["detail"])
        self.production_order.refresh_from_db()
        self.assertEqual(self.production_order.produced_quantity, Decimal("0.000"))

    def test_receive_output_consumes_missing_bom_material_and_adds_output(self):
        self.create_bom()
        raw_stock = self.add_raw_material_stock(Decimal("10.000"))

        response = self.client.post(
            self.production_order_url("complete"),
            {"produced_quantity": "2.000"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.production_order.refresh_from_db()
        raw_stock.refresh_from_db()

        self.assertEqual(self.production_order.produced_quantity, Decimal("2.000"))
        self.assertEqual(raw_stock.quantity_on_hand, Decimal("6.000"))
        self.assertEqual(
            MaterialConsumption.objects.filter(
                production_order=self.production_order,
                raw_material_name=self.raw_material.name,
            ).count(),
            1,
        )
