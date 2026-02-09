# MVP: выездные медицинские вызовы

Минималистичное веб‑приложение для диспетчера: создание выездных вызовов,
назначение работников, контроль статусов.

## Стек

- Backend: Node.js + Express
- Database: SQLite + Prisma ORM
- Frontend: React + Vite

Выбор обусловлен простотой, надёжностью и низким порогом входа:
Express быстро поднимает API, SQLite не требует отдельного сервера,
Prisma даёт понятную схему и миграции, Vite быстро запускает UI.

## Запуск

Требования: Node.js 18+ (рекомендуется 20+).

### Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

API запустится на `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI будет доступен на `http://localhost:5173`.

## Данные и сиды

Сиды работников находятся в `backend/prisma/seed.js`.
База SQLite хранится в `backend/prisma/dev.db`.

## API

- `POST /auth/register` — регистрация
- `POST /auth/login` — вход
- `GET /workers` — список работников (ADMIN)
- `POST /calls` — создать вызов (ADMIN)
- `GET /calls` — получить все вызовы (ADMIN)
- `GET /calls/my` — получить свои вызовы (WORKER)
- `GET /calls/:id` — получить один вызов (ADMIN/WORKER)
- `PATCH /calls/:id` — редактировать вызов (ADMIN, любой статус)
- `PATCH /calls/:id/status` — изменить статус вызова (ADMIN/WORKER, в любой момент)
- `GET /calls/:id/history` — история изменений вызова (ADMIN/WORKER)

Дата/время хранятся в ISO формате.

## Аутентификация и роли

Роли:
- `ADMIN` — создает вызовы и назначает работников, видит все вызовы
- `WORKER` — видит только свои вызовы, меняет их статус

### Как создать администратора

Самый простой способ — зарегистрироваться через `/register` с ролью `ADMIN`.

Также есть сиды (используются при `npx prisma db seed`):

- admin@example.com / Password123! (ADMIN)
- worker1@example.com / Password123! (WORKER)
- worker2@example.com / Password123! (WORKER)

### Как войти под работником

Перейти на `/login` и использовать одного из пользователей с ролью `WORKER`
из сидов выше, либо зарегистрировать нового работника.
