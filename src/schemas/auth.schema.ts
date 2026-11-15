import { z } from 'zod';

/**
 * Skema validasi registrasi publik (EP-001).
 * Registrasi publik hanya membuat akun BUYER; upgrade ke ORGANIZER melalui pengajuan & ACC Admin.
 */
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter.')
    .max(120, 'Nama maksimal 120 karakter.'),
  email: z
    .string()
    .trim()
    .email('Format email tidak valid.')
    .max(255)
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter.')
    .max(100, 'Password maksimal 100 karakter.'),
  role: z.literal('BUYER').default('BUYER'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Skema validasi login (EP-002).
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Format email tidak valid.')
    .transform((val) => val.toLowerCase()),
  password: z.string().min(1, 'Password wajib diisi.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
