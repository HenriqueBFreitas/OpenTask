# Generated manually — adds nickname and Generic FK (content_type + object_id)

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('files', '0001_initial'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='file',
            name='nickname',
            field=models.CharField(
                blank=True,
                null=True,
                max_length=255,
                verbose_name='Apelido',
                help_text='Nome amigável opcional para o arquivo.',
            ),
        ),
        migrations.AddField(
            model_name='file',
            name='content_type',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='files',
                to='contenttypes.contenttype',
            ),
        ),
        migrations.AddField(
            model_name='file',
            name='object_id',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='file',
            name='original_name',
            field=models.CharField(editable=False, max_length=255),
        ),
    ]
