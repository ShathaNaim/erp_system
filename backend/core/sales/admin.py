from django.contrib import admin
from .models import SalesOrder,Customer,SalesOrderLine
# Register your models here.
admin.site.register(SalesOrder)
admin.site.register(Customer)
admin.site.register(SalesOrderLine)