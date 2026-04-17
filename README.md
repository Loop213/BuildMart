# BuildMart

Modern full-stack eCommerce platform for construction materials like sand, rod, and cement.

## Stack

- Frontend: React + Vite + Tailwind CSS + SWR
- Backend: Node.js + Express + MongoDB + JWT
- Auth: JWT with role-based access

## Workspaces

- `client` - storefront, customer dashboard, admin panel
- `server` - REST API, auth, product/order/coupon/payment logic

## Run

1. Copy `server/.env.example` to `server/.env`
2. Copy `client/.env.example` to `client/.env`
3. Install dependencies with `npm install`
4. Start both apps with `npm run dev`

## Core Features

- Customer auth and role-based admin access
- Product catalog with search, filters, stock visibility, and pagination
- Cart, coupon application, order placement, COD and UPI flows
- Partial payment tracking with payment timeline and dues summary
- Customer dashboard with invoice printing
- Admin dashboard for sales, products, orders, coupons, and UPI management

