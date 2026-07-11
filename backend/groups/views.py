import cloudinary.uploader
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.http import HttpResponse
import requests as http_requests

from .models import Group, GroupMember, GroupInvite, GroupTask, GroupSubTask, GroupFile
from .serializers import (
    GroupSerializer, GroupMemberSerializer, GroupMemberFilterSerializer,
    GroupInviteSerializer, GroupTaskSerializer, GroupSubTaskSerializer,
    GroupFileSerializer,
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


def can_delete_task(requester, task):
    """
    Owner → deleta de todos.
    Admin → deleta de membros e os próprios. Não deleta de outros admins/owner.
    Member → só os próprios.
    """
    if requester.role == 'owner':
        return True
    creator_member = get_member(task.created_by, task.group)
    creator_role = creator_member.role if creator_member else 'member'
    if requester.role == 'admin':
        return creator_role == 'member' or task.created_by == requester.user
    return task.created_by == requester.user


def can_delete_file(requester, group_file):
    if requester.role == 'owner':
        return True
    uploader_member = get_member(group_file.uploaded_by, group_file.group)
    uploader_role = uploader_member.role if uploader_member else 'member'
    if requester.role == 'admin':
        return uploader_role == 'member' or group_file.uploaded_by == requester.user
    return group_file.uploaded_by == requester.user


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



class GroupPhotoUploadView(APIView):
    """
    POST /api/groups/<group_id>/upload-photo/
    multipart/form-data: photo=<file>
    Faz upload da foto do grupo no Cloudinary e salva a URL.
    Apenas owner pode alterar.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id)
        if not is_owner(request.user, group):
            return Response({'error': 'Apenas o owner pode alterar a foto do grupo.'}, status=403)

        file = request.FILES.get('photo')
        if not file:
            return Response({'error': 'Nenhuma imagem enviada. Use o campo "photo".'}, status=400)

        result = cloudinary.uploader.upload(file, folder='groups/photos')
        group.photo_url = result['secure_url']
        group.save(update_fields=['photo_url'])
        return Response({'photo_url': group.photo_url})


class GroupBannerUploadView(APIView):
    """
    POST /api/groups/<group_id>/upload-banner/
    multipart/form-data: banner=<file>
    Faz upload do banner do grupo no Cloudinary e salva a URL.
    Apenas owner pode alterar.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id)
        if not is_owner(request.user, group):
            return Response({'error': 'Apenas o owner pode alterar o banner do grupo.'}, status=403)

        file = request.FILES.get('banner')
        if not file:
            return Response({'error': 'Nenhuma imagem enviada. Use o campo "banner".'}, status=400)

        result = cloudinary.uploader.upload(file, folder='groups/banners')
        group.banner_url = result['secure_url']
        group.save(update_fields=['banner_url'])
        return Response({'banner_url': group.banner_url})


class SetAdminView(APIView):
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
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id)
        member = get_object_or_404(GroupMember, group=group, user=request.user)
        if member.role == 'owner':
            return Response({'error': 'Transfira o ownership antes de sair.'}, status=400)
        member.delete()
        return Response({'status': 'saiu do grupo'})


class KickMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, group_id, user_id):
        group = get_object_or_404(Group, pk=group_id)
        requester = get_member(request.user, group)
        if not requester or requester.role not in ('admin', 'owner'):
            return Response({'error': 'Sem permissão para expulsar membros.'}, status=403)
        target = get_object_or_404(GroupMember, group=group, user_id=user_id)
        if target.user == request.user:
            return Response({'error': 'Use a rota de sair do grupo.'}, status=400)
        if target.role == 'owner':
            return Response({'error': 'Não é possível expulsar o owner.'}, status=400)
        if requester.role == 'admin' and target.role == 'admin':
            return Response({'error': 'Admins só podem expulsar membros.'}, status=403)
        target.delete()
        return Response({'status': 'membro expulso'})


class GroupMemberFilterView(APIView):
    """
    Retorna membros ativos do grupo para popular dropdowns de filtro.
    ?role=admin|member|owner  → filtra por cargo atual
    ?user_id=<id>             → retorna só esse membro com cargo atual
    Membros que saíram/foram expulsos não aparecem.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id)
        if not get_member(request.user, group):
            return Response({'error': 'Sem acesso.'}, status=403)

        qs = GroupMember.objects.filter(group=group).select_related('user')

        role = request.query_params.get('role')
        user_id = request.query_params.get('user_id')

        if user_id:
            qs = qs.filter(user_id=user_id)
        elif role:
            qs = qs.filter(role=role)

        return Response(GroupMemberFilterSerializer(qs, many=True).data)


class GroupUserSearchView(APIView):
    """
    Busca usuários por username para convidar ao grupo.
    ?q=<username>  → retorna id, username, full_name, avatar_url
    Exclui membros que já estão no grupo.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        group = get_object_or_404(Group, pk=group_id)
        if not is_admin_or_owner(request.user, group):
            return Response({'error': 'Apenas admins/owner podem buscar usuários para convite.'}, status=403)

        q = request.query_params.get('q', '').strip()
        if not q:
            return Response([])

        already_members = GroupMember.objects.filter(group=group).values_list('user_id', flat=True)

        users = User.objects.filter(
            username__icontains=q
        ).exclude(pk=request.user.pk).exclude(pk__in=already_members)[:20]

        from friends.serializers import UserSearchSerializer
        return Response(UserSearchSerializer(users, many=True).data)


class InviteCreateView(APIView):
    """
    Convida um usuário para o grupo.
    Aceita duas formas no body:
      - { "invited_user": <user_id> }   → convite pela lista de amigos
      - { "username": "<username>" }     → convite pela busca por username
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id)
        if not is_admin_or_owner(request.user, group):
            return Response({'error': 'Apenas admins/owner podem convidar.'}, status=403)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Suporta convite por user_id (lista de amigos) ou por username (busca)
        invited_user_id = request.data.get('invited_user')
        username = request.data.get('username')

        if invited_user_id:
            invited_user = get_object_or_404(User, pk=invited_user_id)
        elif username:
            invited_user = get_object_or_404(User, username=username)
        else:
            return Response({'error': 'Informe invited_user (id) ou username.'}, status=400)

        if invited_user == request.user:
            return Response({'error': 'Você não pode se convidar.'}, status=400)

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

        qs = GroupTask.objects.filter(group=group)

        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(created_by_id=user_id)

        role = self.request.query_params.get('role')
        if role:
            member_ids = GroupMember.objects.filter(
                group=group, role=role
            ).values_list('user_id', flat=True)
            qs = qs.filter(created_by_id__in=member_ids)

        return qs

    def perform_create(self, serializer):
        group = get_object_or_404(Group, pk=self.kwargs['group_id'])
        member = get_member(self.request.user, group)
        if not member:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Você não é membro deste grupo.')
        serializer.save(group=group, created_by=self.request.user)


class GroupTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GroupTask.objects.filter(group__members__user=self.request.user)

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        requester = get_member(request.user, task.group)
        if not requester:
            return Response(status=403)

        if set(request.data.keys()) <= {'completed'}:
            return self._toggle_complete(request, task, requester)

        if task.created_by != request.user and requester.role not in ('admin', 'owner'):
            return Response({'error': 'Sem permissão para editar.'}, status=403)
        return super().update(request, *args, **kwargs)

    def _toggle_complete(self, request, task, requester):
        assigned = list(task.assigned_to.values_list('id', flat=True))
        can = (
            (not assigned) or
            (request.user.id in assigned) or
            (requester.role in ('admin', 'owner'))
        )
        if not can:
            return Response({'error': 'Você não foi delegado para essa task.'}, status=403)
        task.completed = request.data['completed']
        task.completed_by = request.user if task.completed else None
        task.save()
        return Response(GroupTaskSerializer(task).data)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        requester = get_member(request.user, task.group)
        if not requester or not can_delete_task(requester, task):
            return Response({'error': 'Sem permissão para deletar.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class GroupSubTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupSubTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GroupSubTask.objects.filter(task__group__members__user=self.request.user)

    def update(self, request, *args, **kwargs):
        subtask = self.get_object()
        requester = get_member(request.user, subtask.task.group)

        if set(request.data.keys()) <= {'completed'}:
            assigned = list(subtask.assigned_to.values_list('id', flat=True))
            can = (
                (not assigned) or
                (request.user.id in assigned) or
                (requester and requester.role in ('admin', 'owner'))
            )
            if not can:
                return Response({'error': 'Você não foi delegado para essa subtask.'}, status=403)
            subtask.completed = request.data['completed']
            subtask.completed_by = request.user if subtask.completed else None
            subtask.save()
            return Response(GroupSubTaskSerializer(subtask).data)

        if subtask.task.created_by != request.user and (not requester or requester.role not in ('admin', 'owner')):
            return Response({'error': 'Sem permissão para editar.'}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        subtask = self.get_object()
        requester = get_member(request.user, subtask.task.group)
        if not requester or not can_delete_task(requester, subtask.task):
            return Response({'error': 'Sem permissão.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class ShareTaskToGroupView(APIView):
    """Qualquer membro pode compartilhar uma task pessoal para o grupo."""
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id, task_id):
        from tasks.models import Task
        group = get_object_or_404(Group, pk=group_id)
        if not get_member(request.user, group):
            return Response({'error': 'Você não é membro deste grupo.'}, status=403)
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


class GroupFileListCreateView(APIView):
    """
    GET  /api/groups/<id>/files/  → lista arquivos do grupo
    POST /api/groups/<id>/files/  → vincula arquivo existente ao grupo
    body: { "file": <file_id> }

    Filtros GET:
      ?user_id=<id>  → arquivos de um usuário específico
      ?role=<cargo>  → arquivos de membros com esse cargo atual
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_object_or_404(Group, pk=group_id)
        if not get_member(request.user, group):
            return Response({'error': 'Sem acesso.'}, status=403)

        qs = GroupFile.objects.filter(group=group).select_related('file', 'uploaded_by')

        user_id = request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(uploaded_by_id=user_id)

        role = request.query_params.get('role')
        if role:
            member_ids = GroupMember.objects.filter(
                group=group, role=role
            ).values_list('user_id', flat=True)
            qs = qs.filter(uploaded_by_id__in=member_ids)

        return Response(GroupFileSerializer(qs, many=True, context={'request': request}).data)

    def post(self, request, group_id):
        from files.models import File
        group = get_object_or_404(Group, pk=group_id)
        if not get_member(request.user, group):
            return Response({'error': 'Sem acesso.'}, status=403)

        file_id = request.data.get('file')
        if not file_id:
            return Response({'error': 'file é obrigatório.'}, status=400)

        file = get_object_or_404(File, pk=file_id, user=request.user)

        group_file, created = GroupFile.objects.get_or_create(
            group=group,
            file=file,
            defaults={'uploaded_by': request.user}
        )

        if not created:
            return Response({'error': 'Arquivo já está no grupo.'}, status=400)

        return Response(GroupFileSerializer(group_file, context={'request': request}).data, status=201)


class GroupFileDetailView(APIView):
    """
    GET    /api/groups/<id>/files/<pk>/
    DELETE /api/groups/<id>/files/<pk>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id, pk):
        group = get_object_or_404(Group, pk=group_id)
        if not get_member(request.user, group):
            return Response({'error': 'Sem acesso.'}, status=403)
        group_file = get_object_or_404(GroupFile, pk=pk, group=group)
        return Response(GroupFileSerializer(group_file, context={'request': request}).data)

    def delete(self, request, group_id, pk):
        group = get_object_or_404(Group, pk=group_id)
        requester = get_member(request.user, group)
        if not requester:
            return Response({'error': 'Sem acesso.'}, status=403)
        group_file = get_object_or_404(GroupFile, pk=pk, group=group)
        if not can_delete_file(requester, group_file):
            return Response({'error': 'Sem permissão para remover este arquivo.'}, status=403)
        group_file.delete()
        return Response(status=204)

class GroupFileDownloadView(APIView):
    """
    GET /api/groups/<group_id>/files/<pk>/download/
    Qualquer membro do grupo pode baixar o arquivo — faz proxy do Cloudinary.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id, pk):
        group = get_object_or_404(Group, pk=group_id)
        if not get_member(request.user, group):
            return Response({'error': 'Sem acesso.'}, status=403)
        group_file = get_object_or_404(GroupFile, pk=pk, group=group)
        file_obj = group_file.file

        url = file_obj.image_url or ''
        if not url and file_obj.file:
            raw = file_obj.file.url
            url = raw if raw.startswith('http') else request.build_absolute_uri(raw)
        if not url:
            return Response({'detail': 'Sem arquivo.'}, status=404)

        try:
            r = http_requests.get(url, timeout=30)
            return HttpResponse(
                r.content,
                content_type=r.headers.get('Content-Type', 'application/octet-stream'),
            )
        except Exception as e:
            return Response({'detail': str(e)}, status=502)


class MyPendingInvitesView(APIView):
    """GET /api/groups/invites/ → convites pendentes do usuário logado"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        invites = GroupInvite.objects.filter(
            invited_user=request.user,
            status='pending'
        ).select_related('group', 'invited_by')
        return Response(GroupInviteSerializer(invites, many=True).data)


class ShareFileToGroupView(APIView):
    """
    Qualquer membro pode compartilhar um arquivo pessoal para o grupo.
    body: { "file": <file_id>, "move": true|false }
    move=true  → remove o File pessoal
    move=false → mantém o File pessoal, só vincula ao grupo
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        from files.models import File
        group = get_object_or_404(Group, pk=group_id)
        if not get_member(request.user, group):
            return Response({'error': 'Você não é membro deste grupo.'}, status=403)

        file_id = request.data.get('file')
        if not file_id:
            return Response({'error': 'file é obrigatório.'}, status=400)

        file = get_object_or_404(File, pk=file_id, user=request.user)
        move = request.data.get('move', False)

        group_file, created = GroupFile.objects.get_or_create(
            group=group,
            file=file,
            defaults={'uploaded_by': request.user}
        )

        if not created:
            return Response({'error': 'Arquivo já está no grupo.'}, status=400)

        if move:
            file.task_files.all().delete()
            file.delete()

        return Response(GroupFileSerializer(group_file, context={'request': request}).data, status=201)
