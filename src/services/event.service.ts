import type { EventStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { assertIntegerRupiah } from '@/lib/format';
import {
  createEventSchema,
  type TicketCategoryInput,
  updateEventPatchSchema,
} from '@/schemas/event.schema';

export interface CategorySnapshot {
  id: string;
  name: string;
  price: number;
  totalQuota: number;
  soldCount: number;
  reservedCount: number;
}

export function slugifyEventTitle(title: string, suffix?: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 180);
  const rand = suffix ?? Math.random().toString(36).slice(2, 8);
  return `${base}-${rand}`;
}

/**
 * Memastikan hanya pemilik acara (ORGANIZER) yang dapat mengubah/melihat data privat acara.
 */
export function assertEventOwnership(eventOrganizerId: string, actorUserId: string): void {
  if (eventOrganizerId !== actorUserId) {
    throw new AppError(
      'FORBIDDEN_OWNERSHIP',
      'Anda tidak memiliki hak akses terhadap acara milik penyelenggara lain.'
    );
  }
}

/**
 * Menegakkan BR-010: Kategori tiket yang sudah memiliki transaksi (soldCount > 0 atau reservedCount > 0)
 * dilarang dihapus, dilarang diubah harganya, dan kuotanya tidak boleh diturunkan di bawah soldCount + reservedCount.
 */
export function assertCategoryMutationAllowed(
  existing: CategorySnapshot,
  proposedUpdate?: TicketCategoryInput | null,
  isDeleting = false
): void {
  const committedQuota = existing.soldCount + existing.reservedCount;

  if (isDeleting) {
    if (committedQuota > 0) {
      throw new AppError(
        'CATEGORY_LOCKED',
        `Kategori "${existing.name}" tidak dapat dihapus karena sudah memiliki tiket terjual atau sedang dipesan (BR-010).`
      );
    }
    return;
  }

  if (!proposedUpdate) {
    return;
  }

  assertIntegerRupiah(proposedUpdate.price);

  if (committedQuota > 0 && proposedUpdate.price !== existing.price) {
    throw new AppError(
      'CATEGORY_LOCKED',
      `Harga kategori "${existing.name}" terkunci karena sudah ada transaksi aktif (BR-010).`
    );
  }

  if (proposedUpdate.totalQuota < committedQuota) {
    throw new AppError(
      'CATEGORY_LOCKED',
      `Kuota total kategori "${existing.name}" (${proposedUpdate.totalQuota}) tidak boleh lebih kecil dari jumlah tiket terjual + ditahan (${committedQuota}) (BR-010).`
    );
  }
}

/**
 * Memvalidasi transisi state Event sesuai ST-001, ST-002, ST-003.
 */
export function validateEventStateTransition(
  currentStatus: EventStatus,
  action: 'PUBLISH' | 'END' | 'CANCEL',
  context: {
    categoryCount: number;
    endTime: Date;
    totalSoldTickets: number;
    now?: Date;
  }
): EventStatus {
  const now = context.now ?? new Date();

  if (action === 'PUBLISH') {
    // ST-001: DRAFT -> PUBLISHED
    if (currentStatus !== 'DRAFT') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        `Acara berstatus ${currentStatus} tidak dapat dipublikasikan ulang melalui ST-001.`
      );
    }
    if (context.categoryCount < 1) {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        'Acara wajib memiliki minimal 1 kategori tiket sebelum dipublikasikan (ST-001).'
      );
    }
    if (context.endTime.getTime() <= now.getTime()) {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        'Waktu selesai acara harus berada di masa depan untuk dipublikasikan (ST-001).'
      );
    }
    return 'PUBLISHED';
  }

  if (action === 'END') {
    // ST-002: PUBLISHED -> ENDED
    if (currentStatus !== 'PUBLISHED') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        'Hanya acara berstatus PUBLISHED yang dapat diakhiri (ST-002).'
      );
    }
    return 'ENDED';
  }

  // ST-003: DRAFT / PUBLISHED -> CANCELLED
  if (currentStatus !== 'DRAFT' && currentStatus !== 'PUBLISHED') {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `Acara berstatus ${currentStatus} tidak dapat dibatalkan (ST-003).`
    );
  }
  if (context.totalSoldTickets > 0) {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      'Acara yang sudah memiliki tiket lunas (PAID) tidak dapat dibatalkan secara otomatis di MVP (ST-003).'
    );
  }
  return 'CANCELLED';
}

export async function listPublicEvents(params?: {
  q?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.min(50, Math.max(1, params?.limit ?? 12));
  const skip = (page - 1) * limit;
  const q = params?.q?.trim();

  const whereClause = {
    status: 'PUBLISHED' as const,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { location: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where: whereClause,
      include: {
        organizer: { select: { id: true, name: true } },
        categories: {
          orderBy: { price: 'asc' },
        },
      },
      orderBy: { startTime: 'asc' },
      skip,
      take: limit,
    }),
    prisma.event.count({ where: whereClause }),
  ]);

  const formatted = events.map((ev) => {
    const startingPrice =
      ev.categories.length > 0
        ? Math.min(...ev.categories.map((c) => c.price))
        : 0;
    const totalAvailableQuota = ev.categories.reduce(
      (acc, c) => acc + Math.max(0, c.totalQuota - c.soldCount - c.reservedCount),
      0
    );

    return {
      id: ev.id,
      title: ev.title,
      slug: ev.slug,
      description: ev.description,
      bannerUrl: ev.bannerUrl,
      location: ev.location,
      startTime: ev.startTime.toISOString(),
      endTime: ev.endTime.toISOString(),
      status: ev.status,
      organizerName: ev.organizer.name,
      startingPrice,
      totalAvailableQuota,
      categoryCount: ev.categories.length,
    };
  });

  return {
    items: formatted,
    meta: { page, limit, total },
  };
}

export async function getPublicEventBySlug(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      organizer: { select: { id: true, name: true } },
      categories: { orderBy: { price: 'asc' } },
    },
  });

  if (!event || event.status !== 'PUBLISHED') {
    throw new AppError('NOT_FOUND', 'Acara tidak ditemukan atau belum dipublikasikan.');
  }

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    description: event.description,
    bannerUrl: event.bannerUrl,
    location: event.location,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    status: event.status,
    organizer: event.organizer,
    categories: event.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      price: cat.price,
      totalQuota: cat.totalQuota,
      soldCount: cat.soldCount,
      reservedCount: cat.reservedCount,
      availableQuota: Math.max(0, cat.totalQuota - cat.soldCount - cat.reservedCount),
      maxPerOrder: cat.maxPerOrder,
      saleStartAt: cat.saleStartAt.toISOString(),
      saleEndAt: cat.saleEndAt.toISOString(),
    })),
  };
}

export async function listOrganizerEvents(organizerId: string) {
  const events = await prisma.event.findMany({
    where: { organizerId },
    include: {
      categories: { orderBy: { price: 'asc' } },
      _count: { select: { tickets: true, orders: true, staffAssignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    slug: ev.slug,
    description: ev.description,
    bannerUrl: ev.bannerUrl,
    location: ev.location,
    startTime: ev.startTime.toISOString(),
    endTime: ev.endTime.toISOString(),
    status: ev.status,
    moderationNote: ev.moderationNote,
    categories: ev.categories.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      totalQuota: c.totalQuota,
      soldCount: c.soldCount,
      reservedCount: c.reservedCount,
      maxPerOrder: c.maxPerOrder,
      saleStartAt: c.saleStartAt.toISOString(),
      saleEndAt: c.saleEndAt.toISOString(),
    })),
    counts: ev._count,
  }));
}

export async function createOrganizerEvent(organizerId: string, rawInput: unknown) {
  const input = createEventSchema.parse(rawInput);
  const slug = slugifyEventTitle(input.title);

  const created = await prisma.event.create({
    data: {
      organizerId,
      title: input.title,
      slug,
      description: input.description,
      bannerUrl: input.bannerUrl || null,
      location: input.location,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      status: 'DRAFT',
      categories: {
        create: input.categories.map((cat) => ({
          name: cat.name,
          price: assertIntegerRupiah(cat.price),
          totalQuota: cat.totalQuota,
          maxPerOrder: cat.maxPerOrder,
          saleStartAt: new Date(cat.saleStartAt),
          saleEndAt: new Date(cat.saleEndAt),
        })),
      },
    },
    include: { categories: true },
  });

  return created;
}

export async function updateOrganizerEvent(
  eventId: string,
  organizerId: string,
  rawInput: unknown
) {
  const input = updateEventPatchSchema.parse(rawInput);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.event.findUnique({
      where: { id: eventId },
      include: { categories: true },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Acara tidak ditemukan.');
    }

    assertEventOwnership(existing.organizerId, organizerId);

    // 1. Proses penghapusan kategori jika ada (cek BR-010)
    if (input.deletedCategoryIds && input.deletedCategoryIds.length > 0) {
      for (const delId of input.deletedCategoryIds) {
        const targetCat = existing.categories.find((c) => c.id === delId);
        if (targetCat) {
          assertCategoryMutationAllowed(targetCat, null, true);
          await tx.ticketCategory.delete({ where: { id: delId } });
        }
      }
    }

    // 2. Proses penambahan / pembaruan kategori (cek BR-010)
    if (input.categories) {
      for (const catInput of input.categories) {
        if (catInput.id) {
          const currentCat = existing.categories.find((c) => c.id === catInput.id);
          if (!currentCat) {
            throw new AppError('NOT_FOUND', 'Kategori tiket tidak ditemukan.');
          }
          assertCategoryMutationAllowed(currentCat, catInput, false);
          await tx.ticketCategory.update({
            where: { id: catInput.id },
            data: {
              name: catInput.name,
              price: catInput.price,
              totalQuota: catInput.totalQuota,
              maxPerOrder: catInput.maxPerOrder,
              saleStartAt: new Date(catInput.saleStartAt),
              saleEndAt: new Date(catInput.saleEndAt),
            },
          });
        } else {
          await tx.ticketCategory.create({
            data: {
              eventId: existing.id,
              name: catInput.name,
              price: assertIntegerRupiah(catInput.price),
              totalQuota: catInput.totalQuota,
              maxPerOrder: catInput.maxPerOrder,
              saleStartAt: new Date(catInput.saleStartAt),
              saleEndAt: new Date(catInput.saleEndAt),
            },
          });
        }
      }
    }

    const refreshedCategories = await tx.ticketCategory.findMany({
      where: { eventId: existing.id },
    });

    // 3. Proses transisi status jika ada action (ST-001, ST-002, ST-003)
    let nextStatus: EventStatus = existing.status;
    if (input.action) {
      const totalSoldTickets = refreshedCategories.reduce((s, c) => s + c.soldCount, 0);
      const effectiveEndTime = input.endTime ? new Date(input.endTime) : existing.endTime;

      nextStatus = validateEventStateTransition(existing.status, input.action, {
        categoryCount: refreshedCategories.length,
        endTime: effectiveEndTime,
        totalSoldTickets,
      });

      if (nextStatus === 'CANCELLED') {
        // Batalkan semua reservasi PENDING dan void tiket sesuai ST-003 & ST-013
        await tx.order.updateMany({
          where: { eventId: existing.id, status: 'PENDING' },
          data: { status: 'CANCELLED', version: { increment: 1 } },
        });
        await tx.ticketCategory.updateMany({
          where: { eventId: existing.id },
          data: { reservedCount: 0 },
        });
        await tx.ticket.updateMany({
          where: { eventId: existing.id, status: 'VALID' },
          data: { status: 'VOID' },
        });
      }
    }

    const updated = await tx.event.update({
      where: { id: existing.id },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl || null } : {}),
        ...(input.location ? { location: input.location } : {}),
        ...(input.startTime ? { startTime: new Date(input.startTime) } : {}),
        ...(input.endTime ? { endTime: new Date(input.endTime) } : {}),
        status: nextStatus,
      },
      include: { categories: { orderBy: { price: 'asc' } } },
    });

    return updated;
  });
}
