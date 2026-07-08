from rest_framework.permissions import BasePermission

from .models import EmployeeProfile


class EmployeePermission(BasePermission):
    allowed_roles = []
    allowed_departments = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_staff or request.user.is_superuser:
            return True

        profile = getattr(request.user, "employee_profile", None)
        if not profile or not profile.is_active:
            return False

        if profile.role == EmployeeProfile.Role.ADMIN:
            return True

        return (
            profile.role in self.allowed_roles
            or profile.department in self.allowed_departments
        )

class IsAdminOrManager(BasePermission):
    def has_permission(self, request, view):
        profile = getattr(request.user, "employee_profile", None)
        return bool(
            request.user.is_staff
            or profile
            and profile.role in [
                "admin",
                "sales_manager",
                "inventory_manager",
                "production_manager",
                "procurement_manager",
            ]
        )

class IsProcurementManager(EmployeePermission):
    allowed_roles = [EmployeeProfile.Role.PROCUREMENT_MANAGER]


class IsProcurementEmployee(EmployeePermission):
    allowed_departments = [EmployeeProfile.Department.PROCUREMENT]


class IsSalesManager(EmployeePermission):
    allowed_roles = [EmployeeProfile.Role.SALES_MANAGER]


class IsSalesEmployee(EmployeePermission):
    allowed_departments = [EmployeeProfile.Department.SALES]


class IsProductionManager(EmployeePermission):
    allowed_roles = [EmployeeProfile.Role.PRODUCTION_MANAGER]


class IsProductionEmployee(EmployeePermission):
    allowed_departments = [EmployeeProfile.Department.PRODUCTION]


