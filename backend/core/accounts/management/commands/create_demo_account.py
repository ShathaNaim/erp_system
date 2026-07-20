import os

from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand

from accounts.models import EmployeeProfile


class Command(BaseCommand):
    help = "Create or update the public read-only demo account."

    def handle(self, *args, **options):
        username = os.environ.get("DEMO_ACCOUNT_USERNAME", "demo")
        password = os.environ.get("DEMO_ACCOUNT_PASSWORD", "DemoERP2026!")

        group, _ = Group.objects.get_or_create(name="demo_readonly")
        user, created = User.objects.get_or_create(username=username)

        user.set_password(password)
        user.is_staff = False
        user.is_superuser = False
        user.is_active = True
        user.save()
        user.groups.add(group)

        EmployeeProfile.objects.update_or_create(
            user=user,
            defaults={
                "role": EmployeeProfile.Role.ADMIN,
                "department": EmployeeProfile.Department.IT,
                "is_active": True,
            },
        )

        action = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} read-only demo account '{username}'."
            )
        )
