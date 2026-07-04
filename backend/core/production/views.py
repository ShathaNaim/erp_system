from django.shortcuts import render
from rest_framework import viewsets
from .models import FinishedProduct
from .serializer import FinishedProductSerializer
from accounts.permissions import IsProductionManager, IsProductionEmployee
# Create your views here.
class FinishedProductViewSet(viewsets.ModelViewSet):
    queryset = FinishedProduct.objects.all()
    serializer_class = FinishedProductSerializer
    permission_classes = [IsProductionManager | IsProductionEmployee]  
