from django.urls import path

from .views import (
    FinishedProductInventoryCheckView,
    FinishedProductStockListView,
    RawMaterialStockListView,
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
        "raw-materials/",
        RawMaterialStockListView.as_view(),
        name="raw-material-stock-list",
    ),
    path(
        "finished-products/check/",
        FinishedProductInventoryCheckView.as_view(),
        name="finished-product-inventory-check",
    ),
    path(
        "sales-orders/<str:sales_order_ref>/check/",
        SalesOrderInventoryCheckView.as_view(),
        name="sales-order-inventory-check",
    ),
    path(
        "sales-orders/<str:sales_order_ref>/ship/",
        SalesOrderShipmentView.as_view(),
        name="sales-order-shipment",
    ),
]
