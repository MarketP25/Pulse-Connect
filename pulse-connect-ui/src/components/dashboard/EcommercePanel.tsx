"use client";

import { InvoiceRecord, ProductOffering, PurchaseRecord } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  purchaseLabel: string;
  products: ProductOffering[];
  purchases: PurchaseRecord[];
  invoices: InvoiceRecord[];
  enabled: boolean;
  disabledReason?: string;
  loading: boolean;
  onPurchase: (productId: string) => Promise<void>;
};

export function EcommercePanel({
  title,
  purchaseLabel,
  products,
  purchases,
  invoices,
  enabled,
  disabledReason,
  loading,
  onPurchase
}: Props) {
  return (
    <SectionCard
      title={title}
      subtitle="Browse products/services, manage purchases, and track invoices."
    >
      {!enabled ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          {disabledReason || "Not available for this tier."}
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                <p className="mt-1 text-xs text-slate-600">{product.description}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">${product.priceUsd}</p>
                <button
                  className="mt-2 rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                  onClick={() => onPurchase(product.id)}
                  disabled={loading}
                >
                  {purchaseLabel}
                </button>
              </article>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Purchase History</p>
              <div className="space-y-2 text-sm text-slate-700">
                {purchases.length === 0 ? <p>No purchases yet.</p> : null}
                {purchases.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200 p-2">
                    <p>{entry.productName}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(entry.purchasedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Invoices</p>
              <div className="space-y-2 text-sm text-slate-700">
                {invoices.length === 0 ? <p>No invoices yet.</p> : null}
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="rounded-lg border border-slate-200 p-2">
                    <p>
                      Invoice {invoice.id.slice(0, 8)} - ${invoice.amountUsd}
                    </p>
                    <p className="text-xs text-slate-500">Status: {invoice.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}
