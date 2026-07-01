import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useCart } from "@/lib/cart";

export function CartDrawer() {
  const { items, isOpen, setOpen, subtotal, setQty, remove, count } = useCart();

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden={!isOpen}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="font-display text-xl font-semibold">
            Your cart {count > 0 && <span className="text-muted-foreground">({count})</span>}
          </h2>
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Browse the collection
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-24 w-20 flex-shrink-0 rounded-md object-cover"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium leading-tight">{item.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.size} · {item.frame}
                        </p>
                      </div>
                      <button
                        aria-label="Remove item"
                        onClick={() => remove(item.variantId)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center rounded-full border border-border">
                        <button
                          aria-label="Decrease"
                          onClick={() => setQty(item.variantId, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center hover:text-primary"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          aria-label="Increase"
                          onClick={() => setQty(item.variantId, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center hover:text-primary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="font-display font-semibold">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-6 py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-display text-lg font-semibold">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Shipping &amp; taxes calculated at checkout.
              </p>
              <Link
                to="/checkout"
                onClick={() => setOpen(false)}
                className="mt-4 block w-full rounded-full bg-primary py-3 text-center text-sm font-medium text-primary-foreground shadow hover:opacity-90"
              >
                Proceed to checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
