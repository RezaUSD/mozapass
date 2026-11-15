import React from 'react';
import type { EventStatus, OrderStatus, TicketStatus } from '@prisma/client';

export interface BadgeTokenSpec {
  bgHex: string;
  textHex: string;
  className: string;
  label: string;
}

export const EVENT_STATUS_BADGE_MAP: Record<EventStatus, BadgeTokenSpec> = {
  DRAFT: {
    bgHex: '#ECECF2',
    textHex: '#4A4A5A',
    className: 'bg-[#ECECF2] text-[#4A4A5A]',
    label: 'Draf',
  },
  PUBLISHED: {
    bgHex: '#E6F9D5',
    textHex: '#1E5E2A',
    className: 'bg-[#E6F9D5] text-[#1E5E2A]',
    label: 'Tayang',
  },
  ENDED: {
    bgHex: '#EAE4FC',
    textHex: '#3F2E7E',
    className: 'bg-[#EAE4FC] text-[#3F2E7E]',
    label: 'Selesai',
  },
  CANCELLED: {
    bgHex: '#FDE2E4',
    textHex: '#8A1C24',
    className: 'bg-[#FDE2E4] text-[#8A1C24]',
    label: 'Dibatalkan',
  },
  SUSPENDED: {
    bgHex: '#181824',
    textHex: '#FDE2E4',
    className: 'bg-[#181824] text-[#FDE2E4]',
    label: 'Ditangguhkan Admin',
  },
};

export const ORDER_STATUS_BADGE_MAP: Record<OrderStatus, BadgeTokenSpec> = {
  PENDING: {
    bgHex: '#FCE8D5',
    textHex: '#7C3E14',
    className: 'bg-[#FCE8D5] text-[#7C3E14]',
    label: 'Menunggu Pembayaran',
  },
  PAID: {
    bgHex: '#E6F9D5',
    textHex: '#1E5E2A',
    className: 'bg-[#E6F9D5] text-[#1E5E2A]',
    label: 'Lunas',
  },
  EXPIRED: {
    bgHex: '#ECECF2',
    textHex: '#6E6E82',
    className: 'bg-[#ECECF2] text-[#6E6E82]',
    label: 'Kedaluwarsa',
  },
  CANCELLED: {
    bgHex: '#FDE2E4',
    textHex: '#8A1C24',
    className: 'bg-[#FDE2E4] text-[#8A1C24]',
    label: 'Dibatalkan',
  },
  FAILED: {
    bgHex: '#FDE2E4',
    textHex: '#8A1C24',
    className: 'bg-[#FDE2E4] text-[#8A1C24]',
    label: 'Pembayaran Gagal',
  },
};

export const TICKET_STATUS_BADGE_MAP: Record<TicketStatus, BadgeTokenSpec> = {
  VALID: {
    bgHex: '#D2F865',
    textHex: '#181824',
    className: 'bg-[#D2F865] text-[#181824]',
    label: 'Aktif / Siap Scan',
  },
  USED: {
    bgHex: '#EAE4FC',
    textHex: '#3F2E7E',
    className: 'bg-[#EAE4FC] text-[#3F2E7E]',
    label: 'Sudah Check-in',
  },
  VOID: {
    bgHex: '#FDE2E4',
    textHex: '#8A1C24',
    className: 'bg-[#FDE2E4] text-[#8A1C24]',
    label: 'Tidak Berlaku (Void)',
  },
};

export type StatusBadgeProps =
  | { type: 'event'; status: EventStatus; className?: string }
  | { type: 'order'; status: OrderStatus; className?: string }
  | { type: 'ticket'; status: TicketStatus; className?: string };

export function StatusBadge(props: StatusBadgeProps) {
  let spec: BadgeTokenSpec;

  if (props.type === 'event') {
    spec = EVENT_STATUS_BADGE_MAP[props.status];
  } else if (props.type === 'order') {
    spec = ORDER_STATUS_BADGE_MAP[props.status];
  } else {
    spec = TICKET_STATUS_BADGE_MAP[props.status];
  }

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border-[1.5px] border-[#181824] px-3 py-1 text-xs font-extrabold tracking-tight',
        spec.className,
        props.className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {spec.label}
    </span>
  );
}
