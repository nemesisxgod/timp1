# Лабораторная работа 4: SPA + REST API + JWT

Тема: **физическая безопасность** (контроль объектов, КПП и инцидентов).

## 1. Проектирование базы данных

### 1.1. Выбор СУБД
- Выбрана **реляционная СУБД PostgreSQL**.
- Причины: явные связи между сущностями, транзакционность, удобная фильтрация/пагинация, контроль целостности FK.

### 1.2. Сущности и связи
- `users`: учетные записи и авторизация.
- `facilities`: охраняемые объекты.
- `checkpoints`: контрольные точки (КПП/двери/зоны) на объекте.
- `incidents`: инциденты безопасности на объекте.

Связи:
- `facilities (1) -> (N) checkpoints`
- `facilities (1) -> (N) incidents`
- `users (1) -> (N) incidents` (автор сообщения об инциденте)

### 1.3. Поля для авторизации
- `users.username` (unique)
- `users.email` (unique)
- `users.password_hash` (bcrypt)
- `users.role`

## 2. REST API (Flask)

Базовый URL: `http://localhost:5000/api`

### 2.1. Эндпоинты и статусы

Аутентификация:
- `POST /auth/register` -> `201`, `400`, `409`
- `POST /auth/login` -> `200`, `401`
- `POST /auth/refresh` -> `200`, `401`, `404`
- `GET /auth/me` -> `200`, `401`, `404`

Объекты (facilities):
- `GET /facilities` -> `200`
- `POST /facilities` -> `201`, `400`, `409`
- `GET /facilities/{id}` -> `200`, `404`
- `PUT /facilities/{id}` -> `200`, `404`
- `DELETE /facilities/{id}` -> `204`, `404`

КПП (checkpoints):
- `GET /checkpoints` -> `200`
- `POST /checkpoints` -> `201`, `400`, `404`
- `PUT /checkpoints/{id}` -> `200`, `404`
- `DELETE /checkpoints/{id}` -> `204`, `404`

Инциденты (incidents):
- `GET /incidents` -> `200`
- `POST /incidents` -> `201`, `400`, `404`
- `GET /incidents/{id}` -> `200`, `404`
- `PUT /incidents/{id}` -> `200`, `404`
- `DELETE /incidents/{id}` -> `204`, `404`

Служебный:
- `GET /health` -> `200`

### 2.2. JSON (запрос/ответ)

Пример регистрации:
```json
POST /api/auth/register
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "12345678"
}
```

Пример логина:
```json
POST /api/auth/login
{
  "username": "admin",
  "password": "12345678"
}
```

Успешный ответ:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "operator"
  }
}
```

### 2.3. Ошибки и логирование
- Единый формат ошибок: `{"error": "message"}`
- Корректные HTTP-статусы `4xx/5xx`.
- Логирование ошибок в Flask (`app.logger`), включая необработанные исключения.

## 3. SPA-приложение (React + Vite)

### 3.1. Роутинг
- `/login`
- `/register`
- `/dashboard`
- `/profile`
- `/facilities`
- `/incidents`

### 3.2. Интеграция auth
- Формы входа/регистрации.
- Хранение `access_token`/`refresh_token` в `localStorage`.
- Защищенные маршруты через `ProtectedRoute`.
- Axios interceptor обрабатывает `401/403` и перенаправляет на `/login`.

### 3.3. Работа с данными
- Списки сущностей и детали в интерфейсе.
- Добавление/обновление/удаление через API.
- Пагинация и фильтрация реализованы на backend через `page`, `per_page`, фильтры `status`, `severity`, `security_level`.

## 4. Безопасность

### 4.1. JWT и хранение токена
- В проекте: `localStorage` (проще для учебной работы).
- Сравнение:
  - `localStorage`: удобен, но уязвим к XSS.
  - `httpOnly cookie`: токен недоступен JS, лучше защита от XSS-кражи, но требуется CSRF-защита.
- Продление сессии: `refresh token` через `/auth/refresh`.

### 4.2. CSRF/XSS
- XSS-риски снижаются экранированием данных, запретом `dangerouslySetInnerHTML`, валидацией ввода.
- Для cookie-подхода рекомендовано: `httpOnly`, `Secure`, `SameSite=Lax/Strict`.

### 4.3. Пароли
- Используется `bcrypt` для хеширования паролей.
- Пароли в БД не хранятся в открытом виде.

## 5. Деплой и интеграция

### 5.1. Локальный запуск

Backend:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

### 5.2. Docker
```bash
docker compose up --build
```

### 5.3. CI/CD
- Добавлен GitHub Actions workflow: `.github/workflows/ci.yml`.
- При `push/pull_request` запускаются backend-тесты (`pytest`).

## Структура проекта

```text
backend/
  app/
    __init__.py
    config.py
    extensions.py
    models.py
    routes.py
    schemas.py
  tests/
    test_auth_and_facilities.py
  requirements.txt
  run.py
frontend/
  src/
    App.jsx
    AuthContext.jsx
    ProtectedRoute.jsx
    api.js
    main.jsx
    styles.css
docker-compose.yml
```

## Демонстрационные сценарии
1. Регистрация пользователя -> вход -> переход в dashboard.
2. Создание объекта безопасности (facility).
3. Создание инцидента и изменение статуса.
4. Попытка доступа к защищенному роуту без токена -> редирект на `/login`.

## Скриншоты
- Добавьте в отчет скриншоты страниц:
  - логин/регистрация,
  - dashboard,
  - список объектов,
  - список инцидентов с фильтрацией,
  - пример ошибки API.
