import assert from "node:assert/strict";
import test from "node:test";
import { canAccessInvoice } from "../lib/invoice-access";

const base = { isAdmin: false, customerId: "customer-a", confirmationToken: "token-a" };

test("invoice access permits an admin", () => assert.equal(canAccessInvoice({ ...base, isAdmin: true }), true));
test("invoice access permits the owning customer", () => assert.equal(canAccessInvoice({ ...base, userId: "customer-a" }), true));
test("invoice access permits the guest confirmation token", () => assert.equal(canAccessInvoice({ ...base, token: "token-a" }), true));
test("invoice access rejects another customer", () => assert.equal(canAccessInvoice({ ...base, userId: "customer-b" }), false));
test("invoice access rejects an invalid guest token", () => assert.equal(canAccessInvoice({ ...base, token: "token-b" }), false));
