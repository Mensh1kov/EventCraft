from plane.app.ai.tools.registry import register_tool
from plane.db.models import Vendor, IssueVendor, Issue, Workspace


VENDOR_CATEGORIES = [
    "photography",
    "video",
    "catering",
    "sound_lighting",
    "decor",
    "mc",
    "transport",
    "other",
]


def _vendor_dict(v: Vendor) -> dict:
    return {
        "id": str(v.id),
        "name": v.name,
        "category": v.category,
        "contact_name": v.contact_name,
        "contact_email": v.contact_email,
        "contact_phone": v.contact_phone,
        "website": v.website,
        "price_min": str(v.price_min) if v.price_min is not None else None,
        "price_max": str(v.price_max) if v.price_max is not None else None,
        "rating": v.rating,
        "url": f"/vendors/{v.id}",
    }


@register_tool(
    name="list_vendors",
    description="Search vendors (contractors) in the workspace directory. Use when the user asks to find a photographer, caterer, host, etc.",
    input_schema={
        "type": "object",
        "properties": {
            "category": {"type": "string", "enum": VENDOR_CATEGORIES},
            "max_price": {"type": "number", "description": "Maximum value of the vendor's price_max"},
            "min_rating": {"type": "integer", "description": "Minimum rating (1-5)"},
            "name_contains": {"type": "string", "description": "Filter by name (case-insensitive)"},
        },
    },
)
def list_vendors(
    workspace_slug: str,
    user,
    category=None,
    max_price=None,
    min_rating=None,
    name_contains=None,
    **kwargs,
) -> dict:
    qs = Vendor.objects.filter(workspace__slug=workspace_slug)
    if category:
        qs = qs.filter(category=category)
    if max_price:
        qs = qs.filter(price_max__lte=max_price)
    if min_rating:
        qs = qs.filter(rating__gte=min_rating)
    if name_contains:
        qs = qs.filter(name__icontains=name_contains)
    return {"vendors": [_vendor_dict(v) for v in qs[:20]]}


@register_tool(
    name="create_vendor",
    description="Add a new vendor (contractor) to the workspace directory.",
    input_schema={
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "category": {"type": "string", "enum": VENDOR_CATEGORIES},
            "contact_name": {"type": "string"},
            "contact_email": {"type": "string"},
            "contact_phone": {"type": "string"},
            "website": {"type": "string"},
            "price_min": {"type": "number"},
            "price_max": {"type": "number"},
            "rating": {"type": "integer", "description": "Rating from 1 to 5"},
            "notes": {"type": "string"},
        },
        "required": ["name", "category"],
    },
)
def create_vendor(workspace_slug: str, user, name: str, category: str = "other", **kwargs) -> dict:
    workspace = Workspace.objects.get(slug=workspace_slug)
    vendor = Vendor.objects.create(
        workspace=workspace,
        name=name,
        category=category,
        contact_name=kwargs.get("contact_name"),
        contact_email=kwargs.get("contact_email"),
        contact_phone=kwargs.get("contact_phone"),
        website=kwargs.get("website"),
        price_min=kwargs.get("price_min"),
        price_max=kwargs.get("price_max"),
        rating=kwargs.get("rating"),
        notes=kwargs.get("notes", ""),
    )
    return {"id": str(vendor.id), "name": vendor.name, "message": f"Vendor '{name}' created"}


@register_tool(
    name="update_vendor",
    description="Update an existing vendor in the directory.",
    input_schema={
        "type": "object",
        "properties": {
            "vendor_id": {"type": "string"},
            "name": {"type": "string"},
            "category": {"type": "string", "enum": VENDOR_CATEGORIES},
            "contact_name": {"type": "string"},
            "contact_email": {"type": "string"},
            "contact_phone": {"type": "string"},
            "website": {"type": "string"},
            "price_min": {"type": "number"},
            "price_max": {"type": "number"},
            "rating": {"type": "integer"},
            "notes": {"type": "string"},
        },
        "required": ["vendor_id"],
    },
)
def update_vendor(workspace_slug: str, user, vendor_id: str, **kwargs) -> dict:
    vendor = Vendor.objects.get(id=vendor_id, workspace__slug=workspace_slug)
    for field in [
        "name",
        "category",
        "contact_name",
        "contact_email",
        "contact_phone",
        "website",
        "price_min",
        "price_max",
        "rating",
        "notes",
    ]:
        if field in kwargs and kwargs[field] is not None:
            setattr(vendor, field, kwargs[field])
    vendor.save()
    return {"id": str(vendor.id), "message": f"Vendor '{vendor.name}' updated"}


@register_tool(
    name="delete_vendor",
    description="Delete a vendor from the directory.",
    input_schema={
        "type": "object",
        "properties": {"vendor_id": {"type": "string"}},
        "required": ["vendor_id"],
    },
)
def delete_vendor(workspace_slug: str, user, vendor_id: str, **kwargs) -> dict:
    vendor = Vendor.objects.get(id=vendor_id, workspace__slug=workspace_slug)
    name = vendor.name
    vendor.delete()
    return {"message": f"Vendor '{name}' deleted"}


@register_tool(
    name="link_vendor_to_issue",
    description="Attach a vendor (contractor) to an existing issue/task as a structured relation. Use after creating a task for a vendor.",
    input_schema={
        "type": "object",
        "properties": {
            "issue_id": {"type": "string", "description": "Issue UUID"},
            "vendor_id": {"type": "string", "description": "Vendor UUID (use list_vendors to get it)"},
        },
        "required": ["issue_id", "vendor_id"],
    },
)
def link_vendor_to_issue(workspace_slug: str, user, issue_id: str, vendor_id: str, **kwargs) -> dict:
    issue = Issue.objects.get(id=issue_id, workspace__slug=workspace_slug)
    vendor = Vendor.objects.get(id=vendor_id, workspace__slug=workspace_slug)
    link, created = IssueVendor.objects.get_or_create(
        issue=issue,
        vendor=vendor,
        deleted_at__isnull=True,
        defaults={"project_id": issue.project_id},
    )
    if not created:
        return {"message": f"Vendor '{vendor.name}' is already linked to this task"}
    return {
        "id": str(link.id),
        "message": f"Vendor '{vendor.name}' linked to task '{issue.name}'",
    }
