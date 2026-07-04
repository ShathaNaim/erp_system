from rest_framework.permissions import BasePermission


class IsProcurementManager(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "employee_profile")
            and request.user.employee_profile.role == "procurement_manager"
        )
    
class IsProcurementEmployee(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "employee_profile")
            and request.user.employee_profile.department == "procurement"
        )


class IsSalesEmployee(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "employee_profile")
            and request.user.employee_profile.department == "sales"
        )
    
class IsSalesManager(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "employee_profile")
            and request.user.employee_profile.role == "sales_manager"
        )

class IsProductionEmployee(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "employee_profile")
            and request.user.employee_profile.department == "production"
        )
    
class IsProductionManager(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "employee_profile")
            and request.user.employee_profile.role == "production_manager"
        )