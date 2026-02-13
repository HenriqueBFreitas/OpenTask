from django.db import models

# Create your models here.

class Pagina(models.Model):
    titulo = models.CharField(max_length=255)
    criada_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titulo