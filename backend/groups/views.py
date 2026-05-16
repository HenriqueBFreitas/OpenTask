from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Group, GroupMember, GroupInvite, GroupTask, GroupSubTask
from .serializers import (
    GroupSerializer, GroupMemberSerializer,
    GroupInviteSerializer, GroupTaskSerializer, GroupSubTaskSerializer
)
from core.models import Notification


def get_member(user, group):
    try:
        return GroupMember.objects.get(user=user, group=group)
    except GroupMember.DoesNotExist:
        return None


def is_admin_or_owner(user, group):
    m = get_member(user, group)
    return m and m.role in ('admin', 'owner')


def is_owner(user, group):
    m = get_member(user, group)
    return m and m.role == 'owner'


def create_notification(recipient, sender, notif_type, object_id, message):
    Notification.objects.create(
        recipient=recipient,
        sender=sender,
        notif_type=notif_type,
        object_id=object_id,
        message=message,
    )


class GroupListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(members__user=self.request.user)

    def perform_create(self, serializer):
        group = serializer.save(owner=self.request.user)
        GroupMember.objects.create(group=group, user=self.request.user, role='owner')


class GroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(members__user=self.request.user)

    def update(self, request, *args, **kwargs):
        group = self.get_object()
        if not is_owner(request.user, group):
            return Response({'error': 'Apenas o owner pode editar o grupo.'}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        group = self.get_object()
        if not is_owner(request.user, group):
            return Response({'error': 'Apenas o owner pode deletar o grupo.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class SetAdminView(APIView):
    """Owner define ou remove admin de um membro."""
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id, user_id):
        group = get_object_or_404(Group, pk=group_id)
        if not is_owner(request.user, group):
            return Response({'error': 'Apenas o owner pode definir admins.'}, status=403)
        member = get_object_or_404(GroupMember, group=group, user_id=user_id)
        if member.role == 'owner':
            return Response({'error': 'Não é possível alterar o role do owner.'}, status=400)
        new_role = request.data.get('role', 'admin')
        if new_role not in ('admin', 'member'):
            return Response({'error': 'role deve ser admin ou member.'}, status=400)
        member.role = new_role
        member.save()
        return Response(GroupMemberSerializer(member).data)


class TransferOwnershipView(APIView):
    """Owner transfere ownership para outro membro."""
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id, user_id):
        group = get_object_or_404(Group, pk=group_id)
        if not is_owner(request.user, group):
            return Response({'error': 'Apenas o owner pode transferir ownership.'}, status=403)
        new_owner_member = get_object_or_404(GroupMember, group=group, user_id=user_id)
        current = GroupMember.objects.get(group=group, user=request.user)
        current.role = 'admin'
        current.save()
        new_owner_member.role = 'owner'
        new_owner_member.save()
        group.owner = new_owner_member.user
        group.save()
        return Response({'status': 'ownership transferido'})


class LeaveGroupView(APIView):
    """Membro/admin sai do grupo. Owner só sai após transferir ownership."""
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id)
        member = get_object_or_404(GroupMember, group=group, user=request.user)
        if member.role == 'owner':
            return Response({'error': 'Transfira o ownership antes de sair.'}, status=400)
        member.delete()
        return Response({'status': 'saiu do grupo'})


class InviteCreateView(APIView):
    """Admin ou owner convida um usuário (por ID ou da lista de amigos)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id)
        if not is_admin_or_owner(request.user, group):
            return Response({'error': 'Apenas admins/owner podem convidar.'}, status=403)

        invited_user_id = request.data.get('invited_user')
        if not invited_user_id:
            return Response({'error': 'invited_user é obrigatório.'}, status=400)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        invited_user = get_object_or_404(User, pk=invited_user_id)

        if GroupMember.objects.filter(group=group, user=invited_user).exists():
            return Response({'error': 'Usuário já é membro do grupo.'}, status=400)

        invite, created = GroupInvite.objects.get_or_create(
            group=group,
            invited_user=invited_user,
            defaults={'invited_by': request.user}
        )

        if not created:
            return Response({'error': 'Convite já enviado.'}, status=400)

        create_notification(
            recipient=invited_user,
            sender=request.user,
            notif_type='group_invite',
            object_id=invite.pk,
            message=f"{request.user.full_name} te convidou para o grupo \"{group.name}\".",
        )

        return Response(GroupInviteSerializer(invite).data, status=201)


class InviteRespondView(APIView):
    """Usuário convidado aceita ou recusa o convite."""
    permission_classes = [IsAuthenticated]

    def post(self, request, invite_id):
        invite = get_object_or_404(
            GroupInvite, pk=invite_id, invited_user=request.user, status='pending'
        )
        action = request.data.get('action')

        if action == 'accept':
            invite.status = 'accepted'
            invite.save()
            GroupMember.objects.get_or_create(
                group=invite.group, user=request.user, defaults={'role': 'member'}
            )
        elif action == 'decline':
            invite.status = 'declined'
            invite.save()
        else:
            return Response({'error': 'action deve ser accept ou decline'}, status=400)

        Notification.objects.filter(
            notif_type='group_invite',
            object_id=invite.pk,
            recipient=request.user,
        ).delete()

        return Response(GroupInviteSerializer(invite).data)


class GroupTaskListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        group = get_object_or_404(Group, pk=self.kwargs['group_id'])
        if not get_member(self.request.user, group):
            return GroupTask.objects.none()
        return GroupTask.objects.filter(group=group)

    def perform_create(self, serializer):
        group = get_object_or_404(Group, pk=self.kwargs['group_id'])
        if not is_admin_or_owner(self.request.user, group):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Apenas admins/owner podem criar tasks.')
        serializer.save(group=group, created_by=self.request.user)


class GroupTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GroupTask.objects.filter(group__members__user=self.request.user)

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        if set(request.data.keys()) <= {'completed'}:
            return self._toggle_complete(request, task)
        if not is_admin_or_owner(request.user, task.group):
            return Response({'error': 'Sem permissão para editar.'}, status=403)
        return super().update(request, *args, **kwargs)

    def _toggle_complete(self, request, task):
        assigned = list(task.assigned_to.values_list('id', flat=True))
        member = get_member(request.user, task.group)
        if not member:
            return Response(status=403)
        can = (not assigned) or (request.user.id in assigned) or (member.role in ('admin', 'owner'))
        if not can:
            return Response({'error': 'Você não foi delegado para essa task.'}, status=403)
        task.completed = request.data['completed']
        task.completed_by = request.user if task.completed else None
        task.save()
        return Response(GroupTaskSerializer(task).data)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        if not is_admin_or_owner(request.user, task.group):
            return Response({'error': 'Sem permissão.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class GroupSubTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupSubTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GroupSubTask.objects.filter(task__group__members__user=self.request.user)

    def update(self, request, *args, **kwargs):
        subtask = self.get_object()
        if set(request.data.keys()) <= {'completed'}:
            assigned = list(subtask.assigned_to.values_list('id', flat=True))
            member = get_member(request.user, subtask.task.group)
            can = (not assigned) or (request.user.id in assigned) or (member and member.role in ('admin', 'owner'))
            if not can:
                return Response({'error': 'Você não foi delegado para essa subtask.'}, status=403)
            subtask.completed = request.data['completed']
            subtask.completed_by = request.user if subtask.completed else None
            subtask.save()
            return Response(GroupSubTaskSerializer(subtask).data)
        if not is_admin_or_owner(request.user, subtask.task.group):
            return Response({'error': 'Sem permissão.'}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        subtask = self.get_object()
        if not is_admin_or_owner(request.user, subtask.task.group):
            return Response({'error': 'Sem permissão.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class ShareTaskToGroupView(APIView):
    """
    move=true  → move a task (sai do perfil do user)
    move=false → copia a task (mantém no perfil, cria cópia no grupo)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id, task_id):
        from tasks.models import Task
        group = get_object_or_404(Group, pk=group_id)
        if not is_admin_or_owner(request.user, group):
            return Response({'error': 'Sem permissão.'}, status=403)
        task = get_object_or_404(Task, pk=task_id, user=request.user)
        move = request.data.get('move', False)

        group_task = GroupTask.objects.create(
            group=group,
            created_by=request.user,
            title=task.title,
            description=task.description,
            completed=task.completed,
        )

        if move:
            task.delete()

        return Response(GroupTaskSerializer(group_task).data, status=201)
