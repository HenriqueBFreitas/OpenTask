from rest_framework import serializers
from .models import Page, Notification


class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_full_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_avatar = serializers.URLField(source='sender.avatar_url', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'notif_type',
            'object_id',
            'message',
            'is_read',
            'created_at',
            'sender_username',
            'sender_full_name',
            'sender_avatar',
        ]
        read_only_fields = fields
