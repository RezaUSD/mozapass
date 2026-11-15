import { z } from 'zod';

export const ticketCategoryInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, 'Nama kategori minimal 2 karakter.').max(120),
    price: z
      .number()
      .int('Harga wajib bilangan bulat Rupiah penuh (BR-001).')
      .min(0, 'Harga tidak boleh negatif (BR-001).'),
    totalQuota: z
      .number()
      .int('Kuota wajib bilangan bulat.')
      .min(1, 'Kuota total minimal 1 tiket.'),
    maxPerOrder: z
      .number()
      .int()
      .min(1, 'Maksimal pembelian per order minimal 1.')
      .max(10, 'Maksimal pembelian per order paling banyak 10 (A-002).')
      .default(5),
    saleStartAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
    saleEndAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
  })
  .refine(
    (data) => new Date(data.saleEndAt).getTime() > new Date(data.saleStartAt).getTime(),
    {
      message: 'Waktu selesai penjualan harus setelah waktu mulai penjualan (BR-004).',
      path: ['saleEndAt'],
    }
  );

export type TicketCategoryInput = z.infer<typeof ticketCategoryInputSchema>;

export const createEventSchema = z
  .object({
    title: z.string().trim().min(3, 'Judul acara minimal 3 karakter.').max(200),
    description: z.string().trim().min(10, 'Deskripsi minimal 10 karakter.'),
    bannerUrl: z.string().url('URL banner tidak valid.').optional().nullable().or(z.literal('')),
    location: z.string().trim().min(3, 'Lokasi acara wajib diisi.').max(255),
    startTime: z.string().min(10, 'Waktu mulai wajib diisi.'),
    endTime: z.string().min(10, 'Waktu selesai wajib diisi.'),
    categories: z
      .array(ticketCategoryInputSchema)
      .min(1, 'Minimal harus ada 1 kategori tiket.'),
  })
  .refine(
    (data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
    {
      message: 'Waktu selesai acara harus setelah waktu mulai acara.',
      path: ['endTime'],
    }
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventPatchSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(10).optional(),
  bannerUrl: z.string().optional().nullable(),
  location: z.string().trim().min(3).max(255).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  action: z.enum(['PUBLISH', 'END', 'CANCEL']).optional(),
  categories: z.array(ticketCategoryInputSchema).optional(),
  deletedCategoryIds: z.array(z.string().uuid()).optional(),
});

export type UpdateEventPatchInput = z.infer<typeof updateEventPatchSchema>;
