/**
 * Utilitas pemformatan uang (Integer Rupiah - BR-001) dan waktu (UTC ISO 8601 - NFR-005)
 */

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Memastikan nilai uang adalah bilangan bulat (integer) non-negatif sesuai BR-001.
 */
export function assertIntegerRupiah(amount: number): number {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`Invalid Rupiah integer amount: ${amount}. Must be a non-negative integer.`);
  }
  return amount;
}

/**
 * Memformat nominal integer Rupiah ke tampilan UI (mis. 150000 -> "Rp 150.000" atau "Gratis" jika 0).
 */
export function formatRupiah(amount: number, showFreeLabel = false): string {
  assertIntegerRupiah(amount);
  if (amount === 0 && showFreeLabel) {
    return 'Gratis';
  }
  return idrFormatter.format(amount).replace(/\u00A0/g, ' ');
}

/**
 * Mengonversi objek Date atau string tanggal ke string UTC ISO 8601 standar (NFR-005).
 */
export function toUtcIsoString(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value provided to toUtcIsoString.');
  }
  return date.toISOString();
}

/**
 * Memformat waktu UTC ke tampilan tanggal & jam Indonesia (WIB / Asia/Jakarta default).
 */
export function formatEventDateTime(
  dateInput: Date | string,
  timeZone = 'Asia/Jakarta'
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value provided to formatEventDateTime.');
  }
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

/**
 * Memformat sisa detik hitung mundur reservasi (BR-003) ke format MM:SS (tabular-nums).
 */
export function formatCountdownMmSs(remainingSeconds: number): string {
  const clamped = Math.max(0, Math.floor(remainingSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
