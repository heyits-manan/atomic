# Atomic ⚛️

A high-performance, double-entry ledger and payment gateway built with Node.js, TypeScript, and raw PostgreSQL.

**The Goal:** To build a financial system that guarantees **ACID compliance** and **Idempotency** at scale, without relying on ORMs.

## 🚀 Key Features

* **Double-Entry Ledger:** Every transaction is recorded as a debit/credit pair. The system is always zero-sum.
* **Idempotency Keys:** Prevents double-spending even if the network fails during a request.
* **Optimistic Locking:** Uses `SELECT ... FOR UPDATE` to handle race conditions and high concurrency.
* **Raw SQL:** No ORMs. All database interactions are written in raw SQL for maximum control over transaction isolation levels.
* **Queue-Based Webhooks:** (Coming Soon) Reliable event delivery using Redis and BullMQ.

## 🛠 Tech Stack

* **Runtime:** Node.js (Express)
* **Language:** TypeScript
* **Database:** PostgreSQL (pg driver)
* **Migrations:** node-pg-migrate
* **Architecture:** Clean Architecture (Services, Repositories, Controllers)

## 📦 Getting Started

```bash
# 1. Clone the repo
git clone [https://github.com/yourusername/atomic.git](https://github.com/yourusername/atomic.git)

# 2. Start Infrastructure
docker-compose up -d

# 3. Run Migrations
npm run migrate:up

# 4. Start Server
npm run dev
