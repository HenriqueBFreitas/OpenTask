from django.db import models
from django.conf import settings


class Task(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.pk:
            try:
                old = Task.objects.get(pk=self.pk)
                old_completed = old.completed
            except Task.DoesNotExist:
                old_completed = None
        else:
            old_completed = None

        super().save(*args, **kwargs)

        if old_completed is None or old_completed == self.completed:
            return

        subtasks = self.subtasks.all()

        if self.completed:
            for st in subtasks:
                st.completed_before_task = st.completed
                st.completed = True
                st.save(update_fields=['completed', 'completed_before_task'])
        else:
            for st in subtasks:
                st.completed = st.completed_before_task
                st.save(update_fields=['completed'])


class SubTask(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='subtasks')
    title = models.CharField(max_length=255)
    completed = models.BooleanField(default=False)
    completed_before_task = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        task = self.task
        subtasks = task.subtasks.all()

        if not subtasks.exists():
            return

        all_done = all(st.completed for st in subtasks)

        if all_done and not task.completed:
            Task.objects.filter(pk=task.pk).update(completed=True)
        elif not all_done and task.completed:
            Task.objects.filter(pk=task.pk).update(completed=False)


class TaskImage(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='images')
    image_url = models.URLField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.task.title}"


class Board(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    elements = models.JSONField(default=list)
    app_state = models.JSONField(default=dict)
    files = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Board de {self.user}"
