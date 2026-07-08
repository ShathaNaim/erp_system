from django.contrib import admin
from .models import Supplier,RawMaterial,PurchaseOrder,PurchaseOrderLine,MaterialReceipt,MaterialReceiptLine
# Register your models here.
admin.site.register(Supplier)
admin.site.register(RawMaterial)
admin.site.register(PurchaseOrder)
admin.site.register(PurchaseOrderLine)
admin.site.register(MaterialReceipt)
admin.site.register(MaterialReceiptLine)