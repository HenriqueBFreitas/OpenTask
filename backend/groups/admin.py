from django.contrib import admin
from .models import Group, GroupMember, GroupInvite, GroupTask, GroupSubTask

admin.site.register(Group)
admin.site.register(GroupMember)
admin.site.register(GroupInvite)
admin.site.register(GroupTask)
admin.site.register(GroupSubTask)
