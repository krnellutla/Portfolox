import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import type { CartItem, OrderEvent } from '@blueflutes/shared';
import { StateView } from '../../components/ui/StateView.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { getOrder } from '../../api/commerce.js';
import { qk } from '../../lib/query-client.js';

const STATUS_LABELS: Record<string, string> = {
  paid: 'Order placed',
  in_production: 'In production',
  shipped: 'Shipped',
  delivered: 'Delivered',
  refunded: 'Refunded',
};

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? undefined;

  const { data: order, isLoading, error } = useQuery({
    queryKey: qk.order(id ?? ''),
    queryFn: () => getOrder(id ?? '', token),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-muted text-[14px]">Loading your order…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <StateView
          variant="error"
          title="Order not found"
          description="The link may have expired."
        />
      </div>
    );
  }

  const firstName = order.buyer.name.split(' ')[0] ?? order.buyer.name;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[720px] mx-auto px-6 py-16">
        {/* Confirmation header */}
        <div className="text-center mb-10">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h1 className="font-serif text-[34px] font-[500] text-ink mb-2">Thank you, {firstName}.</h1>
          <p className="font-mono text-[11px] text-muted uppercase tracking-widest mb-2">{order.number}</p>
          <p className="text-[14px] text-ink-3">A receipt has been sent to {order.buyer.email}.</p>
        </div>

        {/* Order details card */}
        <div className="bg-surface border border-line rounded-[16px] p-6 mb-8">
          {/* Items */}
          <div className="space-y-4 mb-6">
            {order.items.map((item: CartItem) => (
              <div key={item.id} className="flex gap-4 items-center">
                <img
                  src={item.thumbUrl}
                  alt={item.title}
                  className="w-16 h-16 rounded-[6px] object-cover shrink-0"
                />
                <div className="flex-1">
                  <p className="font-serif text-[16px] text-ink">{item.title}</p>
                  <p className="font-mono text-[11px] text-muted">{item.size} · {item.kind}</p>
                  <p className="font-mono text-[11px] text-muted">Qty {item.qty}</p>
                </div>
                <p className="font-serif text-[16px] text-ink">${(item.lineTotal / 100).toFixed(0)}</p>
              </div>
            ))}
          </div>

          {/* Shipping address */}
          <div className="border-t border-line pt-5 mb-5">
            <p className="font-mono text-[10.5px] uppercase tracking-widest text-muted mb-2">Shipping address</p>
            <p className="text-[14px] text-ink">{(order.shippingAddress as { name: string }).name}</p>
            <p className="text-[14px] text-ink-3">{(order.shippingAddress as { line1: string }).line1}</p>
            {(order.shippingAddress as { line2?: string }).line2 && (
              <p className="text-[14px] text-ink-3">{(order.shippingAddress as { line2: string }).line2}</p>
            )}
            <p className="text-[14px] text-ink-3">
              {(order.shippingAddress as { city: string }).city}, {(order.shippingAddress as { region: string }).region} {(order.shippingAddress as { postcode: string }).postcode}
            </p>
          </div>

          {/* Delivery estimate */}
          <div className="border-t border-line pt-5 mb-5">
            <p className="font-mono text-[10.5px] uppercase tracking-widest text-muted mb-1">Delivery</p>
            <p className="text-[14px] text-ink">{order.shippingMethod.label} · {order.shippingMethod.estimate}</p>
          </div>

          {/* Totals */}
          <div className="border-t border-line pt-5 space-y-2">
            <div className="flex justify-between text-[14px]">
              <span className="text-ink-3">Subtotal</span>
              <span>${(order.subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-ink-3">Shipping</span>
              <span>${(order.shipping / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-ink-3">Tax</span>
              <span>${(order.tax / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-3">
              <span className="font-semibold text-[15px] text-ink">Total</span>
              <span className="font-serif text-[22px] text-ink">${(order.total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Status timeline */}
        {order.timeline.length > 0 && (
          <div className="mb-8">
            <p className="font-mono text-[10.5px] uppercase tracking-widest text-muted mb-4">Order timeline</p>
            <ol className="space-y-3">
              {order.timeline.map((event: OrderEvent, i: number) => {
                const isActive = i === order.timeline.length - 1;
                return (
                  <li key={i} className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-ink' : 'bg-ink/20'}`} />
                    <span className={`text-[14px] ${isActive ? 'text-ink font-medium' : 'text-muted'}`}>
                      {STATUS_LABELS[event.status] ?? event.status}
                    </span>
                    <span className="font-mono text-[10.5px] text-muted ml-auto">
                      {new Date(event.at).toLocaleDateString()}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="w-full py-3 border border-line rounded-[9px] text-[14px] font-medium text-ink hover:bg-canvas transition-colors"
        >
          Back to portfolio
        </button>
      </div>
    </div>
  );
}
