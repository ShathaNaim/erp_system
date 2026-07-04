from .models import FinishedProduct
from rest_framework import serializers

class FinishedProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinishedProduct
        fields = "__all__"