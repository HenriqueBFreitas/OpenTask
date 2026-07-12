from rest_framework import serializers
from .models import CustomUser
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    full_name = serializers.CharField(required=True, max_length=255)
    username = serializers.CharField(required=True, min_length=3, max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['email', 'full_name', 'username', 'password', 'password_confirm']

    def validate_username(self, value):
        import re
        if not re.match(r'^[\w.@+-]+$', value):
            raise serializers.ValidationError(
                "Username pode conter apenas letras, números e os caracteres @/./+/-/_"
            )
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Este username já está em uso.")
        return value

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        full_name = validated_data.pop('full_name')

        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        user.full_name = full_name
        user.username_set = True
        user.save()
        return user
    
class ProfileUpdateSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(required=False, max_length=255)

    class Meta:
        model = CustomUser
        fields = ['full_name']

    def update(self, instance, validated_data):
        instance.full_name = validated_data.get('full_name', instance.full_name)
        instance.save()
        return instance

class UsernameUpdateSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=True, min_length=3, max_length=150)

    class Meta:
        model = CustomUser
        fields = ['username']

    def validate_username(self, value):
        import re
        if not re.match(r'^[\w.@+-]+$', value):
            raise serializers.ValidationError(
                "Username pode conter apenas letras, números e os caracteres @/./+/-/_"
            )
        qs = CustomUser.objects.filter(username=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Este username já está em uso.")
        return value

    def update(self, instance, validated_data):
        instance.username = validated_data['username']
        instance.username_set = True
        instance.save()
        return instance

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'