import React, { useState } from "react";
import { Head, Link } from "@inertiajs/react";
import { IconArrowLeft, IconPrinter, IconReceipt, IconFileInvoice } from "@tabler/icons-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v = 0) =>
    Number(v || 0).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 });

const fmtDT = (d, t) => {
    if (!d) return "-";
    const date = new Date(`${d}T${t ?? "00:00:00"}`);
    return date.toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
};

const STATUS_COLORS = {
    completed: "bg-emerald-100 text-emerald-700",
    cancelled:  "bg-red-100 text-red-700",
    refunded:   "bg-amber-100 text-amber-700",
    pending:    "bg-blue-100 text-blue-700",
    draft:      "bg-slate-100 text-slate-600",
};

// ─── Komponen utama ───────────────────────────────────────────────────────────
// prop 'sale' dengan relasi:
//   sale.saleItems[]          → dari sale_items (dengan snapshot: product_name, variant_name, intensity_code, size_ml)
//   sale.saleItems[].packagings[]  → dari sale_item_packagings (packaging per item)
//   sale.payments[]           → dari sale_payments, dengan relasi paymentMethod
//   sale.customer             → dari customers
//   sale.cashier              → dari users
//   sale.store                → dari stores
export default function Print({ sale }) {
    const [mode, setMode] = useState("invoice"); // invoice | thermal80 | thermal58

    if (!sale) return null;

    // sale_items dari relasi saleItems (sudah eager-load + packagings)
    const saleItems = sale.sale_items ?? sale.saleItems ?? [];
    // sale_payments dari relasi salePayments atau payments
    const payments  = sale.sale_payments ?? sale.payments ?? [];

    const totalPaid  = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
    // change_amount tersimpan di sales.change_amount, atau hitung manual
    const change     = Number(sale.change_amount ?? 0) || Math.max(0, totalPaid - Number(sale.total ?? 0));
    // Nama metode dari relasi payment_method (payment_methods table, kolom: name)
    const paymentNames = payments
        .map(p => p.payment_method?.name ?? p.paymentMethod?.name ?? "Cash")
        .join(", ");

    return (
        <>
            <Head title={`Invoice ${sale.sale_number}`} />

            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 print:bg-white print:p-0">
                <div className="max-w-3xl mx-auto space-y-5">

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                        <Link
                            href={route("transactions.history")}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <IconArrowLeft size={18} /> Kembali ke Riwayat
                        </Link>

                        <div className="flex items-center gap-2">
                            {/* Mode Toggle */}
                            <div className="flex bg-slate-200 dark:bg-slate-800 rounded-xl p-1">
                                {[
                                    { key: "invoice",   label: "Invoice",    Icon: IconFileInvoice },
                                    { key: "thermal80", label: "Struk 80mm", Icon: IconReceipt },
                                    { key: "thermal58", label: "Struk 58mm", Icon: IconReceipt },
                                ].map(({ key, label, Icon }) => (
                                    <button key={key} onClick={() => setMode(key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                                            mode === key
                                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow"
                                                : "text-slate-500 hover:text-slate-700"
                                        }`}>
                                        <Icon size={14} /> {label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => window.print()}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-sm font-semibold text-white shadow-lg shadow-primary-500/30">
                                <IconPrinter size={18} /> Cetak
                            </button>
                        </div>
                    </div>

                    {/* ══ INVOICE MODE ══ */}
                    {mode === "invoice" && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl print:shadow-none">

                            {/* Header */}
                            <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-6 text-white print:bg-slate-100 print:text-slate-900">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs opacity-75 uppercase tracking-widest mb-1">INVOICE</p>
                                        {/* sale_number — format: INV/YYYYMMDD/00001 */}
                                        <p className="text-2xl font-bold font-mono">{sale.sale_number}</p>
                                        {/* sale_date (DATE) + sale_time (TIME) */}
                                        <p className="text-sm opacity-80 mt-1">{fmtDT(sale.sale_date, sale.sale_time)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${STATUS_COLORS[sale.status] ?? "bg-slate-100 text-slate-600"}`}>
                                            {sale.status?.toUpperCase()}
                                        </span>
                                        <p className="text-sm opacity-80 mt-2">{sale.store?.name ?? "-"}</p>
                                        {sale.store?.address && (
                                            <p className="text-xs opacity-60 mt-0.5">{sale.store.address}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid md:grid-cols-3 gap-6 px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Pelanggan</p>
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                        {sale.customer?.name ?? "Umum"}
                                    </p>
                                    {sale.customer?.phone && <p className="text-sm text-slate-500">{sale.customer.phone}</p>}
                                    {sale.customer?.code  && <p className="text-xs text-slate-400 font-mono">{sale.customer.code}</p>}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Kasir</p>
                                    {/* cashier_id → User (cashier) */}
                                    <p className="font-semibold text-slate-900 dark:text-white">{sale.cashier?.name ?? "-"}</p>
                                    {/* sales_person_id → SalesPerson (jika ada) */}
                                    {sale.sales_person && (
                                        <p className="text-sm text-slate-500">Sales: {sale.sales_person.name}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Pembayaran</p>
                                    {/* payment_method dari sale_payments → payment_method (name) */}
                                    <p className="font-semibold text-slate-900 dark:text-white">{paymentNames}</p>
                                    <p className="text-sm text-slate-500">Dibayar: {fmt(totalPaid)}</p>
                                    {change > 0 && (
                                        <p className="text-sm text-emerald-600 font-semibold">Kembali: {fmt(change)}</p>
                                    )}
                                </div>
                            </div>

                            {/* ── Item Table ─────────────────────────────────────────── */}
                            <div className="px-6 py-5">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Item Parfum</p>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800">
                                            {["Produk", "Harga/Unit", "Qty", "Subtotal", "HPP", "Profit"].map(h => (
                                                <th key={h} className="pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right first:text-left">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {saleItems.map((item, i) => {
                                            // Snapshot fields dari sale_items:
                                            //   product_name, variant_name, intensity_code, size_ml, product_sku
                                            // Atau via relasi: item.product.variant.name dll
                                            const productLabel = item.product_name
                                                ?? [
                                                    item.variant_name,
                                                    item.intensity_code,
                                                    item.size_ml ? `${item.size_ml}ml` : null,
                                                  ].filter(Boolean).join(" · ")
                                                ?? item.product?.variant?.name
                                                ?? "Parfum Custom";

                                            const sku = item.product_sku ?? item.product?.sku;

                                            // Hitung line_gross_profit: bisa dari kolom atau manual
                                            const lineProfit = Number(item.line_gross_profit ?? 0)
                                                || (Number(item.subtotal ?? 0) - Number(item.cogs_total ?? 0));

                                            return (
                                                <React.Fragment key={i}>
                                                    <tr>
                                                        <td className="py-3">
                                                            <p className="font-medium text-slate-800 dark:text-white">{productLabel}</p>
                                                            {sku && <p className="text-xs text-slate-400 font-mono">{sku}</p>}
                                                        </td>
                                                        {/* unit_price dari sale_items */}
                                                        <td className="py-3 text-right text-slate-600">{fmt(item.unit_price)}</td>
                                                        {/* quantity dari sale_items */}
                                                        <td className="py-3 text-right text-slate-600">{item.quantity}x</td>
                                                        {/* subtotal dari sale_items */}
                                                        <td className="py-3 text-right font-semibold">{fmt(item.subtotal)}</td>
                                                        {/* cogs_total = cogs_per_unit × quantity */}
                                                        <td className="py-3 text-right text-slate-500 text-xs">{fmt(item.cogs_total)}</td>
                                                        {/* line_gross_profit dari sale_items */}
                                                        <td className="py-3 text-right text-emerald-600 font-semibold text-xs">{fmt(lineProfit)}</td>
                                                    </tr>

                                                    {/* ── Packaging per item (sale_item_packagings) ── */}
                                                    {(item.packagings ?? item.sale_item_packagings ?? []).map((pkg, j) => {
                                                        const pkgName = pkg.packaging_name
                                                            ?? pkg.packaging_material?.name
                                                            ?? "Kemasan";
                                                        const pkgProfit = Number(pkg.line_gross_profit ?? 0)
                                                            || (Number(pkg.unit_price ?? 0) * Number(pkg.quantity ?? 1)) - Number(pkg.cogs_total ?? 0);
                                                        return (
                                                            <tr key={`pkg-${i}-${j}`} className="bg-slate-50/50 dark:bg-slate-800/20">
                                                                <td className="py-1.5 pl-4 text-slate-500">
                                                                    <span className="text-[11px] flex items-center gap-1">
                                                                        <span className="text-slate-300">└</span>
                                                                        {pkgName}
                                                                        {pkg.packaging_code && (
                                                                            <span className="font-mono text-slate-400">({pkg.packaging_code})</span>
                                                                        )}
                                                                    </span>
                                                                </td>
                                                                <td className="py-1.5 text-right text-xs text-slate-500">{fmt(pkg.unit_price)}</td>
                                                                <td className="py-1.5 text-right text-xs text-slate-500">{pkg.quantity ?? 1}x</td>
                                                                <td className="py-1.5 text-right text-xs text-slate-600 font-semibold">
                                                                    {fmt((Number(pkg.unit_price ?? 0)) * Number(pkg.quantity ?? 1))}
                                                                </td>
                                                                <td className="py-1.5 text-right text-xs text-slate-400">{fmt(pkg.cogs_total)}</td>
                                                                <td className="py-1.5 text-right text-xs text-emerald-500">{fmt(pkgProfit)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Summary ─────────────────────────────────────────────── */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-5 border-t border-slate-100 dark:border-slate-800">
                                <div className="max-w-xs ml-auto space-y-2 text-sm">
                                    {/* subtotal = subtotal_perfume + subtotal_packaging */}
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Subtotal</span>
                                        <span>{fmt(sale.subtotal)}</span>
                                    </div>

                                    {/* discount_amount — dari sale_discounts atau langsung di sales */}
                                    {Number(sale.discount_amount) > 0 && (
                                        <div className="flex justify-between text-red-500">
                                            <span>Diskon</span>
                                            <span>- {fmt(sale.discount_amount)}</span>
                                        </div>
                                    )}

                                    {/* points_redemption_value — jika customer redeem poin */}
                                    {Number(sale.points_redemption_value) > 0 && (
                                        <div className="flex justify-between text-amber-500">
                                            <span>Poin ({sale.points_redeemed} poin)</span>
                                            <span>- {fmt(sale.points_redemption_value)}</span>
                                        </div>
                                    )}

                                    {/* tax_amount — jika ada pajak */}
                                    {Number(sale.tax_amount) > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>Pajak</span>
                                            <span>{fmt(sale.tax_amount)}</span>
                                        </div>
                                    )}

                                    {/* total = grand total yang dibayar */}
                                    <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
                                        <span>Total</span>
                                        <span>{fmt(sale.total)}</span>
                                    </div>

                                    {/* amount_paid & change_amount dari sales table */}
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Dibayar ({paymentNames})</span>
                                        <span>{fmt(sale.amount_paid ?? totalPaid)}</span>
                                    </div>
                                    {change > 0 && (
                                        <div className="flex justify-between text-emerald-600 font-semibold">
                                            <span>Kembalian</span>
                                            <span>{fmt(change)}</span>
                                        </div>
                                    )}

                                    {/* Breakdown HPP & Profit */}
                                    <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 space-y-1">
                                        {Number(sale.cogs_perfume) > 0 && (
                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>HPP Parfum</span>
                                                <span>{fmt(sale.cogs_perfume)}</span>
                                            </div>
                                        )}
                                        {Number(sale.cogs_packaging) > 0 && (
                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>HPP Kemasan</span>
                                                <span>{fmt(sale.cogs_packaging)}</span>
                                            </div>
                                        )}
                                        {/* cogs_total = cogs_perfume + cogs_packaging */}
                                        <div className="flex justify-between text-xs text-slate-500 font-semibold">
                                            <span>Total HPP</span>
                                            <span>{fmt(sale.cogs_total)}</span>
                                        </div>
                                        {/* gross_profit & gross_margin_pct dari sales table */}
                                        <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                            <span>Gross Profit</span>
                                            <span>
                                                {fmt(sale.gross_profit)}
                                                {" "}
                                                <span className="text-emerald-500/70">
                                                    ({parseFloat(sale.gross_margin_pct ?? 0).toFixed(1)}%)
                                                </span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Loyalty poin yang didapat */}
                                    {Number(sale.points_earned) > 0 && (
                                        <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-xl mt-2">
                                            <span>⭐ Poin diperoleh</span>
                                            <span className="font-bold">+{sale.points_earned} poin</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-6 py-4 text-center border-t border-slate-100 dark:border-slate-800">
                                <p className="text-xs text-slate-400 uppercase tracking-widest">Terima kasih telah berbelanja</p>
                            </div>
                        </div>
                    )}

                    {/* ══ THERMAL 80mm ══ */}
                    {mode === "thermal80" && (
                        <div className="flex justify-center">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg" style={{ width: 302, fontFamily: "monospace" }}>
                                <ThermalContent sale={sale} saleItems={saleItems} payments={payments}
                                    totalPaid={totalPaid} change={change} paymentNames={paymentNames} chars={48} />
                            </div>
                        </div>
                    )}

                    {/* ══ THERMAL 58mm ══ */}
                    {mode === "thermal58" && (
                        <div className="flex justify-center">
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg" style={{ width: 220, fontFamily: "monospace" }}>
                                <ThermalContent sale={sale} saleItems={saleItems} payments={payments}
                                    totalPaid={totalPaid} change={change} paymentNames={paymentNames} chars={32} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Struk Thermal (shared 58mm & 80mm) ──────────────────────────────────────
function ThermalContent({ sale, saleItems, payments, totalPaid, change, paymentNames, chars }) {
    const n  = (v = 0) => Number(v || 0).toLocaleString("id-ID", { minimumFractionDigits: 0 });
    const ln = "─".repeat(chars);
    const c  = (s = "") => s.padStart(Math.floor((chars + s.length) / 2)).padEnd(chars);

    return (
        <pre style={{ fontSize: chars > 40 ? 11 : 9.5, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
{c(sale.store?.name ?? "PARFUM CUSTOM")}
{sale.store?.address ? c(sale.store.address) : ""}
{ln}
{"No  : " + sale.sale_number}
{"Tgl : " + (sale.sale_date ?? "-") + " " + (sale.sale_time?.slice(0, 5) ?? "")}
{"Ksr : " + (sale.cashier?.name ?? "-")}
{"Plg : " + (sale.customer?.name ?? "Umum")}
{ln}
{saleItems.map((item) => {
    // Gunakan snapshot fields dari sale_items
    const name = item.product_name
        ?? [item.variant_name, item.intensity_code, item.size_ml ? `${item.size_ml}ml` : null]
            .filter(Boolean).join(" ")
        ?? "Parfum";

    // Packaging per item dari sale_item_packagings
    const pkgs = (item.packagings ?? item.sale_item_packagings ?? []);
    const pkgLines = pkgs.map(p => `  + ${(p.packaging_name ?? p.packaging_material?.name ?? "Kemasan").slice(0, chars - 6)} ${n(p.unit_price)}\n`).join("");

    return `${name.slice(0, chars)}\n  ${item.quantity}x ${n(item.unit_price)}\n  Subtotal  : Rp ${n(item.subtotal)}\n${pkgLines}`;
}).join("")}
{ln}
{`SUBTOTAL  : Rp ${n(sale.subtotal)}`}
{Number(sale.discount_amount) > 0 ? `DISKON    : Rp ${n(sale.discount_amount)}` : ""}
{Number(sale.points_redemption_value) > 0 ? `POIN      : Rp ${n(sale.points_redemption_value)}` : ""}
{`TOTAL     : Rp ${n(sale.total)}`}
{`BAYAR     : Rp ${n(sale.amount_paid ?? totalPaid)} (${paymentNames})`}
{change > 0 ? `KEMBALI   : Rp ${n(change)}` : ""}
{Number(sale.points_earned) > 0 ? `POIN +    : ${sale.points_earned} poin` : ""}
{ln}
{c("Terima kasih!")}
        </pre>
    );
}
