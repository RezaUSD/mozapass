import { z } from 'zod';

/**
 * Skema pengajuan upgrade akun BUYER menjadi ORGANIZER.
 */
export const applyOrganizerSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(3, 'Nama organisasi/penyelenggara minimal 3 karakter.')
    .max(150, 'Nama organisasi maksimal 150 karakter.'),
  reason: z
    .string()
    .trim()
    .min(10, 'Ceritakan rencana acara minimal 10 karakter.')
    .max(1000, 'Alasan pengajuan maksimal 1000 karakter.'),
});

export type ApplyOrganizerInput = z.infer<typeof applyOrganizerSchema>;

/**
 * Skema keputusan Admin terhadap pengajuan ORGANIZER.
 */
export const reviewOrganizerApplicationSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reviewNote: z
    .string()
    .trim()
    .max(500, 'Catatan peninjauan maksimal 500 karakter.')
    .optional()
    .nullable(),
});

export type ReviewOrganizerApplicationInput = z.infer<
  typeof reviewOrganizerApplicationSchema
>;
