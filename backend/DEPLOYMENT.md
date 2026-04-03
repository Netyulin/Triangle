# Triangle Portal Backend Deployment Guide

## Delivery checklist

The backend is ready to hand off when all checks below pass:

- `npm install`
- `npm run seed`
- `npm run start`
- `GET /health`
- `npm run smoke`
- `npm run regression`

## Local startup

1. Install Node.js 18 or newer.
2. Run:

```bash
npm install
```

3. Prepare `.env`:

```env
PORT=3001
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=triangle-portal-cms-secret-key-2024
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
```

4. Build demo data:

```bash
npm run seed
```

5. Start the backend:

```bash
npm run start
```

6. Verify:

- `http://localhost:3001/`
- `http://localhost:3001/health`
- `http://localhost:3001/api-docs`

## Release steps

1. Upload code and `.env`.
2. Run `npm install`.
3. Run the database migration command for the target database.
4. Run `npm run seed` only when demo data is needed.
5. Start the service with PM2, NSSM, Docker, or the target platform runtime.
6. Check `/health`.
7. Run smoke validation against the deployed URL:

```bash
BASE_URL=http://your-host:3001 node scripts/smoke.test.mjs
```

## Current database strategy

- Local development stays on SQLite so a fresh machine can run the backend immediately.
- Prisma is already the data layer, so the API code can be kept when moving to PostgreSQL.

## PostgreSQL migration plan

Recommended path:

1. Provision PostgreSQL 15 or newer.
2. Create database `triangle_portal` and a dedicated user.
3. Update `.env`:

```env
DATABASE_URL="postgresql://triangle_user:strong_password@127.0.0.1:5432/triangle_portal?schema=public"
```

4. Change `prisma/schema.prisma` datasource provider from `sqlite` to `postgresql`.
5. Remove the SQLite adapter from `src/utils/prisma.js` and initialize `PrismaClient` directly.
6. Generate and apply migrations:

```bash
npx prisma migrate dev --name init-postgres
```

7. Rebuild seed data:

```bash
npm run seed
```

8. Start the service and rerun:

```bash
npm run smoke
npm run regression
```

## PostgreSQL cutover notes

- Back up the SQLite file before the first migration.
- If existing production data must be kept, export SQLite data and import it into PostgreSQL before switching traffic.
- Keep the SQLite deployment available for rollback until health checks and smoke tests pass.
- Update network rules and connection limits before opening access.

## Suggested production env

```env
PORT=3001
DATABASE_URL="postgresql://triangle_user:strong_password@db-host:5432/triangle_portal?schema=public"
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
```

## Post-release checks

- `GET /health`
- Admin login
- `GET /api/apps`
- `GET /api/posts`
- `GET /api/admin/stats`
- `GET /api/requests/admin/list`

## Rollback

1. Stop the new service.
2. Restore the previous environment variables.
3. Restore the previous database snapshot.
4. Start the last known good backend build.
5. Check `/health` and admin login again.
