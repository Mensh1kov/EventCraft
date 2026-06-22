# Фича: База подрядчиков (Vendors)

## Концепция

База подрядчиков — справочник на уровне воркспейса. Отдельная вкладка в сайдбаре,
визуально похожая на страницу Проектов: карточки, поиск, фильтры.

Когда нужен подрядчик для мероприятия — AI находит его в базе и создаёт задачу в
нужном проекте: вставляет контакты, ссылку на карточку вендора, метку "Подрядчик"
и сумму в поле budget_estimated.

---

## Модель данных

### Vendor (уровень воркспейса)

| Поле            | Тип                                      | Описание              |
| --------------- | ---------------------------------------- | --------------------- |
| `workspace`     | FK → Workspace                           | Привязка к воркспейсу |
| `name`          | CharField(255)                           | Название / имя        |
| `category`      | CharField(50)                            | Категория (см. ниже)  |
| `contact_name`  | CharField(255), nullable                 | Контактное лицо       |
| `contact_email` | EmailField, nullable                     | Email                 |
| `contact_phone` | CharField(50), nullable                  | Телефон               |
| `website`       | URLField, nullable                       | Сайт / соцсети        |
| `price_min`     | DecimalField(10,2), nullable             | Ценник от             |
| `price_max`     | DecimalField(10,2), nullable             | Ценник до             |
| `rating`        | PositiveSmallIntegerField(1-5), nullable | Внутренний рейтинг    |
| `notes`         | TextField, blank                         | Заметки               |

**Категории:** photography / video / catering / sound_lighting / decor / mc / transport / other

Модель наследует от `WorkspaceBaseModel` (workspace, created_by, updated_by, created_at, updated_at).

---

## Сценарий использования

```
Пользователь: "Найди фотографа до 60 000 ₽ и создай задачу в проекте Корпоратив"

AI:
1. list_vendors(category="photography", max_price=60000)
   → Иванов Фото, 40–55 000 ₽, ⭐⭐⭐⭐⭐

2. create_issue(
     project_id="...",
     title="Иванов Фото — договор",
     description="📷 Фотограф\nКонтакт: Алексей, [Email7]\n🔗 http://localhost/workspace/vendors/abc123",
     label_names=["Подрядчик"],
     budget_estimated=55000
   )

→ "Создал задачу «Иванов Фото — договор» с бюджетом 55 000 ₽ и меткой Подрядчик"
```

---

## План реализации

---

### 1. Backend — модель

**`apps/api/plane/db/models/vendor.py`** — новый файл:

```python
from django.db import models
from plane.db.models.base import WorkspaceBaseModel

VENDOR_CATEGORY_CHOICES = (
    ("photography", "Фотография"),
    ("video", "Видеосъёмка"),
    ("catering", "Кейтеринг"),
    ("sound_lighting", "Звук и свет"),
    ("decor", "Декор"),
    ("mc", "Ведущий"),
    ("transport", "Транспорт"),
    ("other", "Другое"),
)

class Vendor(WorkspaceBaseModel):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=VENDOR_CATEGORY_CHOICES, default="other")
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    price_min = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    price_max = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    rating = models.PositiveSmallIntegerField(blank=True, null=True)  # 1–5
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "vendors"
        ordering = ["name"]
```

**`apps/api/plane/db/models/__init__.py`** — добавить импорт `Vendor`.

### 2. Backend — миграция

`apps/api/plane/db/migrations/0123_vendor.py` — создать таблицу `vendors`.

(Зависит от последней миграции на момент реализации.)

### 3. Backend — сериализатор

**`apps/api/plane/app/serializers/vendor.py`** — новый файл:

```python
from plane.app.serializers.base import BaseSerializer
from plane.db.models import Vendor

class VendorSerializer(BaseSerializer):
    class Meta:
        model = Vendor
        fields = "__all__"
        read_only_fields = ["workspace", "created_by", "updated_by", "created_at", "updated_at"]
```

**`apps/api/plane/app/serializers/__init__.py`** — добавить импорт.

### 4. Backend — ViewSet и URLs

**`apps/api/plane/app/views/vendor.py`** — новый файл:

```python
from rest_framework import status
from rest_framework.response import Response
from plane.app.permissions import ROLE, allow_permission
from plane.app.serializers.vendor import VendorSerializer
from plane.app.views.base import BaseAPIView
from plane.db.models import Vendor

class VendorViewSet(BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def list(self, request, slug):
        vendors = Vendor.objects.filter(workspace__slug=slug)
        # фильтры: category, max_price, min_rating
        category = request.query_params.get("category")
        max_price = request.query_params.get("max_price")
        min_rating = request.query_params.get("min_rating")
        if category:
            vendors = vendors.filter(category=category)
        if max_price:
            vendors = vendors.filter(price_max__lte=max_price)
        if min_rating:
            vendors = vendors.filter(rating__gte=min_rating)
        serializer = VendorSerializer(vendors, many=True)
        return Response(serializer.data)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def create(self, request, slug):
        from plane.db.models import Workspace
        workspace = Workspace.objects.get(slug=slug)
        serializer = VendorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace=workspace, created_by=request.user, updated_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def retrieve(self, request, slug, vendor_id):
        vendor = Vendor.objects.get(id=vendor_id, workspace__slug=slug)
        return Response(VendorSerializer(vendor).data)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def partial_update(self, request, slug, vendor_id):
        vendor = Vendor.objects.get(id=vendor_id, workspace__slug=slug)
        serializer = VendorSerializer(vendor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission([ROLE.ADMIN], level="WORKSPACE")
    def destroy(self, request, slug, vendor_id):
        Vendor.objects.get(id=vendor_id, workspace__slug=slug).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

**`apps/api/plane/app/urls/vendor.py`** — новый файл:

```python
from django.urls import path
from plane.app.views.vendor import VendorViewSet

urlpatterns = [
    path("workspaces/<str:slug>/vendors/", VendorViewSet.as_view({"get": "list", "post": "create"})),
    path("workspaces/<str:slug>/vendors/<uuid:vendor_id>/", VendorViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})),
]
```

**`apps/api/plane/app/urls/__init__.py`** — добавить `vendor_urls` и включить в `urlpatterns`.

### 5. Backend — AI инструменты

**`apps/api/plane/app/ai/tools/vendors.py`** — новый файл:

```python
from plane.app.ai.tools.registry import register_tool
from plane.db.models import Vendor

@register_tool(
    name="list_vendors",
    description="Search vendors in the workspace directory. Use when user asks to find a vendor, photographer, caterer, etc.",
    input_schema={
        "type": "object",
        "properties": {
            "category": {"type": "string", "enum": ["photography","video","catering","sound_lighting","decor","mc","transport","other"]},
            "max_price": {"type": "number", "description": "Maximum price_max value"},
            "min_rating": {"type": "integer", "description": "Minimum rating (1-5)"},
            "name_contains": {"type": "string"},
        },
    },
)
def list_vendors(workspace_slug: str, user, category=None, max_price=None, min_rating=None, name_contains=None, **kwargs):
    qs = Vendor.objects.filter(workspace__slug=workspace_slug)
    if category: qs = qs.filter(category=category)
    if max_price: qs = qs.filter(price_max__lte=max_price)
    if min_rating: qs = qs.filter(rating__gte=min_rating)
    if name_contains: qs = qs.filter(name__icontains=name_contains)
    return {"vendors": [{"id": str(v.id), "name": v.name, "category": v.category,
        "contact_email": v.contact_email, "contact_phone": v.contact_phone,
        "price_min": str(v.price_min) if v.price_min else None,
        "price_max": str(v.price_max) if v.price_max else None,
        "rating": v.rating, "url": f"/vendors/{v.id}"} for v in qs[:20]]}

@register_tool(
    name="create_vendor",
    description="Add a new vendor to the workspace directory.",
    input_schema={
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "category": {"type": "string"},
            "contact_name": {"type": "string"},
            "contact_email": {"type": "string"},
            "contact_phone": {"type": "string"},
            "price_min": {"type": "number"},
            "price_max": {"type": "number"},
            "notes": {"type": "string"},
        },
        "required": ["name", "category"],
    },
)
def create_vendor(workspace_slug: str, user, name: str, category: str, **kwargs):
    from plane.db.models import Workspace
    workspace = Workspace.objects.get(slug=workspace_slug)
    vendor = Vendor.objects.create(workspace=workspace, created_by=user, updated_by=user,
        name=name, category=category,
        contact_name=kwargs.get("contact_name"), contact_email=kwargs.get("contact_email"),
        contact_phone=kwargs.get("contact_phone"), price_min=kwargs.get("price_min"),
        price_max=kwargs.get("price_max"), notes=kwargs.get("notes", ""))
    return {"id": str(vendor.id), "name": vendor.name, "message": f"Vendor '{name}' created"}

@register_tool(
    name="update_vendor",
    description="Update an existing vendor in the directory.",
    input_schema={
        "type": "object",
        "properties": {
            "vendor_id": {"type": "string"},
            "name": {"type": "string"},
            "contact_email": {"type": "string"},
            "contact_phone": {"type": "string"},
            "price_min": {"type": "number"},
            "price_max": {"type": "number"},
            "rating": {"type": "integer"},
            "notes": {"type": "string"},
        },
        "required": ["vendor_id"],
    },
)
def update_vendor(workspace_slug: str, user, vendor_id: str, **kwargs):
    vendor = Vendor.objects.get(id=vendor_id, workspace__slug=workspace_slug)
    for field in ["name","contact_name","contact_email","contact_phone","price_min","price_max","rating","notes"]:
        if field in kwargs and kwargs[field] is not None:
            setattr(vendor, field, kwargs[field])
    vendor.updated_by = user
    vendor.save()
    return {"id": str(vendor.id), "message": f"Vendor '{vendor.name}' updated"}

@register_tool(
    name="delete_vendor",
    description="Delete a vendor from the directory.",
    input_schema={"type": "object", "properties": {"vendor_id": {"type": "string"}}, "required": ["vendor_id"]},
)
def delete_vendor(workspace_slug: str, user, vendor_id: str, **kwargs):
    vendor = Vendor.objects.get(id=vendor_id, workspace__slug=workspace_slug)
    name = vendor.name
    vendor.delete()
    return {"message": f"Vendor '{name}' deleted"}
```

**`apps/api/plane/app/ai/tools/__init__.py`** — добавить:

```python
import plane.app.ai.tools.vendors  # noqa: F401
```

**`apps/api/plane/app/ai/tools/issues.py`** — обновить `create_issue`:
добавить параметр `label_names: list[str] = []` и логику auto-create меток по имени.

---

### 6. Frontend — TypeScript тип

**`packages/types/src/vendors/vendor.ts`** — новый файл:

```typescript
export type TVendorCategory =
  | "photography"
  | "video"
  | "catering"
  | "sound_lighting"
  | "decor"
  | "mc"
  | "transport"
  | "other";

export interface IVendor {
  id: string;
  workspace: string;
  name: string;
  category: TVendorCategory;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  rating?: number | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IVendorMap {
  [id: string]: IVendor;
}
```

**`packages/types/src/index.ts`** — добавить экспорт.

### 7. Frontend — сервис

**`apps/web/core/services/vendor/vendor.service.ts`** — новый файл, по паттерну `project.service.ts`:

```typescript
import { APIService } from "../api.service";
import { API_BASE_URL } from "@plane/constants";
import type { IVendor } from "@plane/types";

export class VendorService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  getVendors(workspaceSlug: string, params?: Record<string, string>): Promise<IVendor[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/vendors/`, { params })
      .then((r) => r?.data)
      .catch((e) => {
        throw e?.response;
      });
  }
  createVendor(workspaceSlug: string, data: Partial<IVendor>): Promise<IVendor> {
    return this.post(`/api/workspaces/${workspaceSlug}/vendors/`, data)
      .then((r) => r?.data)
      .catch((e) => {
        throw e?.response;
      });
  }
  updateVendor(workspaceSlug: string, vendorId: string, data: Partial<IVendor>): Promise<IVendor> {
    return this.patch(`/api/workspaces/${workspaceSlug}/vendors/${vendorId}/`, data)
      .then((r) => r?.data)
      .catch((e) => {
        throw e?.response;
      });
  }
  deleteVendor(workspaceSlug: string, vendorId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/vendors/${vendorId}/`)
      .then((r) => r?.data)
      .catch((e) => {
        throw e?.response;
      });
  }
}
```

### 8. Frontend — MobX стор

**`apps/web/core/store/vendor/vendor.store.ts`** — новый файл, по паттерну `project.store.ts`:

```typescript
import { makeObservable, observable, action, runInAction, computed } from "mobx";
import { VendorService } from "@/services/vendor/vendor.service";
import type { IVendor, IVendorMap } from "@plane/types";

const vendorService = new VendorService();

export interface IVendorStore {
  vendorMap: IVendorMap;
  loader: boolean;
  fetchVendors: (workspaceSlug: string, params?: Record<string, string>) => Promise<IVendor[]>;
  createVendor: (workspaceSlug: string, data: Partial<IVendor>) => Promise<IVendor>;
  updateVendor: (workspaceSlug: string, vendorId: string, data: Partial<IVendor>) => Promise<IVendor>;
  deleteVendor: (workspaceSlug: string, vendorId: string) => Promise<void>;
  getVendorById: (vendorId: string) => IVendor | undefined;
  vendorIds: string[];
}

export class VendorStore implements IVendorStore {
  vendorMap: IVendorMap = {};
  loader: boolean = false;

  constructor() {
    makeObservable(this, {
      vendorMap: observable,
      loader: observable.ref,
      fetchVendors: action,
      createVendor: action,
      updateVendor: action,
      deleteVendor: action,
      vendorIds: computed,
    });
  }

  get vendorIds() {
    return Object.keys(this.vendorMap);
  }

  getVendorById = (vendorId: string) => this.vendorMap[vendorId];

  fetchVendors = async (workspaceSlug: string, params?: Record<string, string>) => {
    runInAction(() => {
      this.loader = true;
    });
    const vendors = await vendorService.getVendors(workspaceSlug, params);
    runInAction(() => {
      vendors.forEach((v) => {
        this.vendorMap[v.id] = v;
      });
      this.loader = false;
    });
    return vendors;
  };

  createVendor = async (workspaceSlug: string, data: Partial<IVendor>) => {
    const vendor = await vendorService.createVendor(workspaceSlug, data);
    runInAction(() => {
      this.vendorMap[vendor.id] = vendor;
    });
    return vendor;
  };

  updateVendor = async (workspaceSlug: string, vendorId: string, data: Partial<IVendor>) => {
    const vendor = await vendorService.updateVendor(workspaceSlug, vendorId, data);
    runInAction(() => {
      this.vendorMap[vendorId] = { ...this.vendorMap[vendorId], ...vendor };
    });
    return vendor;
  };

  deleteVendor = async (workspaceSlug: string, vendorId: string) => {
    await vendorService.deleteVendor(workspaceSlug, vendorId);
    runInAction(() => {
      delete this.vendorMap[vendorId];
    });
  };
}
```

**`apps/web/core/store/root.store.ts`** — добавить `vendor: new VendorStore()`.

**`apps/web/core/hooks/store/use-vendor.ts`** — новый файл:

```typescript
import { useContext } from "react";
import { StoreContext } from "@/lib/store-context";
export const useVendor = () => useContext(StoreContext).vendor;
```

### 9. Frontend — страница вендоров

**Маршрут:** `apps/web/app/(all)/[workspaceSlug]/(vendors)/vendors/(list)/page.tsx`

По паттерну `apps/web/app/(all)/[workspaceSlug]/(projects)/projects/(list)/page.tsx`.

**Компоненты:**

```
apps/web/core/components/vendor/
├── root.tsx              — fetches vendors, renders filters + card-list
├── card-list.tsx         — grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
├── card.tsx              — карточка вендора (аналог ProjectCard)
├── create-update-modal.tsx — форма создания/редактирования
└── delete-modal.tsx      — подтверждение удаления
```

**Карточка вендора (`card.tsx`):**

- Название + категория (иконка)
- Рейтинг ⭐⭐⭐⭐⭐
- Ценник: `40 000 – 60 000 ₽`
- Контакт: email, телефон
- Кнопки: редактировать, скопировать ссылку, удалить

**Фильтры в `root.tsx`:**

- Поиск по имени (текстовый input)
- Категория (select)
- Максимальная цена (number input)
- Минимальный рейтинг (select 1–5)

### 10. Frontend — сайдбар

**`packages/constants/src/workspace.ts`** — добавить `vendors` в `WORKSPACE_SIDEBAR_DYNAMIC_NAVIGATION_ITEMS_LINKS`:

```typescript
vendors: {
  key: "vendors",
  labelTranslationKey: "vendors",
  href: `/vendors/`,
  access: [EUserWorkspaceRoles.ADMIN, EUserWorkspaceRoles.MEMBER],
  highlight: (pathname: string, url: string) => pathname.includes("/vendors"),
},
```

---

## Файлы для создания/изменения

### Новые файлы

| Файл                                                                   | Описание          |
| ---------------------------------------------------------------------- | ----------------- |
| `apps/api/plane/db/models/vendor.py`                                   | Модель Vendor     |
| `apps/api/plane/db/migrations/0123_vendor.py`                          | Миграция          |
| `apps/api/plane/app/serializers/vendor.py`                             | Сериализатор      |
| `apps/api/plane/app/views/vendor.py`                                   | ViewSet           |
| `apps/api/plane/app/urls/vendor.py`                                    | URL маршруты      |
| `apps/api/plane/app/ai/tools/vendors.py`                               | AI инструменты    |
| `packages/types/src/vendors/vendor.ts`                                 | TypeScript типы   |
| `apps/web/core/services/vendor/vendor.service.ts`                      | API сервис        |
| `apps/web/core/store/vendor/vendor.store.ts`                           | MobX стор         |
| `apps/web/core/hooks/store/use-vendor.ts`                              | Хук               |
| `apps/web/core/components/vendor/root.tsx`                             | Главный компонент |
| `apps/web/core/components/vendor/card-list.tsx`                        | Грид карточек     |
| `apps/web/core/components/vendor/card.tsx`                             | Карточка вендора  |
| `apps/web/core/components/vendor/create-update-modal.tsx`              | Форма             |
| `apps/web/core/components/vendor/delete-modal.tsx`                     | Удаление          |
| `apps/web/app/(all)/[workspaceSlug]/(vendors)/vendors/(list)/page.tsx` | Страница          |

### Изменяемые файлы

| Файл                                         | Изменение                    |
| -------------------------------------------- | ---------------------------- |
| `apps/api/plane/db/models/__init__.py`       | + импорт Vendor              |
| `apps/api/plane/app/serializers/__init__.py` | + импорт VendorSerializer    |
| `apps/api/plane/app/urls/__init__.py`        | + vendor_urls                |
| `apps/api/plane/app/ai/tools/__init__.py`    | + импорт vendors             |
| `apps/api/plane/app/ai/tools/issues.py`      | + label_names в create_issue |
| `packages/types/src/index.ts`                | + экспорт TVendor, IVendor   |
| `apps/web/core/store/root.store.ts`          | + vendor store               |
| `packages/constants/src/workspace.ts`        | + vendors в сайдбар          |

---

## Проверка после реализации

1. `docker exec eventcraft-team-api python manage.py migrate` — миграция прошла
2. Создать вендора через API: `POST /api/workspaces/{slug}/vendors/`
3. Страница `/vendors` открывается, карточки отображаются
4. Фильтры работают (category, max_price)
5. AI: "Найди фотографа" → `list_vendors` возвращает результаты
6. AI: "Добавь фотографа Иванова" → `create_vendor` создаёт запись
7. AI: "Найди фотографа и создай задачу в проекте X" → задача создана с меткой, ссылкой, бюджетом
