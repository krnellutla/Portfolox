// Route: /studio/orders
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ExternalLink } from 'lucide-react';
import { TopNav } from '../../components/nav/TopNav.js';
import { StateView } from '../../components/ui/StateView.js';
import { qk } from '../../lib/query-client.js';
import { getMyOrders, getMyOrder, refundOrder } from '../../api/studio-orders.js';
import type { OrderStatus } from '@blueflutes/shared';

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'in_production', label: 'In production' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'refunded', label: 'Refunded' },
];

const TIMELINE_STATUSES: OrderStatus[] = ['paid', 'in_production', 'shipped', 'delivered'];

function statusLabel(s: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    paid: 'Paid',
    in_production: 'In production',
    shipped: 'Shipped',
    delivered: 'Delivered',
    refunded: 'Refunded',
  };
  return map[s] ?? s;
}

function StatusPill({ status }: { status: OrderStatus }) {
  const cls =
    status === 'shipped' || status === 'delivered'
      ? 'bg-positive/10 text-positive border border-positive/20'
      : status === 'refunded'
        ? 'bg-negative/10 text-negative border border-negative/20'
        : 'bg-field-bg text-ink-3 border border-line';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-line animate-pulse">
      <td className="py-3 pr-4"><div className="h-4 w-28 bg-canvas rounded" /></td>
      <td className="py-3 pr-4"><div className="h-4 w-20 bg-canvas rounded" /></td>
      <td className="py-3 pr-4"><div className="h-10 w-48 bg-canvas rounded" /></td>
      <td className="py-3 pr-4"><div className="h-4 w-16 bg-canvas rounded" /></td>
      <td className="py-3 pr-4"><div className="h-4 w-16 bg-canvas rounded" /></td>
      <td className="py-3"><div className="h-5 w-20 bg-canvas rounded-full" /></td>
    </tr>
  );
}

// ─── Order Drawer ────────────────────────────────────────────────────────────

interface OrderDrawerProps {
  orderId: string | null;
  onClose: () => void;
}

function OrderDrawer({ orderId, onClose }: OrderDrawerProps) {
  const qc = useQueryClient();
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: qk.myOrder(orderId!),
    queryFn: () => getMyOrder(orderId!),
    enabled: !!orderId,
  });

  const refundMutation = useMutation({
    mutationFn: () => refundOrder(orderId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me', 'orders'] });
      setShowRefundConfirm(false);
    },
  });

  if (!orderId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="hidden lg:block fixed inset-0 z-30 bg-ink/10"
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div className="fixed inset-0 z-40 lg:left-auto lg:right-0 lg:w-[420px] bg-paper border-l border-line overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line sticky top-0 bg-paper z-10">
          <h2 className="font-serif text-[22px] font-[500] text-ink">
            {isLoading ? 'Order…' : `Order ${order?.number ?? ''}`}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas text-ink-3 hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading && (
          <div className="px-6 py-10">
            <StateView variant="loading" title="Loading order…" />
          </div>
        )}

        {order && (
          <div className="px-6 py-6 flex flex-col gap-6">
            {/* Timeline */}
            <section>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted mb-4">Timeline</p>
              <ol className="flex flex-col gap-3">
                {order.status === 'refunded' ? (
                  // Show refunded timeline
                  order.timeline.map((step, i) => {
                    const done = !!step.at;
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {done ? (
                            <div className="w-3 h-3 rounded-full bg-ink" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border-2 border-line" />
                          )}
                        </div>
                        <div>
                          <p className={done ? 'text-[13px] text-ink' : 'text-[13px] text-muted'}>
                            {statusLabel(step.status)}
                          </p>
                          {step.at && (
                            <p className="font-mono text-[11px] text-muted">
                              {new Date(step.at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })
                ) : (
                  TIMELINE_STATUSES.map((status) => {
                    const step = order.timeline.find((t) => t.status === status);
                    const done = !!step?.at;
                    return (
                      <li key={status} className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {done ? (
                            <div className="w-3 h-3 rounded-full bg-ink" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border-2 border-line" />
                          )}
                        </div>
                        <div>
                          <p className={done ? 'text-[13px] text-ink' : 'text-[13px] text-muted'}>
                            {statusLabel(status)}
                          </p>
                          {step?.at && (
                            <p className="font-mono text-[11px] text-muted">
                              {new Date(step.at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })
                )}
              </ol>
            </section>

            {/* Shipping address */}
            {order.shippingAddress && (
              <section>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted mb-2">
                  Shipping address
                </p>
                <div className="text-[13px] text-ink leading-5">
                  <p>{order.shippingAddress.name}</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.region}{' '}
                    {order.shippingAddress.postcode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              </section>
            )}

            {/* Tracking link */}
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] text-ink hover:text-ink-2 font-medium"
              >
                <ExternalLink size={14} />
                Track shipment
              </a>
            )}

            {/* Payout breakdown */}
            <section>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted mb-3">
                Payout breakdown
              </p>
              <div className="bg-surface border border-line rounded-[14px] p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink-3">Sale price</span>
                  <span className="text-ink font-mono">{fmt(order.payout?.printCost != null ? order.subtotal : 0)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink-3">− Print cost</span>
                  <span className="text-ink font-mono">−{fmt(order.payout?.printCost ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink-3">− Commission</span>
                  <span className="text-ink font-mono">−{fmt(order.payout?.commission ?? 0)}</span>
                </div>
                <div className="h-px bg-line my-1" />
                <div className="flex items-center justify-between">
                  <span className="font-serif text-[15px] text-ink font-[500]">Your payout</span>
                  <span className="font-serif text-[22px] text-positive font-[500]">
                    {fmt(order.payout?.amount ?? 0)}
                  </span>
                </div>
              </div>
            </section>

            {/* Refund button */}
            {order.status !== 'refunded' && (
              <section>
                {!showRefundConfirm ? (
                  <button
                    onClick={() => setShowRefundConfirm(true)}
                    className="w-full px-4 py-2.5 border border-line rounded-[9px] text-[13px] font-medium text-ink-3 hover:border-negative hover:text-negative transition-colors"
                  >
                    Refund order
                  </button>
                ) : (
                  <div className="border border-negative/20 bg-negative/5 rounded-[12px] p-4 flex flex-col gap-3">
                    <p className="text-[13px] text-ink">
                      Are you sure? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => refundMutation.mutate()}
                        disabled={refundMutation.isPending}
                        className="px-4 py-2 bg-negative text-paper rounded-[8px] text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {refundMutation.isPending ? 'Refunding…' : 'Yes, refund'}
                      </button>
                      <button
                        onClick={() => setShowRefundConfirm(false)}
                        className="px-4 py-2 border border-line rounded-[8px] text-[13px] font-medium text-ink-3 hover:text-ink transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    {refundMutation.isError && (
                      <p className="text-[12px] text-negative font-mono">
                        Refund failed. Please try again.
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Orders Page ─────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: qk.myOrders(statusFilter),
    queryFn: () => getMyOrders(statusFilter),
  });

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-8 pt-10 pb-32">
        {/* Header */}
        <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-muted mb-1">
          19 — ORDERS
        </p>
        <h1 className="font-serif text-[40px] font-[500] text-ink mb-8">Orders</h1>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={
                statusFilter === f.id
                  ? 'border border-ink bg-ink text-paper rounded-full px-4 py-1.5 text-[13px] transition-colors'
                  : 'border border-line rounded-full px-4 py-1.5 text-[13px] text-muted hover:text-ink hover:border-ink transition-colors'
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Orders table */}
        {isLoading ? (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-[12px] font-mono uppercase tracking-[0.14em] text-muted border-b border-line">
                <th className="text-left pb-3 pr-4 font-normal">Order</th>
                <th className="text-left pb-3 pr-4 font-normal">Buyer</th>
                <th className="text-left pb-3 pr-4 font-normal">Items</th>
                <th className="text-left pb-3 pr-4 font-normal">Total</th>
                <th className="text-left pb-3 pr-4 font-normal">Your payout</th>
                <th className="text-left pb-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        ) : !orders?.length ? (
          <StateView
            variant="empty"
            title="No orders yet"
            description="Sales and prints appear here once your first order is placed."
          />
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-[12px] font-mono uppercase tracking-[0.14em] text-muted border-b border-line">
                <th className="text-left pb-3 pr-4 font-normal">Order</th>
                <th className="text-left pb-3 pr-4 font-normal">Buyer</th>
                <th className="text-left pb-3 pr-4 font-normal">Items</th>
                <th className="text-left pb-3 pr-4 font-normal">Total</th>
                <th className="text-left pb-3 pr-4 font-normal">Your payout</th>
                <th className="text-left pb-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-line hover:bg-canvas/50 cursor-pointer"
                  onClick={() => setSelectedOrderId(order.id)}
                >
                  <td className="py-3 pr-4">
                    <p className="font-mono text-[12px] text-ink">{order.number}</p>
                    <p className="font-mono text-[11px] text-muted">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-ink">@{order.buyer.handle ?? order.buyer.name}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-col gap-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <div className="w-16 h-16 bg-canvas rounded-[6px] shrink-0 overflow-hidden">
                            {item.thumbUrl ? (
                              <img
                                src={item.thumbUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-canvas" />
                            )}
                          </div>
                          <div>
                            <p className="text-[13px] text-ink font-medium leading-tight">
                              {item.title}
                            </p>
                            <p className="font-mono text-[11px] text-muted">{item.size}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-ink">{fmt(order.subtotal)}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-positive font-medium">{fmt(order.payout?.amount ?? 0)}</span>
                  </td>
                  <td className="py-3">
                    <StatusPill status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Drawer */}
      {selectedOrderId && (
        <OrderDrawer
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
