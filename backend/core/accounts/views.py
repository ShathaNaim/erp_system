from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializer import CurrentUserSerializer, UserSerializer


class SignupView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = CurrentUserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
