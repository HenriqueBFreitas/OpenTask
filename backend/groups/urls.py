from django.urls import path
from .views import (
    GroupListCreateView, GroupDetailView,
    SetAdminView, TransferOwnershipView, LeaveGroupView,
    InviteCreateView, InviteRespondView,
    GroupTaskListCreateView, GroupTaskDetailView,
    GroupSubTaskDetailView, ShareTaskToGroupView,
)

urlpatterns = [
    path('', GroupListCreateView.as_view()),
    path('<int:pk>/', GroupDetailView.as_view()),
    path('<int:group_id>/leave/', LeaveGroupView.as_view()),
    path('<int:group_id>/members/<int:user_id>/role/', SetAdminView.as_view()),
    path('<int:group_id>/members/<int:user_id>/transfer-ownership/', TransferOwnershipView.as_view()),
    path('<int:group_id>/invites/', InviteCreateView.as_view()),
    path('invites/<int:invite_id>/respond/', InviteRespondView.as_view()),
    path('<int:group_id>/tasks/', GroupTaskListCreateView.as_view()),
    path('<int:group_id>/tasks/<int:pk>/', GroupTaskDetailView.as_view()),
    path('subtasks/<int:pk>/', GroupSubTaskDetailView.as_view()),
    path('<int:group_id>/share-task/<int:task_id>/', ShareTaskToGroupView.as_view()),
]