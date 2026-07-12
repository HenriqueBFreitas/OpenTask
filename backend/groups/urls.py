from django.urls import path
from .views import (
    GroupListCreateView, GroupDetailView,
    SetAdminView, TransferOwnershipView, LeaveGroupView, KickMemberView,
    GroupMemberFilterView,
    GroupUserSearchView, InviteCreateView, InviteRespondView, MyPendingInvitesView,
    GroupTaskListCreateView, GroupTaskDetailView,
    GroupSubTaskListCreateView, GroupSubTaskDetailView, ShareTaskToGroupView,
    GroupFileListCreateView, GroupFileDetailView, GroupFileDownloadView, ShareFileToGroupView,
    GroupPhotoUploadView, GroupBannerUploadView,
)

urlpatterns = [
    # Grupos
    path('', GroupListCreateView.as_view()),
    path('<int:pk>/', GroupDetailView.as_view()),

    # Membros
    path('<int:group_id>/leave/', LeaveGroupView.as_view()),
    path('<int:group_id>/members/filter/', GroupMemberFilterView.as_view()),
    path('<int:group_id>/members/<int:user_id>/kick/', KickMemberView.as_view()),
    path('<int:group_id>/members/<int:user_id>/role/', SetAdminView.as_view()),
    path('<int:group_id>/members/<int:user_id>/transfer-ownership/', TransferOwnershipView.as_view()),

    # Foto e banner do grupo
    path('<int:group_id>/upload-photo/', GroupPhotoUploadView.as_view()),
    path('<int:group_id>/upload-banner/', GroupBannerUploadView.as_view()),

    # Convites
    path('invites/', MyPendingInvitesView.as_view()),                        
    path('invites/<int:invite_id>/respond/', InviteRespondView.as_view()),   
    path('<int:group_id>/users/search/', GroupUserSearchView.as_view()),
    path('<int:group_id>/invites/', InviteCreateView.as_view()),             

    # Tasks
    path('<int:group_id>/tasks/', GroupTaskListCreateView.as_view()),
    path('<int:group_id>/tasks/<int:pk>/', GroupTaskDetailView.as_view()),
    path('subtasks/', GroupSubTaskListCreateView.as_view()),
    path('subtasks/<int:pk>/', GroupSubTaskDetailView.as_view()),
    path('<int:group_id>/share-task/<int:task_id>/', ShareTaskToGroupView.as_view()),

    # Arquivos
    path('<int:group_id>/files/', GroupFileListCreateView.as_view()),
    path('<int:group_id>/files/<int:pk>/', GroupFileDetailView.as_view()),
    path('<int:group_id>/files/<int:pk>/download/', GroupFileDownloadView.as_view()),
    path('<int:group_id>/share-file/', ShareFileToGroupView.as_view()),
]