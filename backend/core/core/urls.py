
from django.contrib import admin
from django.urls import path,include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/production/', include('production.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/procurement/', include('procurement.urls')),
    
]
