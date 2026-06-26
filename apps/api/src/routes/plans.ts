import { Router, type IRouter } from 'express';
import { asyncHandler } from '../lib/async-handler.js';

export const plansRouter: IRouter = Router();

const PLANS = [
  {
    tier: 'solo', name: 'Solo', priceMonthly: 6, tagline: 'For getting started',
    commissionPct: 0, highlighted: false,
    features: ['Unlimited photo storage', '1 portfolio site', 'Community access', 'Basic print store', 'Portfolix subdomain'],
  },
  {
    tier: 'studio', name: 'Studio', priceMonthly: 14, tagline: 'Most popular',
    commissionPct: 8, highlighted: true,
    features: ['Everything in Solo', 'Custom domain', 'Client galleries + proofing', 'Lower print commission — 8%', 'Sales & visitor analytics'],
  },
  {
    tier: 'atelier', name: 'Atelier', priceMonthly: 29, tagline: 'For full-time pros',
    commissionPct: 4, highlighted: false,
    features: ['Everything in Studio', 'Lowest commission — 4%', 'Unlimited client galleries', 'Priority support', 'Second-shooter seats'],
  },
];

const PRINT_OPTIONS = [
  { id: '1', size: '8 × 10″', kind: 'Lustre print', basePrice: 18, framed: false },
  { id: '2', size: '16 × 20″', kind: 'Archival matte', basePrice: 45, framed: false },
  { id: '3', size: '24 × 36″', kind: 'Gallery giclée', basePrice: 120, framed: false },
  { id: '4', size: 'Framed 18 × 24″', kind: 'Oak frame · museum glass', basePrice: 210, framed: true },
];

plansRouter.get('/plans', asyncHandler(async (_req, res) => {
  res.json({ data: PLANS, error: null });
}));

plansRouter.get('/print-options', asyncHandler(async (_req, res) => {
  res.json({ data: PRINT_OPTIONS, error: null });
}));

plansRouter.post('/checkout/print', asyncHandler(async (_req, res) => {
  res.json({ data: { url: 'https://checkout.stripe.com/stub' }, error: null });
}));

plansRouter.post('/checkout/subscribe', asyncHandler(async (_req, res) => {
  res.json({ data: { url: 'https://checkout.stripe.com/stub' }, error: null });
}));
