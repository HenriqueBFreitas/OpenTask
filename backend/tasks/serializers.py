from rest_framework import serializers
from .models import Task, SubTask, TaskImage, Board
from groups.models import Group

class TaskImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskImage
        fields = ['id', 'image_url', 'uploaded_at']
        read_only_fields = ['uploaded_at', 'id', 'user']

class TaskImageUploadSerializer(serializers.Serializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True
    )

class SubTaskSerializer(serializers.ModelSerializer):
    task = serializers.PrimaryKeyRelatedField(queryset=Task.objects.all())

    class Meta:
        model = SubTask
        fields = ['id', 'task', 'title', 'completed', 'completed_before_task', 'created_at']
        read_only_fields = ['created_at', 'id', 'user', 'completed_before_task']

    def validate_task(self, value):

        request = self.context.get('request')
        if not request:
            return value
        
        user = request.user
        
        if value.is_personal:
            if value.user != user:
                raise serializers.ValidationError("Você não pode criar subtarefas nesta task.")
            return value
        
        task_groups = value.groups.all()
        if task_groups.exists():
            user_groups = user.group_memberships.values_list('group_id', flat=True)
            task_group_ids = task_groups.values_list('id', flat=True)
            
            if not any(gid in user_groups for gid in task_group_ids):
                raise serializers.ValidationError("Você não é membro dos grupos desta task.")
        else:
            if value.user != user:
                raise serializers.ValidationError("Você não pode criar subtarefas nesta task.")
        
        return value

class TaskSerializer(serializers.ModelSerializer):
    images_data = TaskImageSerializer(source='images', many=True, read_only=True)
    subtasks = SubTaskSerializer(many=True, read_only=True)
    groups = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Group.objects.all(),
        required=False,
    )

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'completed',
            'created_at', 'images_data', 'subtasks',
            'groups', 'is_personal',
        ]
        read_only_fields = ['id', 'user', 'created_at']

class BoardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Board
        fields = ['id', 'elements', 'app_state', 'files', 'updated_at']
        read_only_fields = ['id', 'updated_at']
