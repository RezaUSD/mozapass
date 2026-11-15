import { z } from 'zod';

export const scannerCheckInSchema = z
  .object({
    eventId: z.string().uuid('ID acara tidak valid.'),
    qrPayload: z.string().trim().optional().nullable(),
    ticketCode: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) =>
      Boolean(data.qrPayload && data.qrPayload.length > 0) ||
      Boolean(data.ticketCode && data.ticketCode.length > 0),
    {
      message:
        'Wajib mengirimkan qrPayload (hasil scan kamera) atau ticketCode (input manual E-005).',
      path: ['qrPayload'],
    }
  );
