import { createHmac } from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole, EventStatus, OrderStatus, TicketStatus } from '@prisma/client';

/**
 * Guard keamanan wajib: menolak eksekusi seed demo di lingkungan production.
 */
export function assertSeedAllowed(nodeEnv: string | undefined = process.env.NODE_ENV): void {
  if (nodeEnv === 'production') {
    throw new Error('DILARANG menjalankan seed demo di production!');
  }
}

export function computeDemoQrSignature(
  ticketCode: string,
  eventId: string,
  secret: string
): string {
  return createHmac('sha256', secret)
    .update(`${ticketCode}:${eventId}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
}

export async function runSeed(prismaClient?: PrismaClient): Promise<void> {
  assertSeedAllowed(process.env.NODE_ENV);

  const db = prismaClient ?? new PrismaClient();
  const demoPassword = process.env.SEED_DEMO_PASSWORD || 'MozaPass2026!';
  const qrSecret = process.env.QR_SECRET_KEY || 'replace-with-32-char-random-qr-hmac-secret';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  try {
    // 1. 4 Akun Demo (1 per Role)
    const buyer = await db.user.upsert({
      where: { email: 'buyer@mozapass.local' },
      update: { name: 'Budi Pembeli', role: UserRole.BUYER, passwordHash },
      create: {
        email: 'buyer@mozapass.local',
        name: 'Budi Pembeli',
        role: UserRole.BUYER,
        passwordHash,
      },
    });

    const organizer = await db.user.upsert({
      where: { email: 'organizer@mozapass.local' },
      update: { name: 'Raka Penyelenggara', role: UserRole.ORGANIZER, passwordHash },
      create: {
        email: 'organizer@mozapass.local',
        name: 'Raka Penyelenggara',
        role: UserRole.ORGANIZER,
        passwordHash,
      },
    });

    const staff = await db.user.upsert({
      where: { email: 'staff@mozapass.local' },
      update: { name: 'Dina Panitia Scanner', role: UserRole.STAFF, passwordHash },
      create: {
        email: 'staff@mozapass.local',
        name: 'Dina Panitia Scanner',
        role: UserRole.STAFF,
        passwordHash,
      },
    });

    await db.user.upsert({
      where: { email: 'admin@mozapass.local' },
      update: { name: 'Admin Mozapass', role: UserRole.ADMIN, passwordHash },
      create: {
        email: 'admin@mozapass.local',
        name: 'Admin Mozapass',
        role: UserRole.ADMIN,
        passwordHash,
      },
    });

    // 2. 3 Acara PUBLISHED (untuk 3 kartu pastel Learnify UI) + 1 Acara DRAFT
    const event1Start = new Date('2026-12-10T11:00:00.000Z');
    const event1End = new Date('2026-12-10T16:00:00.000Z');
    const saleStart = new Date('2026-11-01T00:00:00.000Z');
    const saleEnd = new Date('2026-12-10T10:00:00.000Z');

    const event1 = await db.event.upsert({
      where: { slug: 'mozapass-tech-music-fest-2026' },
      update: {
        title: 'Mozapass Tech & Music Fest 2026',
        bannerUrl: '/images/banners/tech-music-fest.jpg',
        status: EventStatus.PUBLISHED,
        organizerId: organizer.id,
      },
      create: {
        organizerId: organizer.id,
        title: 'Mozapass Tech & Music Fest 2026',
        slug: 'mozapass-tech-music-fest-2026',
        description:
          'Festival teknologi dan musik tahunan dengan sistem tiket anti-oversell dan QR bertanda tangan kriptografis.',
        bannerUrl: '/images/banners/tech-music-fest.jpg',
        location: 'Jakarta Convention Center (JCC), Senayan',
        startTime: event1Start,
        endTime: event1End,
        status: EventStatus.PUBLISHED,
      },
    });

    const event2 = await db.event.upsert({
      where: { slug: 'cloud-distributed-systems-summit-2026' },
      update: {
        title: 'Cloud & Distributed Systems Summit 2026',
        bannerUrl: '/images/banners/cloud-summit.svg',
        status: EventStatus.PUBLISHED,
        organizerId: organizer.id,
      },
      create: {
        organizerId: organizer.id,
        title: 'Cloud & Distributed Systems Summit 2026',
        slug: 'cloud-distributed-systems-summit-2026',
        description:
          'Konferensi arsitektur sistem terdistribusi, database lock anti-oversell, dan keamanan webhook kriptografis.',
        bannerUrl: '/images/banners/cloud-summit.svg',
        location: 'ICE BSD Hall 3, Tangerang',
        startTime: new Date('2026-12-14T02:00:00.000Z'),
        endTime: new Date('2026-12-14T10:00:00.000Z'),
        status: EventStatus.PUBLISHED,
      },
    });

    const event3 = await db.event.upsert({
      where: { slug: 'public-speaking-creative-leadership-forum' },
      update: {
        title: 'Public Speaking & Creative Leadership Forum',
        bannerUrl: '/images/banners/leadership-forum.jpg',
        status: EventStatus.PUBLISHED,
        organizerId: organizer.id,
      },
      create: {
        organizerId: organizer.id,
        title: 'Public Speaking & Creative Leadership Forum',
        slug: 'public-speaking-creative-leadership-forum',
        description:
          'Workshop kepemimpinan kreatif, komunikasi publik, dan manajemen komunitas modern.',
        bannerUrl: '/images/banners/leadership-forum.jpg',
        location: 'Ciputra Artpreneur Theater, Jakarta Selatan',
        startTime: new Date('2026-12-18T03:00:00.000Z'),
        endTime: new Date('2026-12-18T09:00:00.000Z'),
        status: EventStatus.PUBLISHED,
      },
    });

    await db.event.upsert({
      where: { slug: 'design-system-workshop-jakarta' },
      update: {
        title: 'Design System Workshop Jakarta',
        bannerUrl: '/images/banners/design-workshop.jpg',
        status: EventStatus.DRAFT,
        organizerId: organizer.id,
      },
      create: {
        organizerId: organizer.id,
        title: 'Design System Workshop Jakarta',
        slug: 'design-system-workshop-jakarta',
        description: 'Workshop intensif membangun Bento UI Design System bebas AI-Slop.',
        bannerUrl: '/images/banners/design-workshop.jpg',
        location: 'Kuningan City Ballroom, Jakarta Selatan',
        startTime: new Date('2026-12-20T02:00:00.000Z'),
        endTime: new Date('2026-12-20T09:00:00.000Z'),
        status: EventStatus.DRAFT,
      },
    });

    // 3. Penugasan Staff ke Acara 1 & 2
    await db.eventStaff.upsert({
      where: {
        eventId_userId: {
          eventId: event1.id,
          userId: staff.id,
        },
      },
      update: {},
      create: {
        eventId: event1.id,
        userId: staff.id,
      },
    });

    await db.eventStaff.upsert({
      where: {
        eventId_userId: {
          eventId: event2.id,
          userId: staff.id,
        },
      },
      update: {},
      create: {
        eventId: event2.id,
        userId: staff.id,
      },
    });

    // 4. Kategori Tiket Acara 1
    const existingCategories = await db.ticketCategory.findMany({
      where: { eventId: event1.id },
    });

    let earlyBirdCategory = existingCategories.find((c) => c.name === 'Early Bird');
    if (!earlyBirdCategory) {
      earlyBirdCategory = await db.ticketCategory.create({
        data: {
          eventId: event1.id,
          name: 'Early Bird',
          price: 150000,
          totalQuota: 100,
          soldCount: 1,
          reservedCount: 0,
          maxPerOrder: 5,
          saleStartAt: saleStart,
          saleEndAt: saleEnd,
        },
      });
    }

    const vipCategory = existingCategories.find((c) => c.name === 'VIP Pass');
    if (!vipCategory) {
      await db.ticketCategory.create({
        data: {
          eventId: event1.id,
          name: 'VIP Pass',
          price: 350000,
          totalQuota: 50,
          soldCount: 0,
          reservedCount: 0,
          maxPerOrder: 4,
          saleStartAt: saleStart,
          saleEndAt: saleEnd,
        },
      });
    }

    // Kategori Tiket Acara 2 & 3
    const existingCat2 = await db.ticketCategory.findMany({
      where: { eventId: event2.id },
    });
    if (existingCat2.length === 0) {
      await db.ticketCategory.create({
        data: {
          eventId: event2.id,
          name: 'Conference Pass',
          price: 250000,
          totalQuota: 120,
          soldCount: 12,
          reservedCount: 0,
          maxPerOrder: 5,
          saleStartAt: saleStart,
          saleEndAt: saleEnd,
        },
      });
    }

    const existingCat3 = await db.ticketCategory.findMany({
      where: { eventId: event3.id },
    });
    if (existingCat3.length === 0) {
      await db.ticketCategory.create({
        data: {
          eventId: event3.id,
          name: 'Workshop Seat',
          price: 180000,
          totalQuota: 80,
          soldCount: 18,
          reservedCount: 0,
          maxPerOrder: 4,
          saleStartAt: saleStart,
          saleEndAt: saleEnd,
        },
      });
    }

    // 5. 1 Order PAID + 1 Tiket VALID Siap Scan (MOZA-DEMO-0001)
    const demoOrder = await db.order.upsert({
      where: { orderCode: 'ORD-DEMO-0001' },
      update: {},
      create: {
        orderCode: 'ORD-DEMO-0001',
        buyerId: buyer.id,
        eventId: event1.id,
        ticketCategoryId: earlyBirdCategory.id,
        quantity: 1,
        unitPrice: 150000,
        totalAmount: 150000,
        status: OrderStatus.PAID,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        paidAt: new Date(),
        version: 2,
      },
    });

    const ticketCode = 'MOZA-DEMO-0001';
    const qrSignature = computeDemoQrSignature(ticketCode, event1.id, qrSecret);

    await db.ticket.upsert({
      where: { ticketCode },
      update: {
        qrSignature,
      },
      create: {
        ticketCode,
        orderId: demoOrder.id,
        eventId: event1.id,
        ticketCategoryId: earlyBirdCategory.id,
        attendeeName: buyer.name,
        attendeeEmail: buyer.email,
        qrSignature,
        status: TicketStatus.VALID,
      },
    });
  } finally {
    if (!prismaClient) {
      await db.$disconnect();
    }
  }
}

if (require.main === module) {
  runSeed().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
