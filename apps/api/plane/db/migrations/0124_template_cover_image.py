from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("db", "0123_project_templates"),
    ]

    operations = [
        migrations.AddField(
            model_name="projecttemplate",
            name="cover_image_url",
            field=models.TextField(blank=True, null=True),
        ),
    ]
