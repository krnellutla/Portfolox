import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { CartItem } from '@blueflutes/shared';
import { getCart, getShippingMethods, createCheckoutSession } from '../../api/commerce.js';
import { qk } from '../../lib/query-client.js';
import { ApiError } from '../../api/client.js';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NZ', name: 'New Zealand' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('US');
  const [shippingMethodId, setShippingMethodId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [payError, setPayError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const { data: cart } = useQuery({
    queryKey: qk.cart(),
    queryFn: getCart,
  });

  const { data: shippingMethods = [] } = useQuery({
    queryKey: qk.shippingMethods({ country }),
    queryFn: () => getShippingMethods({ country }),
  });

  const selectedShipping = shippingMethods.find((m) => m.id === shippingMethodId);
  const shipping = selectedShipping?.price ?? 0;
  const subtotal = cart?.subtotal ?? 0;
  const total = subtotal + shipping;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!email) errs['email'] = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs['email'] = 'Enter a valid email';
    if (!name) errs['name'] = 'Name is required';
    if (!line1) errs['line1'] = 'Address is required';
    if (!city) errs['city'] = 'City is required';
    if (!region) errs['region'] = 'Region is required';
    if (!postcode) errs['postcode'] = 'Postcode is required';
    if (!shippingMethodId) errs['shipping'] = 'Select a delivery method';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handlePay() {
    if (!validate()) return;
    setSubmitting(true);
    setPayError('');
    try {
      const result = await createCheckoutSession({
        email,
        shippingAddress: { name, line1, line2: line2 || undefined, city, region, postcode, country },
        shippingMethodId,
      });
      navigate(`/orders/${result.orderId}?token=${result.orderToken}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Payment failed. Please try again.';
      setPayError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = (field: string) =>
    `w-full px-3 py-2.5 rounded-[8px] border text-[14px] text-ink bg-paper focus:outline-none focus:ring-2 transition-colors ${
      fieldErrors[field] ? 'border-red-400 ring-red-200' : 'border-line focus:ring-accent/20 focus:border-accent'
    }`;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[1120px] mx-auto px-6 py-12">
        <h1 className="font-serif text-[32px] font-[500] text-ink mb-10">Checkout</h1>

        {/* Mobile summary toggle */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setSummaryOpen(!summaryOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-line rounded-[10px] text-[14px] font-medium text-ink"
          >
            <span>Order summary</span>
            <span className="font-serif text-[17px]">${(total / 100).toFixed(0)}</span>
          </button>
          {summaryOpen && (
            <div className="mt-2 p-4 bg-surface border border-line rounded-[10px]">
              <OrderSummaryContent cart={cart} shipping={shipping} total={total} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          {/* Left — form */}
          <div className="space-y-8">
            {/* 1. Contact */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-6 h-6 rounded-full bg-ink text-paper text-[11px] font-bold flex items-center justify-center">1</span>
                <h2 className="text-[17px] font-semibold text-ink">Contact</h2>
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls('email')}
                />
                {fieldErrors['email'] && <p className="text-[13px] text-red-500 mt-1">{fieldErrors['email']}</p>}
              </div>
            </section>

            {/* 2. Shipping */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-6 h-6 rounded-full bg-ink text-paper text-[11px] font-bold flex items-center justify-center">2</span>
                <h2 className="text-[17px] font-semibold text-ink">Shipping</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls('name')} />
                  {fieldErrors['name'] && <p className="text-[13px] text-red-500 mt-1">{fieldErrors['name']}</p>}
                </div>
                <div>
                  <input placeholder="Address line 1" value={line1} onChange={(e) => setLine1(e.target.value)} className={inputCls('line1')} />
                  {fieldErrors['line1'] && <p className="text-[13px] text-red-500 mt-1">{fieldErrors['line1']}</p>}
                </div>
                <input placeholder="Address line 2 (optional)" value={line2} onChange={(e) => setLine2(e.target.value)} className={inputCls('line2_opt')} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls('city')} />
                    {fieldErrors['city'] && <p className="text-[13px] text-red-500 mt-1">{fieldErrors['city']}</p>}
                  </div>
                  <div>
                    <input placeholder="State / Region" value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls('region')} />
                    {fieldErrors['region'] && <p className="text-[13px] text-red-500 mt-1">{fieldErrors['region']}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} className={inputCls('postcode')} />
                    {fieldErrors['postcode'] && <p className="text-[13px] text-red-500 mt-1">{fieldErrors['postcode']}</p>}
                  </div>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={inputCls('country')}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {/* Delivery methods */}
                <div className="mt-4 space-y-2">
                  {shippingMethods.map((m) => (
                    <label
                      key={m.id}
                      className={`flex items-center justify-between p-3 rounded-[9px] border cursor-pointer transition-colors ${shippingMethodId === m.id ? 'border-ink/40 bg-canvas' : 'border-line hover:border-ink/20'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          value={m.id}
                          checked={shippingMethodId === m.id}
                          onChange={() => setShippingMethodId(m.id)}
                          className="accent-ink"
                        />
                        <div>
                          <p className="text-[14px] font-medium text-ink">{m.label}</p>
                          <p className="text-[12px] text-muted">{m.estimate}</p>
                        </div>
                      </div>
                      <p className="font-serif text-[15px] text-ink">${(m.price / 100).toFixed(2)}</p>
                    </label>
                  ))}
                  {fieldErrors['shipping'] && <p className="text-[13px] text-red-500">{fieldErrors['shipping']}</p>}
                </div>
              </div>
            </section>

            {/* 3. Payment */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-6 h-6 rounded-full bg-ink text-paper text-[11px] font-bold flex items-center justify-center">3</span>
                <h2 className="text-[17px] font-semibold text-ink">Payment</h2>
              </div>
              <div className="rounded-[9px] border border-line p-4 text-center text-muted text-[13px]">
                Payment element loads here
              </div>
            </section>

            {/* Pay button */}
            {payError && (
              <div className="bg-red-50 border border-red-200 rounded-[9px] p-3 text-red-600 text-sm">
                {payError}
              </div>
            )}
            <button
              onClick={handlePay}
              disabled={submitting}
              className="w-full py-3.5 bg-ink text-paper rounded-[9px] font-semibold text-[15px] hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing…' : `Pay $${(total / 100).toFixed(2)}`}
            </button>
          </div>

          {/* Right — sticky summary (desktop) */}
          <div className="hidden lg:block lg:sticky lg:top-6 h-fit">
            <div className="bg-surface border border-line rounded-[16px] p-6">
              <OrderSummaryContent cart={cart} shipping={shipping} total={total} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderSummaryContent({
  cart,
  shipping,
  total,
}: {
  cart: { items: CartItem[]; subtotal: number; currency: string } | undefined;
  shipping: number;
  total: number;
}) {
  if (!cart) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-5">
        {cart.items.map((item: CartItem) => (
          <div key={item.id} className="relative">
            <img
              src={item.thumbUrl}
              alt={item.title}
              className="w-14 h-14 rounded-[6px] object-cover"
            />
            {item.qty > 1 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-ink text-paper text-[9px] font-bold flex items-center justify-center">
                {item.qty}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-line pt-4">
        <div className="flex justify-between text-[14px]">
          <span className="text-ink-3">Subtotal</span>
          <span className="text-ink">${(cart.subtotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[14px]">
          <span className="text-ink-3">Shipping</span>
          <span className="text-ink">{shipping > 0 ? `$${(shipping / 100).toFixed(2)}` : '—'}</span>
        </div>
        <div className="flex justify-between text-[14px]">
          <span className="text-ink-3">Tax</span>
          <span className="text-ink">$0.00</span>
        </div>
        <div className="flex justify-between border-t border-line pt-3 mt-2">
          <span className="font-semibold text-[14px] text-ink">Total</span>
          <span className="font-serif text-[30px] text-ink leading-none">${(total / 100).toFixed(2)}</span>
        </div>
      </div>
    </>
  );
}
