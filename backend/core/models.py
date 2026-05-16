from django.db import models
from django.conf import settings


class Page(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    creation_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Notification(models.Model):
    class NotifType(models.TextChoices):
        FRIEND_REQUEST = 'friend_request', 'Friend Request'
        GROUP_INVITE = 'group_invite', 'Group Invite'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_notifications'
    )
    notif_type = models.CharField(max_length=20, choices=NotifType.choices)

    object_id = models.PositiveIntegerField()

    message = models.CharField(max_length=512)

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notif → {self.recipient} | {self.notif_type}"