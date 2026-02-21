# Gyan Setu Portal - Complete System Build

This repository contains a fresh end-to-end implementation of the **Gyan Setu** portal with:

- Student scholarship flow (3-step form + payment gate)
- Hidden Admin ERP at `/management-login`
- Supabase/PostgreSQL cloud persistence over REST APIs
- Bulk assignment via CSV
- Server-side export to Excel-compatible format
- Server-side pagination (50 rows/page)

## 1) Setup

1. Copy env template:
   ```bash
   cp .env.example .env
   ```
2. Fill `.env` with your Supabase project values.
3. Create DB schema in Supabase SQL editor:
   - Run: `sql/schema.sql`
4. Create a public Supabase storage bucket named `student-documents` (or set `SUPABASE_BUCKET`).

## 2) Run

```bash
npm install
npm run dev
```

Open:
- Student app: `http://localhost:3000/`
- Admin ERP: `http://localhost:3000/management-login`

## 3) Architecture mapping to request

### Cloud backend integration
- All reads/writes are via Supabase REST endpoints (`/rest/v1`) and storage REST endpoint (`/storage/v1/object`).
- No student records are stored only in browser state; final source of truth is cloud DB.

### Student module
- 3-step form:
  - Personal details
  - Academic details (School/Board/Class)
  - Document upload + payment
- Mock payment gate:
  - Submit button remains disabled until mock payment succeeds.

### Admin ERP module
- Hidden route: `/management-login`
- Bulk management:
  - CSV input `id,roll_number,exam_center`
  - Updates thousands of records through server API loops.
- Data export:
  - Server creates Excel-compatible `.xls` (Spreadsheet XML) for large exports.
- Result toggle:
  - Global publish switch persisted in `system_settings` table.

### Security & performance
- Admin list API uses **server-side pagination** of exactly 50 records per page.
- Persistent storage is cloud-first via Supabase; browser only acts as client.

## 4) API overview

- `POST /api/student/register`
- `GET /api/admin/students?page=1`
- `POST /api/admin/bulk-assign`
- `POST /api/admin/result-toggle`
- `GET /api/admin/export`

