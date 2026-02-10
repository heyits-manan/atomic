/**
 * Services — Business logic layer (Payments, Ledger, Accounts, etc.).
 *
 * Services orchestrate repositories and enforce domain rules.
 * They should never import Express types directly.
 *
 * Example:
 *   import * as paymentRepo from "../db/repositories/paymentRepo";
 *   export async function processPayment(data: CreatePaymentDTO) { ... }
 */
