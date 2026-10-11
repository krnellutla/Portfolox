import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CartItem } from '@blueflutes/shared';
import { StateView } from '../../components/ui/StateView.js';
import { getCart, updateCartItem, removeCartItem } from '../../api/commerce.js';
import { qk } from '../../lib/query-client.js';
import { useCartStore } from '../../stores/cartStore.js';

function SkeletonRow() {
  return (
    <div className="flex gap-5 py-6 border-b border-line animate-pulse">
      <div className="w-24 h-24 rounded-[8px] bg-canvas shrink-0" />
      <div className="flex-1">
        <div className="h-4 bg-canvas rounded w-3/4 mb-2" />
        <div className="h-3 bg-canvas rounded w-1/2" />
      </div>
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setCart = useCartStore((s) => s.setCart);
  const clearCart = useCartStore((s) => s.clearCart);

  const { data: cart, isLoading } = useQuery({
    queryKey: qk.cart(),
    queryFn: getCart,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => updateCartItem(id, { qty }),
    onSuccess: (updatedCart) => {
      qc.setQueryData(qk.cart(), updatedCart);
      setCart(updatedCart);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeCartItem(id),
    onSuccess: (updatedCart) => {
      qc.setQueryData(qk.cart(), updatedCart);
      if (updatedCart.itemCount === 0) clearCart();
      else setCart(updatedCart);
    },
  });

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[1080px] mx-auto px-6 py-12">
        <p className="font-mono text-[10.5px] uppercase tracking-widest text-muted mb-2">CART</p>
        <h1 className="font-serif text-[40px] font-[500] text-ink mb-10">Your cart</h1>

        {isLoading ? (
          <div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : isEmpty ? (
          <StateView
            variant="empty"
            title="Your cart is empty"
            description="Add prints from a photographer's portfolio."
            action={
              <button
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 rounded-[9px] bg-ink text-paper text-sm font-semibold hover:bg-ink/90 transition-colors"
              >
                Browse
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-10">
            {/* Left — items */}
            <div>
              {cart.items.map((item: CartItem) => (
                <div key={item.id} className="flex gap-5 py-6 border-b border-line">
                  <img
                    src={item.thumbUrl}
                    alt={item.title}
                    className="w-24 h-24 rounded-[8px] object-cover shrink-0"
                  />
                  <div className="flex-1">
                    <p className="font-serif text-[19px] text-ink mb-0.5">{item.title}</p>
                    <p className="font-mono text-[11px] text-muted mb-3">{item.size} · {item.kind}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateMutation.mutate({ id: item.id, qty: Math.max(1, item.qty - 1) })}
                          className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-ink-3 hover:text-ink hover:border-ink transition-colors"
                        >−</button>
                        <span className="font-mono text-[13px] text-ink w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateMutation.mutate({ id: item.id, qty: Math.min(10, item.qty + 1) })}
                          className="w-7 h-7 rounded-full border border-line flex items-center justify-center text-ink-3 hover:text-ink hover:border-ink transition-colors"
                        >+</button>
                      </div>
                      <p className="font-serif text-[17px] text-ink">${(item.lineTotal / 100).toFixed(0)}</p>
                    </div>
                    <button
                      onClick={() => removeMutation.mutate(item.id)}
                      className="text-[13px] text-muted hover:text-red-500 transition-colors mt-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Right — summary */}
            <div className="md:sticky md:top-6 h-fit">
              <div className="bg-surface border border-line rounded-[16px] p-6">
                <div className="flex justify-between items-baseline mb-3">
                  <p className="text-[14px] text-ink-3">Subtotal</p>
                  <p className="font-serif text-[17px] text-ink">${(cart.subtotal / 100).toFixed(0)}</p>
                </div>
                <div className="flex justify-between items-baseline mb-5">
                  <p className="text-[14px] text-ink-3">Shipping</p>
                  <p className="text-[13px] text-muted">Calculated next</p>
                </div>
                <div className="flex justify-between items-baseline border-t border-line pt-4 mb-5">
                  <p className="font-semibold text-[14px] text-ink">Total</p>
                  <p className="font-serif text-[22px] text-ink">${(cart.subtotal / 100).toFixed(0)}</p>
                </div>
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full py-3 bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink/90 transition-colors"
                >
                  Checkout →
                </button>
                <p className="font-mono text-[10px] text-muted text-center mt-3">SECURE PAYMENT</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
