import type { Plan, PrintOption } from '../../lib/types.js';

export const PLANS: Plan[] = [
  {
    tier: 'solo',
    name: 'Solo',
    priceMonthly: 600,
    tagline: 'For getting started',
    commissionPct: 12,
    trialDays: 14,
    features: [
      'Unlimited photo storage',
      '1 portfolio site',
      'Community access',
      'Basic print store',
      'Blueflutes subdomain',
    ],
    highlighted: false,
  },
  {
    tier: 'studio',
    name: 'Studio',
    priceMonthly: 1400,
    tagline: 'Most popular',
    commissionPct: 8,
    trialDays: 14,
    features: [
      'Everything in Solo',
      'Custom domain',
      'Client galleries + proofing',
      'Lower print commission — 8%',
      'Sales & visitor analytics',
    ],
    highlighted: true,
  },
  {
    tier: 'atelier',
    name: 'Atelier',
    priceMonthly: 2900,
    tagline: 'For full-time pros',
    commissionPct: 4,
    trialDays: 14,
    features: [
      'Everything in Studio',
      'Lowest commission — 4%',
      'Unlimited client galleries',
      'Priority support',
      'Second-shooter seats',
    ],
    highlighted: false,
  },
];

export const PRINT_OPTIONS: PrintOption[] = [
  { id: '1', size: '8 × 10″', kind: 'Lustre print', basePrice: 1800 },
  { id: '2', size: '16 × 20″', kind: 'Archival matte', basePrice: 4500 },
  { id: '3', size: '24 × 36″', kind: 'Gallery giclée', basePrice: 12000 },
  { id: '4', size: 'Framed 18 × 24″', kind: 'Oak frame · museum glass', basePrice: 21000, framed: true },
];
