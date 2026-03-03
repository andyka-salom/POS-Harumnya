import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconArrowLeft, IconFlask, IconPackage, IconDroplet,
    IconRefresh, IconToggleLeft, IconToggleRight,
    IconCircleCheck, IconChartPie,
} from "@tabler/icons-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(n ?? 0);

const fmtNum = (n) => new Intl.NumberFormat('id-ID').format(n ?? 0);

// ─── Margin Ring ──────────────────────────────────────────────────────────────
function MarginRing({ percentage }) {
    const pct  = Math.min(100, Math.max(0, parseFloat(percentage) || 0));
    const r    = 54;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    const color = pct >= 60 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";

    return (
        <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12"/>
                <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="12"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }}/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800">{pct.toFixed(1)}%</span>
                <span className="text-xs text-slate-400 font-semibold">margin</span>
            </div>
        </div>
    );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
    const map = {
        oil:     "bg-purple-50 text-purple-700 border-purple-200",
        alcohol: "bg-blue-50 text-blue-700 border-blue-200",
        other:   "bg-slate-50 text-slate-600 border-slate-200",
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded font-bold border ${map[type] ?? map.other}`}>
            {type}
        </span>
    );
}

// ─── Intensity Badge ──────────────────────────────────────────────────────────
function IntensityBadge({ code }) {
    const map = {
        EDT: "bg-blue-100 text-blue-700",
        EDP: "bg-purple-100 text-purple-700",
        EXT: "bg-rose-100 text-rose-700",
    };
    return (
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${map[code] ?? "bg-slate-100 text-slate-600"}`}>
            {code}
        </span>
    );
}

// ─── Cost Bar ─────────────────────────────────────────────────────────────────
function CostBar({ label, value, total, color }) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-slate-500">{label}</span>
                <div className="text-right">
                    <span className="text-xs font-bold text-slate-700">{fmt(value)}</span>
                    <span className="text-xs text-slate-400 ml-1">({pct.toFixed(1)}%)</span>
                </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }}/>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Show({ product, recipesByType, costBreakdown }) {
    const [recalculating, setRecalculating] = useState(false);

    const margin      = parseFloat(product.gross_margin_percentage) || 0;
    const allRecipes  = Object.values(recipesByType).flat();
    const typeOrder   = ['oil', 'alcohol', 'other'];

    const handleRecalculate = () => {
        setRecalculating(true);
        router.post(route('products.recalculate', product.id), {}, {
            onFinish: () => setRecalculating(false),
        });
    };

    const handleToggle = () => {
        router.patch(route('products.toggle-active', product.id));
    };

    return (
        <>
            <Head title={`Produk — ${product.sku}`}/>

            <Link href={route('products.index')}
                className="flex items-center gap-2 text-slate-500 mb-5 hover:text-indigo-600 text-sm transition">
                <IconArrowLeft size={17}/> Kembali ke Daftar Produk
            </Link>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h1 className="text-2xl font-black text-slate-800 font-mono">{product.sku}</h1>
                        <IntensityBadge code={product.intensity?.code}/>
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-bold">
                            {product.size?.volume_ml}ml
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            product.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                        }`}>
                            {product.is_active ? "● Aktif" : "○ Nonaktif"}
                        </span>
                    </div>
                    <p className="text-slate-600 text-lg font-semibold">{product.name}</p>
                    <p className="text-slate-400 text-sm mt-1">
                        {product.variant?.name} · {product.intensity?.name} · {product.size?.name}
                    </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    <button onClick={handleRecalculate} disabled={recalculating}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition shadow-sm disabled:opacity-50">
                        <IconRefresh size={16} className={recalculating ? "animate-spin" : ""}/>
                        Recalculate HPP
                    </button>
                    <button onClick={handleToggle}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-sm ${
                            product.is_active
                                ? "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                                : "bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
                        }`}>
                        {product.is_active
                            ? <><IconToggleRight size={16}/> Nonaktifkan</>
                            : <><IconToggleLeft size={16}/> Aktifkan</>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Kiri: Komposisi Bahan ──────────────────────────────── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Komposisi per type */}
                    {typeOrder.map(type => {
                        const items = recipesByType[type] ?? [];
                        if (items.length === 0) return null;

                        const typeTotal = items.reduce((s, r) => s + r.total_cost, 0);
                        const typeQty   = items.reduce((s, r) => s + r.quantity, 0);

                        const headerColors = {
                            oil:     "bg-purple-50 border-purple-100",
                            alcohol: "bg-blue-50 border-blue-100",
                            other:   "bg-slate-50 border-slate-100",
                        };

                        return (
                            <div key={type} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${headerColors[type]}`}>
                                    <div className="flex items-center gap-2">
                                        <TypeBadge type={type}/>
                                        <span className="text-sm font-bold text-slate-600">
                                            {items.length} bahan
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-slate-500">{typeQty} ml total · </span>
                                        <span className="text-sm font-bold text-slate-700">{fmt(typeTotal)}</span>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-50">
                                    {items.map((recipe, idx) => {
                                        const pct = costBreakdown.total_cost > 0
                                            ? (recipe.total_cost / costBreakdown.total_cost) * 100 : 0;
                                        return (
                                            <div key={recipe.id ?? idx} className="px-5 py-3.5 hover:bg-slate-50 transition">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-bold text-slate-500">{idx + 1}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-800 text-sm truncate">
                                                                {recipe.name}
                                                            </div>
                                                            <div className="text-xs text-slate-400 font-mono">{recipe.code}</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-6 flex-shrink-0 ml-4">
                                                        {/* Quantity */}
                                                        <div className="text-center">
                                                            <div className="font-bold text-slate-800 text-sm">
                                                                {recipe.quantity}
                                                                <span className="text-xs text-slate-400 ml-1">{recipe.unit}</span>
                                                            </div>
                                                            <div className="text-xs text-slate-400">qty</div>
                                                        </div>
                                                        {/* Unit cost */}
                                                        <div className="text-center min-w-[80px]">
                                                            <div className="text-sm text-slate-600">{fmt(recipe.unit_cost)}</div>
                                                            <div className="text-xs text-slate-400">per {recipe.unit}</div>
                                                        </div>
                                                        {/* Total cost */}
                                                        <div className="text-right min-w-[90px]">
                                                            <div className="font-bold text-slate-800 text-sm">{fmt(recipe.total_cost)}</div>
                                                            <div className="text-xs text-slate-400">{pct.toFixed(1)}% HPP</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Cost progress bar */}
                                                <div className="mt-2 ml-10">
                                                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${
                                                            type === 'oil'     ? 'bg-purple-400' :
                                                            type === 'alcohol' ? 'bg-blue-400' : 'bg-slate-400'
                                                        }`} style={{ width: `${pct}%` }}/>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Type subtotal */}
                                <div className="px-5 py-3 bg-slate-50 border-t flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Subtotal {type}
                                    </span>
                                    <span className="font-bold text-slate-700">{fmt(typeTotal)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Kanan: Harga & Margin ──────────────────────────────── */}
                <div className="space-y-4">

                    {/* Margin ring */}
                    <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col items-center">
                        <MarginRing percentage={margin}/>
                        <div className="w-full mt-5 space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm text-slate-500">Harga Jual</span>
                                <span className="font-black text-slate-800 text-lg">{fmt(product.selling_price)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm text-slate-500">HPP (Ingredient)</span>
                                <span className="font-bold text-slate-700">{fmt(product.production_cost)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-slate-500">Gross Profit</span>
                                <span className={`font-bold text-lg ${
                                    product.gross_profit >= 0 ? "text-green-600" : "text-red-500"
                                }`}>{fmt(product.gross_profit)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Cost breakdown */}
                    <div className="bg-white rounded-2xl border shadow-sm p-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <IconChartPie size={14}/> Breakdown HPP
                        </h3>
                        <div className="space-y-4">
                            <CostBar label="Oil (Bibit)" value={costBreakdown.oil_cost}
                                total={costBreakdown.total_cost} color="bg-purple-400"/>
                            <CostBar label="Alcohol" value={costBreakdown.alcohol_cost}
                                total={costBreakdown.total_cost} color="bg-blue-400"/>
                            {costBreakdown.other_cost > 0 && (
                                <CostBar label="Other" value={costBreakdown.other_cost}
                                    total={costBreakdown.total_cost} color="bg-slate-400"/>
                            )}
                            <div className="pt-3 border-t flex justify-between font-bold text-slate-700">
                                <span className="text-sm">Total HPP</span>
                                <span>{fmt(costBreakdown.total_cost)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Info produk */}
                    <div className="bg-white rounded-2xl border shadow-sm p-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                            Info Produk
                        </h3>
                        <div className="space-y-3 text-sm">
                            {[
                                { label: "SKU",         value: <span className="font-mono font-bold">{product.sku}</span> },
                                { label: "Varian",      value: product.variant?.name },
                                { label: "Intensitas",  value: `${product.intensity?.name} (${product.intensity?.code})` },
                                { label: "Ukuran",      value: `${product.size?.volume_ml} ml` },
                                { label: "Oil Ratio",   value: `${product.intensity?.oil_ratio}%` },
                                { label: "Alc Ratio",   value: `${product.intensity?.alcohol_ratio}%` },
                                { label: "Total Bahan", value: `${allRecipes.length} items` },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between items-center">
                                    <span className="text-slate-400">{label}</span>
                                    <span className="font-semibold text-slate-700 text-right">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Packaging note */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <p className="text-xs font-semibold text-amber-700 mb-1">📦 Catatan Packaging</p>
                        <p className="text-xs text-amber-600">
                            Packaging (botol, tutup, label) bersifat add-on di POS dan
                            tidak termasuk dalam perhitungan HPP di sini.
                        </p>
                    </div>

                    {/* Quick links */}
                    <div className="bg-white rounded-2xl border shadow-sm p-5">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Aksi</h3>
                        <div className="space-y-2">
                            <Link href={route('recipes.show', [product.variant_id, product.intensity_id])}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition">
                                <IconFlask size={15}/> Lihat Formula Base
                            </Link>
                            <button onClick={handleRecalculate} disabled={recalculating}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition disabled:opacity-50">
                                <IconRefresh size={15} className={recalculating ? "animate-spin" : ""}/>
                                Recalculate HPP
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Show.layout = (page) => <DashboardLayout children={page}/>;
