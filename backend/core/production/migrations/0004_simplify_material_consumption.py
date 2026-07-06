from django.db import migrations, models


def copy_raw_material_names(apps, schema_editor):
    MaterialConsumption = apps.get_model("production", "MaterialConsumption")

    for consumption in MaterialConsumption.objects.select_related("raw_material"):
        if consumption.raw_material_id:
            consumption.raw_material_name = consumption.raw_material.name
            consumption.save(update_fields=["raw_material_name"])


class Migration(migrations.Migration):

    dependencies = [
        ("production", "0003_finishedproduct_product_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="materialconsumption",
            name="raw_material_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.RunPython(copy_raw_material_names, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="materialconsumption",
            name="raw_material",
        ),
        migrations.AlterField(
            model_name="materialconsumption",
            name="raw_material_name",
            field=models.CharField(max_length=255),
        ),
    ]
