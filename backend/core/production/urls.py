from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FinishedProductViewSet
router = DefaultRouter()
router.register(r"finished-products", FinishedProductViewSet, basename="finishedproduct")
urlpatterns = [
    path("", include(router.urls)),
]
