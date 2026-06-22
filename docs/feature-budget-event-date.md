# Фича: Бюджет и дата мероприятия

## Концепция

Каждый проект-мероприятие получает:

- `event_date` — дата проведения (отображается на карточке)
- `budget_total` — общий бюджет, задаётся вручную

Каждая задача получает:

- `budget_estimated` — плановая стоимость
- `budget_actual` — фактическая стоимость (только ручной ввод, не автоматически)

На карточке проекта отображается:

```
📅 14 июня 2026
💰 план 145 000 ₽  •  факт 48 000 ₽  •  ░░░░████ 32%
```

Сводка проекта считается на фронтенде:

- Запланировано = сумма `budget_estimated` всех задач проекта
- Потрачено = сумма `budget_actual` всех задач проекта
- Остаток по плану = `budget_total` − Запланировано
- Остаток по факту = `budget_total` − Потрачено
- Если Запланировано > `budget_total` → предупреждение о превышении бюджета

### Граничные случаи

- Задача без стоимости — не влияет на сводку (считается нулём)
- Бюджет проекта не задан — строку бюджета на карточке не показываем
- Дата не задана — строку даты на карточке не показываем
- Задача удалена — её стоимость убирается из суммы

---

## План реализации

### 1. Backend — модели

**`apps/api/plane/db/models/project.py`** — добавить после поля `timezone` (~строка 117):

```python
event_date = models.DateField(null=True, blank=True, verbose_name="Event Date")
budget_total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Budget Total")
```

**`apps/api/plane/db/models/issue.py`** — добавить после поля `target_date` (~строка 146):

```python
budget_estimated = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Budget Estimated")
budget_actual = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Budget Actual")
```

### 2. Backend — миграция

Создать `apps/api/plane/db/migrations/0122_budget_event_date.py`:

```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("db", "0121_alter_estimate_type")]
    operations = [
        migrations.AddField(model_name="project", name="event_date",
            field=models.DateField(blank=True, null=True, verbose_name="Event Date")),
        migrations.AddField(model_name="project", name="budget_total",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, verbose_name="Budget Total")),
        migrations.AddField(model_name="issue", name="budget_estimated",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, verbose_name="Budget Estimated")),
        migrations.AddField(model_name="issue", name="budget_actual",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, verbose_name="Budget Actual")),
    ]
```

### 3. Backend — сериализаторы

- `apps/api/plane/app/serializers/project.py` — `ProjectSerializer` использует `fields = "__all__"` → изменений не требует
- `apps/api/plane/api/serializers/project.py` — `ProjectCreateSerializer` и `ProjectUpdateSerializer` имеют явные списки полей → добавить `"event_date"` и `"budget_total"` в `Meta.fields`
- Issue-сериализаторы принимают все поля модели → изменений не требует

### 4. Frontend — TypeScript типы

**`packages/types/src/project/projects.ts`** — добавить в `IProject`:

```typescript
event_date?: string | null;
budget_total?: number | string | null;
```

**`packages/types/src/issues/issue.ts`** — добавить в `TBaseIssue`:

```typescript
budget_estimated?: number | string | null;
budget_actual?: number | string | null;
```

### 5. Frontend — форма создания проекта

**`apps/web/core/components/project/create/common-attributes.tsx`**

Добавить два поля после поля `description`:

- `event_date` — date input, label "Дата мероприятия"
- `budget_total` — number input, label "Бюджет (₽)"

Оба опциональны. Использовать `Controller` из react-hook-form по аналогии с существующими полями.

### 6. Frontend — форма редактирования проекта

**`apps/web/core/components/project/form.tsx`**

Добавить те же два поля рядом с `description` / `network`.

### 7. Frontend — карточка проекта

**`apps/web/core/components/project/card.tsx`**

В нижней секции (после description, перед members) добавить:

- Строку с датой: `📅 {renderFormattedDate(project.event_date)}` — только если `event_date` задан
- Компонент `BudgetBar` — только если `budget_total` задан:
  - Получает задачи проекта из стора
  - Считает `estimated = sum(budget_estimated)`, `actual = sum(budget_actual)`
  - Отображает: `💰 план {estimated} ₽  •  факт {actual} ₽`
  - Прогресс-бар: `actual / budget_total * 100%`
  - Предупреждение если `estimated > budget_total`

> Внимание: текущая нижняя секция имеет фиксированную высоту `h-[104px]` — нужно увеличить или сделать высоту `min-h-[104px]`.

### 8. Frontend — детальная форма задачи

Найти компонент детали задачи (`apps/web/core/components/issues/issue-detail/`) и добавить два поля:

- "Плановая стоимость" → `budget_estimated`
- "Фактическая стоимость" → `budget_actual`

Паттерн: аналогично полю `target_date` — числовой input, опциональный.

---

## Файлы для изменения

| Файл                                                            | Изменение            |
| --------------------------------------------------------------- | -------------------- |
| `apps/api/plane/db/models/project.py`                           | +2 поля              |
| `apps/api/plane/db/models/issue.py`                             | +2 поля              |
| `apps/api/plane/db/migrations/0122_budget_event_date.py`        | новый файл           |
| `apps/api/plane/api/serializers/project.py`                     | добавить поля в Meta |
| `packages/types/src/project/projects.ts`                        | +2 типа              |
| `packages/types/src/issues/issue.ts`                            | +2 типа              |
| `apps/web/core/components/project/create/common-attributes.tsx` | +2 поля в форму      |
| `apps/web/core/components/project/form.tsx`                     | +2 поля в форму      |
| `apps/web/core/components/project/card.tsx`                     | дата + budget bar    |
| Issue detail компонент (уточнить путь)                          | +2 поля              |

---

## Проверка после реализации

1. `docker exec eventcraft-team-api python manage.py migrate` — миграция прошла
2. Создать проект с бюджетом и датой → API возвращает поля
3. Карточка проекта показывает дату и бюджет-бар
4. Создать задачу с `budget_estimated` → сумма отображается на карточке
5. Заполнить `budget_actual` → факт меняется
6. Установить `budget_estimated` > `budget_total` → видно предупреждение
