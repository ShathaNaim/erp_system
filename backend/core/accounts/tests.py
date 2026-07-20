from django.contrib.auth.models import Group, User
from django.test import TestCase
from rest_framework.permissions import SAFE_METHODS
from rest_framework.test import APIRequestFactory, force_authenticate

from .permissions import DemoReadOnlyPermission


class DemoReadOnlyPermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = DemoReadOnlyPermission()
        self.demo_user = User.objects.create_user(
            username="demo",
            password="test-password",
        )
        demo_group = Group.objects.create(name="demo_readonly")
        self.demo_user.groups.add(demo_group)
        self.regular_user = User.objects.create_user(
            username="employee",
            password="test-password",
        )

    def permission_result(self, method, user):
        request = getattr(self.factory, method.lower())("/")
        force_authenticate(request, user=user)
        request.user = user
        return self.permission.has_permission(request, view=None)

    def test_demo_user_can_use_safe_methods(self):
        for method in SAFE_METHODS:
            with self.subTest(method=method):
                self.assertTrue(self.permission_result(method, self.demo_user))

    def test_demo_user_cannot_change_data(self):
        for method in ("POST", "PUT", "PATCH", "DELETE"):
            with self.subTest(method=method):
                self.assertFalse(self.permission_result(method, self.demo_user))

    def test_regular_user_can_change_data(self):
        for method in ("POST", "PUT", "PATCH", "DELETE"):
            with self.subTest(method=method):
                self.assertTrue(self.permission_result(method, self.regular_user))

# Create your tests here.
