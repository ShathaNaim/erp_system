# ERP System

This project is a web-based Enterprise Resource Planning (ERP) system designed to help manufacturing businesses manage their core operations in one place. It connects sales, procurement, inventory, and production workflows through a modern user interface and a REST API.

## Main Features

- User authentication and role-based employee access
- Customer and sales order management
- Supplier, raw material, and purchase order management
- Material receipt tracking
- Warehouse stock, stock lot, and inventory movement tracking
- Finished product and bill of materials (BOM) management
- Production order planning and progress tracking
- Machine scheduling and production planning
- Material consumption and production output tracking

## Technology Stack

- **Frontend:** Next.js, React, TypeScript, and Tailwind CSS
- **Backend:** Django and Django REST Framework
- **Authentication:** JSON Web Tokens (JWT)
- **Database:** PostgreSQL

## Demo Account

Create or refresh the read-only demo account with:

```bash
cd backend/core
python manage.py create_demo_account
```

The sign-in page can then fill in the public demo credentials. The demo user can
view every ERP module, but API requests that create, update, or delete data are
blocked.

## Local Development

Local backend settings can be placed in `backend/core/.env.local`. This
git-ignored file overrides `backend/core/.env` on the developer's machine, so
deployment database, host, and security settings remain unchanged.
