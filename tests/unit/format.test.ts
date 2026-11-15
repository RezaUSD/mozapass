import { describe, expect, it } from 'vitest';
import {
  assertIntegerRupiah,
  formatCountdownMmSs,
  formatEventDateTime,
  formatRupiah,
  toUtcIsoString,
} from '@/lib/format';

describe('T-101: Format Utilities (BR-001 & NFR-005)', () => {
  describe('assertIntegerRupiah & formatRupiah (BR-001)', () => {
    it('formats valid integer Rupiah amounts properly', () => {
      expect(formatRupiah(150000)).toBe('Rp 150.000');
      expect(formatRupiah(0)).toBe('Rp 0');
      expect(formatRupiah(0, true)).toBe('Gratis');
    });

    it('rejects float or negative numbers per BR-001', () => {
      expect(() => assertIntegerRupiah(15000.5)).toThrow();
      expect(() => assertIntegerRupiah(-100)).toThrow();
      expect(() => formatRupiah(99.99)).toThrow();
    });
  });

  describe('toUtcIsoString & formatEventDateTime (NFR-005)', () => {
    it('converts Date and ISO strings to strict UTC ISO 8601 format', () => {
      const date = new Date('2026-11-14T11:00:00+07:00');
      expect(toUtcIsoString(date)).toBe('2026-11-14T04:00:00.000Z');
      expect(toUtcIsoString('2026-12-10T11:00:00.000Z')).toBe('2026-12-10T11:00:00.000Z');
    });

    it('rejects invalid date inputs', () => {
      expect(() => toUtcIsoString('not-a-date')).toThrow();
      expect(() => formatEventDateTime('invalid')).toThrow();
    });
  });

  describe('formatCountdownMmSs (BR-003)', () => {
    it('formats remaining hold timer seconds into MM:SS', () => {
      expect(formatCountdownMmSs(900)).toBe('15:00');
      expect(formatCountdownMmSs(65)).toBe('01:05');
      expect(formatCountdownMmSs(0)).toBe('00:00');
      expect(formatCountdownMmSs(-15)).toBe('00:00');
    });
  });
});
