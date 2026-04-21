import uuid
from .models import CustomUser

def generate_unique_username(base):
    while True:
        username = f"{base}_{uuid.uuid4().hex[:6]}"
        if not CustomUser.objects.filter(username=username).exists():
            return username