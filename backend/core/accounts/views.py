from rest_framework import generics
from rest_framework.permissions import AllowAny
from .serializer import UserSerializer


class SignupView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
