from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q  # usado em FriendRequestSendView, FriendListView, FriendRemoveView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from .models import Friendship
from .serializers import FriendshipSerializer, UserSearchSerializer
from core.models import Notification

User = get_user_model()


def create_notification(recipient, sender, notif_type, object_id, message):
    Notification.objects.create(
        recipient=recipient,
        sender=sender,
        notif_type=notif_type,
        object_id=object_id,
        message=message,
    )


class UserSearchView(APIView):
    """Busca usuários por username (retorna id, username, full_name e avatar_url)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response([])
        users = User.objects.filter(
            username__icontains=q
        ).exclude(pk=request.user.pk)[:20]
        return Response(UserSearchSerializer(users, many=True).data)


class FriendRequestSendView(APIView):
    """Envia solicitação de amizade."""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        receiver = get_object_or_404(User, pk=user_id)

        if receiver == request.user:
            return Response({'error': 'Você não pode se adicionar.'}, status=400)

        exists = Friendship.objects.filter(
            Q(sender=request.user, receiver=receiver) |
            Q(sender=receiver, receiver=request.user)
        ).exists()

        if exists:
            return Response({'error': 'Solicitação já existe ou vocês já são amigos.'}, status=400)

        friendship = Friendship.objects.create(sender=request.user, receiver=receiver)

        create_notification(
            recipient=receiver,
            sender=request.user,
            notif_type='friend_request',
            object_id=friendship.pk,
            message=f"{request.user.full_name} (@{request.user.username}) quer ser seu amigo.",
        )

        return Response(FriendshipSerializer(friendship).data, status=201)


class FriendRequestRespondView(APIView):
    """Aceita ou recusa solicitação de amizade."""
    permission_classes = [IsAuthenticated]

    def post(self, request, friendship_id):
        friendship = get_object_or_404(
            Friendship, pk=friendship_id, receiver=request.user, status='pending'
        )
        action = request.data.get('action')

        if action == 'accept':
            friendship.status = 'accepted'
            friendship.save()
        elif action == 'decline':
            friendship.status = 'declined'
            friendship.save()
        else:
            return Response({'error': 'action deve ser accept ou decline'}, status=400)

        Notification.objects.filter(
            notif_type='friend_request',
            object_id=friendship.pk,
            recipient=request.user,
        ).delete()

        return Response(FriendshipSerializer(friendship).data)


class FriendListView(APIView):
    """Lista todos os amigos aceitos do usuário."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        friendships = Friendship.objects.filter(
            Q(sender=request.user) | Q(receiver=request.user),
            status='accepted'
        ).select_related('sender', 'receiver')

        friends = []
        for f in friendships:
            friend = f.receiver if f.sender == request.user else f.sender
            friends.append(UserSearchSerializer(friend).data)

        return Response(friends)


class FriendRemoveView(APIView):
    """Remove amizade."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        friendship = Friendship.objects.filter(
            Q(sender=request.user, receiver_id=user_id) |
            Q(sender_id=user_id, receiver=request.user),
            status='accepted'
        ).first()

        if not friendship:
            return Response({'error': 'Amizade não encontrada.'}, status=404)

        friendship.delete()
        return Response(status=204)
