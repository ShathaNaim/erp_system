from .models import BillOfMaterial


def get_active_bom_for_product(product):
    return (
        BillOfMaterial.objects.filter(product=product, is_active=True)
        .order_by("-updated_at", "-id")
        .first()
    )