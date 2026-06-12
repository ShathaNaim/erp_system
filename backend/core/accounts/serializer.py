from rest_framework import serializers
from django.contrib.auth.models import User


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CurrentUserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="employee_profile.role", read_only=True)
    department = serializers.CharField(source="employee_profile.department", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "role", "department"]
