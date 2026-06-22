from django.urls import path
from plane.app.views.project_template import ProjectTemplateViewSet, SaveProjectAsTemplateEndpoint

urlpatterns = [
    path(
        "workspaces/<str:slug>/project-templates/",
        ProjectTemplateViewSet.as_view({"get": "list", "post": "create"}),
        name="project-templates",
    ),
    path(
        "workspaces/<str:slug>/project-templates/<uuid:pk>/",
        ProjectTemplateViewSet.as_view({
            "get": "retrieve",
            "patch": "partial_update",
            "delete": "destroy",
        }),
        name="project-template-detail",
    ),
    path(
        "workspaces/<str:slug>/project-templates/<uuid:pk>/apply/",
        ProjectTemplateViewSet.as_view({"post": "apply"}),
        name="project-template-apply",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/save-as-template/",
        SaveProjectAsTemplateEndpoint.as_view({"post": "create"}),
        name="project-save-as-template",
    ),
]
