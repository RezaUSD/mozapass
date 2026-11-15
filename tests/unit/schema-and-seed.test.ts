import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { assertSeedAllowed, computeDemoQrSignature } from '../../prisma/seed';

describe('T-102: Database Schema, Anti-Oversell SQL Constraints & Safe Seed', () => {
  describe('Production Guard on Seed (NFR-004)', () => {
    it('blocks running seed when NODE_ENV is production', () => {
      expect(() => assertSeedAllowed('production')).toThrow(
        'DILARANG menjalankan seed demo di production!'
      );
    });

    it('allows running seed in development and test environments', () => {
      expect(() => assertSeedAllowed('development')).not.toThrow();
      expect(() => assertSeedAllowed('test')).not.toThrow();
    });
  });

  describe('Demo Ticket HMAC-SHA256 Signature (BR-006)', () => {
    it('produces deterministic 16-character uppercase hex HMAC signature', () => {
      const sig1 = computeDemoQrSignature('MOZA-DEMO-0001', 'event-uuid-1', 'secret-key-123');
      const sig2 = computeDemoQrSignature('MOZA-DEMO-0001', 'event-uuid-1', 'secret-key-123');
      const sigOtherEvent = computeDemoQrSignature(
        'MOZA-DEMO-0001',
        'event-uuid-2',
        'secret-key-123'
      );

      expect(sig1).toHaveLength(16);
      expect(sig1).toMatch(/^[0-9A-F]{16}$/);
      expect(sig1).toBe(sig2);
      expect(sig1).not.toBe(sigOtherEvent);
    });
  });

  describe('PostgreSQL Anti-Oversell Constraints in Migration SQL (BR-002, BR-011)', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../prisma/migrations/0001_init/migration.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    it('defines non-negative and no-oversell CHECK constraints on ticket_categories', () => {
      expect(sql).toContain('chk_ticket_categories_quota_non_negative');
      expect(sql).toContain('"sold_count" >= 0 AND "reserved_count" >= 0 AND "total_quota" > 0');
      expect(sql).toContain('chk_ticket_categories_no_oversell');
      expect(sql).toContain('"sold_count" + "reserved_count" <= "total_quota"');
    });

    it('defines positive values CHECK constraint on orders (BR-001)', () => {
      expect(sql).toContain('chk_orders_positive_values');
      expect(sql).toContain(
        '"quantity" > 0 AND "unit_price" >= 0 AND "total_amount" = "quantity" * "unit_price"'
      );
    });

    it('defines partial unique index for max 1 active PENDING order per buyer per event (BR-011)', () => {
      expect(sql).toContain('idx_orders_one_active_pending_per_buyer_event');
      expect(sql).toContain('ON "orders" ("buyer_id", "event_id")');
      expect(sql).toContain('WHERE "status" = \'PENDING\'');
    });
  });
});
