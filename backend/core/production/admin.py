from django.contrib import admin

from .models import (
    BillOfMaterial,
    BillOfMaterialLine,
    FinishedProduct,
    Machine,
    MaterialConsumption,
    ProductionOrder,
    ProductionSchedule,
)


class BillOfMaterialLineInline(admin.TabularInline):
    model = BillOfMaterialLine
    extra = 1


@admin.register(BillOfMaterial)
class BillOfMaterialAdmin(admin.ModelAdmin):
    list_display = ("product", "version", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("product__sku", "product__name", "version")
    inlines = [BillOfMaterialLineInline]


admin.site.register(FinishedProduct)
admin.site.register(Machine)
admin.site.register(ProductionOrder)
admin.site.register(ProductionSchedule)
admin.site.register(MaterialConsumption)
