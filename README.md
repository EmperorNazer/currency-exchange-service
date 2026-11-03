# Сервис расчёта курсов валют (Currency Exchange Service)

Full-stack веб-приложение для расчёта курсов обмена валют на основе биржевого стакана **Rapira API** с поддержкой индивидуальных пользовательских настроек, точной финансовой математики и кеширования.

## Стек технологий

- **Backend:** NestJS, TypeScript, TypeORM, PostgreSQL, Passport JWT, Axios, Decimal.js, Class-Validator, Swagger (OpenAPI), Jest.
- **Frontend:** React, TypeScript, Vite, Material UI (MUI), Formik, Yup, TanStack React Query, Axios, Nginx.
- **Инфраструктура:** Docker, Docker Compose.

---

## Быстрый запуск (Docker Compose)

Для запуска всего проекта (PostgreSQL + Backend + Frontend/Nginx) выполните в корневой директории:

```bash
docker compose up --build

После запуска сервисы будут доступны по следующим адресам:
- **Веб-интерфейс (Frontend):** [http://localhost:5173](http://localhost:5173)
- **Документация API (Swagger UI):** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Backend API (базовый URL):** [http://localhost:3000/api](http://localhost:3000/api)