from rest_framework import serializers
from .models import Group, GroupMember, GroupInvite, GroupTask, GroupSubTask, GroupFile


class GroupMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_avatar = serializers.URLField(source='user.avatar_url', read_only=True)

    class Meta:
        model = GroupMember
        fields = ['id', 'user', 'user_email', 'user_full_name', 'user_username', 'user_avatar', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class GroupMemberFilterSerializer(serializers.ModelSerializer):
    """Retorna membros ativos com cargo atual — usado nos dropdowns de filtro."""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    avatar_url = serializers.URLField(source='user.avatar_url', read_only=True)

    class Meta:
        model = GroupMember
        fields = ['user_id', 'username', 'full_name', 'avatar_url', 'role']


class GroupSerializer(serializers.ModelSerializer):
    members = GroupMemberSerializer(many=True, read_only=True)
    owner_email = serializers.EmailField(source='owner.email', read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'photo_url', 'banner_url', 'color', 'owner', 'owner_email', 'members', 'created_at']
        read_only_fields = ['id', 'owner', 'created_at']


class GroupInviteSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source='group.name', read_only=True)
    invited_by_username = serializers.CharField(source='invited_by.username', read_only=True)

    class Meta:
        model = GroupInvite
        fields = ['id', 'group', 'group_name', 'invited_by', 'invited_by_username',
                  'invited_user', 'status', 'created_at']
        read_only_fields = ['id', 'invited_by', 'status', 'created_at']


class GroupSubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupSubTask
        fields = ['id', 'task', 'title', 'completed', 'completed_by', 'assigned_to', 'completed_before_task', 'created_at']
        read_only_fields = ['id', 'completed_by', 'completed_before_task', 'created_at']


class GroupTaskSerializer(serializers.ModelSerializer):
    subtasks = GroupSubTaskSerializer(many=True, read_only=True)

    class Meta:
        model = GroupTask
        fields = ['id', 'group', 'created_by', 'title', 'description', 'completed', 'completed_by', 'assigned_to', 'image_url', 'subtasks', 'created_at']
        read_only_fields = ['id', 'created_by', 'completed_by', 'created_at']


class GroupFileSerializer(serializers.ModelSerializer):
    file_id = serializers.IntegerField(source='file.id', read_only=True)
    original_name = serializers.CharField(source='file.original_name', read_only=True)
    size = serializers.IntegerField(source='file.size', read_only=True)
    file_url = serializers.SerializerMethodField()
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    uploaded_by_full_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)

    class Meta:
        model = GroupFile
        fields = ['id', 'file_id', 'original_name', 'size', 'file_url', 'uploaded_by',
                  'uploaded_by_username', 'uploaded_by_full_name', 'attached_at']
        read_only_fields = fields

    def get_file_url(self, obj):
        # Prioridade: Cloudinary (image_url) → arquivo local (file)
        if obj.file.image_url:
            return obj.file.image_url
        if obj.file.file:
            raw = obj.file.file.url
            # Se o storage já retornou URL absoluta (Cloudinary), usa direto
            if raw.startswith('http'):
                return raw
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(raw)
        return None