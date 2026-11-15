import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import {
  assertCategoryMutationAllowed,
  assertEventOwnership,
  type CategorySnapshot,
  validateEventStateTransition,
} from '@/services/event.service';

describe('T-301: Event & Ticket Category Business Rules (BR-001, BR-004, BR-010, ST-001..ST-003)', () => {
  describe('Ownership Guard (FORBIDDEN_OWNERSHIP)', () => {
    it('allows owner and rejects different organizer', () => {
      expect(() => assertEventOwnership('org-1', 'org-1')).not.toThrow();
      expect(() => assertEventOwnership('org-1', 'org-2')).toThrowError(AppError);
      try {
        assertEventOwnership('org-1', 'org-2');
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN_OWNERSHIP');
        expect((err as AppError).statusCode).toBe(403);
      }
    });
  });

  describe('Protected Ticket Category Rules (BR-010)', () => {
    const activeCat: CategorySnapshot = {
      id: 'cat-1',
      name: 'VIP Pass',
      price: 350000,
      totalQuota: 50,
      soldCount: 10,
      reservedCount: 5,
    };

    it('rejects deleting a category that already has sold or reserved tickets', () => {
      expect(() => assertCategoryMutationAllowed(activeCat, null, true)).toThrowError(
        AppError
      );
      try {
        assertCategoryMutationAllowed(activeCat, null, true);
      } catch (err) {
        expect((err as AppError).code).toBe('CATEGORY_LOCKED');
      }
    });

    it('rejects changing price when soldCount + reservedCount > 0 (BR-010)', () => {
      expect(() =>
        assertCategoryMutationAllowed(
          activeCat,
          {
            name: 'VIP Pass',
            price: 400000,
            totalQuota: 50,
            maxPerOrder: 5,
            saleStartAt: '2026-11-01T00:00:00.000Z',
            saleEndAt: '2026-12-01T00:00:00.000Z',
          },
          false
        )
      ).toThrowError(AppError);
    });

    it('allows increasing totalQuota but rejects lowering below soldCount + reservedCount', () => {
      expect(() =>
        assertCategoryMutationAllowed(
          activeCat,
          {
            name: 'VIP Pass',
            price: 350000,
            totalQuota: 80,
            maxPerOrder: 5,
            saleStartAt: '2026-11-01T00:00:00.000Z',
            saleEndAt: '2026-12-01T00:00:00.000Z',
          },
          false
        )
      ).not.toThrow();

      expect(() =>
        assertCategoryMutationAllowed(
          activeCat,
          {
            name: 'VIP Pass',
            price: 350000,
            totalQuota: 12, // < 10 sold + 5 reserved
            maxPerOrder: 5,
            saleStartAt: '2026-11-01T00:00:00.000Z',
            saleEndAt: '2026-12-01T00:00:00.000Z',
          },
          false
        )
      ).toThrowError(AppError);
    });
  });

  describe('Event State Machine Transitions (ST-001, ST-002, ST-003)', () => {
    const now = new Date('2026-11-14T12:00:00.000Z');
    const futureEnd = new Date('2026-12-10T16:00:00.000Z');

    it('ST-001: transitions DRAFT -> PUBLISHED only when >= 1 category and future endTime', () => {
      expect(
        validateEventStateTransition('DRAFT', 'PUBLISH', {
          categoryCount: 2,
          endTime: futureEnd,
          totalSoldTickets: 0,
          now,
        })
      ).toBe('PUBLISHED');

      expect(() =>
        validateEventStateTransition('DRAFT', 'PUBLISH', {
          categoryCount: 0,
          endTime: futureEnd,
          totalSoldTickets: 0,
          now,
        })
      ).toThrowError(AppError);
    });

    it('ST-002 & ST-003: enforces valid transitions and blocks cancelling when tickets are already PAID', () => {
      expect(
        validateEventStateTransition('PUBLISHED', 'END', {
          categoryCount: 1,
          endTime: futureEnd,
          totalSoldTickets: 10,
          now,
        })
      ).toBe('ENDED');

      expect(
        validateEventStateTransition('PUBLISHED', 'CANCEL', {
          categoryCount: 1,
          endTime: futureEnd,
          totalSoldTickets: 0,
          now,
        })
      ).toBe('CANCELLED');

      expect(() =>
        validateEventStateTransition('PUBLISHED', 'CANCEL', {
          categoryCount: 1,
          endTime: futureEnd,
          totalSoldTickets: 1,
          now,
        })
      ).toThrowError(AppError);
    });
  });
});
