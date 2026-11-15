import { z } from 'zod';

/**
 * Skema validasi checkout reservasi tiket (EP-007, A-010: 1 order = 1 kategori tiket).
 */
export const createOrderSchema = z.object({
  eventId: z.string().uuid('Format eventId tidak valid.'),
  ticketCategoryId: z.string().uuid('Format ticketCategoryId tidak valid.'),
  quantity: z
    .number()
    .int('Jumlah tiket wajib bilangan bulat.')
    .min(1, 'Minimal pembelian 1 tiket.')
    .max(10, 'Maksimal pembelian 10 tiket per transaksi.'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
