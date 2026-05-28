from django.conf import settings
from django.db import models


class EmployeeProfile(models.Model):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        PRODUCTION_MANAGER = "production_manager", "Production Manager"
        INVENTORY_MANAGER = "inventory_manager", "Inventory Manager"
        SALES_MANAGER = "sales_manager", "Sales Manager"
        PROCUREMENT_MANAGER = "procurement_manager", "Procurement Manager"
        OPERATOR = "operator", "Operator"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employee_profile",
    )
    role = models.CharField(max_length=32, choices=Role.choices)
    phone = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_username()} - {self.get_role_display()}"
