from django.urls import path

from .views import (
    FinishedProductInventoryCheckView,
    FinishedProductStockListView,
    SalesOrderInventoryCheckView,
    SalesOrderShipmentView,
)

urlpatterns = [
    path(
        "finished-products/",
        FinishedProductStockListView.as_view(),
        name="finished-product-stock-list",
    ),
    path(
        "finished-products/check/",
        FinishedProductInventoryCheckView.as_view(),
        name="finished-product-inventory-check",
    ),
    path(
        "sales-orders/<int:sales_order_id>/check/",
        SalesOrderInventoryCheckView.as_view(),
        name="sales-order-inventory-check",
    ),
    path(
        "sales-orders/<int:sales_order_id>/ship/",
        SalesOrderShipmentView.as_view(),
        name="sales-order-shipment",
    ),
]
