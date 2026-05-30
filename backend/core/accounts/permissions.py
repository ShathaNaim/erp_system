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

