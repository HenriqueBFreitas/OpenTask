from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True, db_index=True)

    full_name = models.CharField(max_length=255, default='')

    google_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True
    )

    username_set = models.BooleanField(default=False)

    avatar_url = models.URLField(blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email