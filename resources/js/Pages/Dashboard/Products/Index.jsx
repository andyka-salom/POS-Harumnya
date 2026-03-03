import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router, usePage } from "@inertiajs/react";
import {
    IconSearch, IconFilter, IconPackage, IconTrendingUp,
    IconCurrencyDollar, IconEye, IconToggleLeft, IconToggleRight,
    IconRefresh, IconChevronLeft, IconChevronRight, IconX,
    IconFlask, IconSparkles,
} from "@tabler/icons-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(n);

const fmtCompact = (n) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}rb`;
    return String(n);
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "slate" }) {
    const colors = {
        indigo: "bg-indigo-50 border-indigo-100 text-indigo-600",
        green:  "bg-green-50 border-green-100 text-green-600",
        amber:  "bg-amber-50 border-amber-100 text-amber-600",
        purple: "bg-purple-50 border-purple-100 text-purple-600",
        slate:  "bg-slate-50 border-slate-100 text-slate-500",
    };
    return (
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${colors[color]}`}>
                {icon}
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-0.5">{value}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
            {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
        </div>
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
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${map[code] ?? "bg-slate-100 text-slate-600"}`}>
            {code}
        </span>
    );
}

// ─── Margin Badge ─────────────────────────────────────────────────────────────
function MarginBadge({ pct }) {
    const n = parseFloat(pct) || 0;
    const cls = n >= 60 ? "bg-green-100 text-green-700"
              : n >= 40 ? "bg-amber-100 text-amber-700"
              :           "bg-red-100 text-red-700";
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>
            {n.toFixed(1)}%
        </span>
    );
}

// ─── Product Row ──────────────────────────────────────────────────────────────
function ProductRow({ product, onToggle }) {
    const margin = parseFloat(product.gross_margin_percentage) || 0;

    return (
        <tr className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
            {/* SKU + Name */}
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 rounded-full flex-shrink-0 ${product.is_active ? "bg-green-400" : "bg-slate-200"}`}/>
                    <div>
                        <div className="font-bold text-slate-800 text-sm font-mono">{product.sku}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{product.name}</div>
                    </div>
                </div>
            </td>

            {/* Variant */}
            <td className="px-4 py-4">
                <div className="text-sm font-semibold text-slate-700">{product.variant?.name}</div>
                <div className="text-xs text-slate-400 capitalize">{product.variant?.gender}</div>
            </td>

            {/* Intensity + Size */}
            <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                    <IntensityBadge code={product.intensity?.code}/>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {product.size?.volume_ml}ml
                    </span>
                </div>
            </td>

            {/* Harga Jual */}
            <td className="px-4 py-4 text-right">
                <div className="font-bold text-slate-800 text-sm">{fmt(product.selling_price)}</div>
            </td>

            {/* HPP */}
            <td className="px-4 py-4 text-right">
                <div className="text-sm text-slate-600">{fmt(product.production_cost)}</div>
            </td>

            {/* Margin */}
            <td className="px-4 py-4 text-center">
                <div className="flex flex-col items-center gap-1">
                    <MarginBadge pct={margin}/>
                    <div className="text-xs text-slate-400">{fmt(product.gross_profit)}</div>
                </div>
            </td>

            {/* Bahan */}
            <td className="px-4 py-4 text-center">
                <span className="text-sm font-semibold text-slate-600">
                    {product.recipes?.length ?? 0}
                </span>
                <div className="text-xs text-slate-400">items</div>
            </td>

            {/* Actions */}
            <td className="px-4 py-4">
                <div className="flex items-center gap-1 justify-end">
                    <Link href={route('products.show', product.id)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Lihat Detail">
                        <IconEye size={17}/>
                    </Link>
                    <button onClick={() => onToggle(product)}
                        className={`p-2 rounded-lg transition ${product.is_active
                            ? "text-green-600 hover:bg-green-50"
                            : "text-slate-400 hover:bg-slate-100"}`}
                        title={product.is_active ? "Nonaktifkan" : "Aktifkan"}>
                        {product.is_active
                            ? <IconToggleRight size={17}/>
                            : <IconToggleLeft size={17}/>}
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function FilterBar({ filters, variants, intensities, sizes, onChange, onReset }) {
    const hasFilters = Object.values(filters).some(Boolean);

    return (
        <div className="bg-white rounded-2xl border shadow-sm p-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input
                        type="text"
                        placeholder="Cari SKU atau nama produk..."
                        value={filters.search || ""}
                        onChange={e => onChange({ ...filters, search: e.target.value })}
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border-slate-200 focus:ring-2 focus:ring-indigo-300"
                    />
                </div>

                {/* Variant */}
                <select value={filters.variant_id || ""}
                    onChange={e => onChange({ ...filters, variant_id: e.target.value })}
                    className="text-sm rounded-xl border-slate-200 py-2 pr-8">
                    <option value="">Semua Varian</option>
                    {variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>

                {/* Intensity */}
                <select value={filters.intensity_id || ""}
                    onChange={e => onChange({ ...filters, intensity_id: e.target.value })}
                    className="text-sm rounded-xl border-slate-200 py-2 pr-8">
                    <option value="">Semua Intensitas</option>
                    {intensities.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
                </select>

                {/* Size */}
                <select value={filters.size_id || ""}
                    onChange={e => onChange({ ...filters, size_id: e.target.value })}
                    className="text-sm rounded-xl border-slate-200 py-2 pr-8">
                    <option value="">Semua Ukuran</option>
                    {sizes.map(s => <option key={s.id} value={s.id}>{s.volume_ml}ml</option>)}
                </select>

                {/* Status */}
                <select value={filters.is_active ?? ""}
                    onChange={e => onChange({ ...filters, is_active: e.target.value })}
                    className="text-sm rounded-xl border-slate-200 py-2 pr-8">
                    <option value="">Semua Status</option>
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                </select>

                {/* Reset */}
                {hasFilters && (
                    <button onClick={onReset}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition font-semibold">
                        <IconX size={15}/> Reset
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ meta }) {
    if (!meta || meta.last_page <= 1) return null;
    return (
        <div className="flex items-center justify-between px-2 py-3 text-sm text-slate-500">
            <span>
                Menampilkan {meta.from}–{meta.to} dari {meta.total} produk
            </span>
            <div className="flex items-center gap-1">
                {meta.links?.map((link, i) => (
                    <Link key={i} href={link.url ?? '#'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            link.active
                                ? "bg-indigo-600 text-white"
                                : link.url
                                ? "hover:bg-slate-100 text-slate-600"
                                : "text-slate-300 cursor-not-allowed"
                        }`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Index({ products, stats, filters: initFilters, variants, intensities, sizes }) {
    const [filters, setFilters] = useState(initFilters ?? {});

    const applyFilters = (newFilters) => {
        setFilters(newFilters);
        router.get(route('products.index'), newFilters, {
            preserveState: true, preserveScroll: true, replace: true,
        });
    };

    const resetFilters = () => applyFilters({});

    const handleToggle = (product) => {
        router.patch(route('products.toggle-active', product.id), {}, {
            preserveScroll: true,
        });
    };

    const items     = products?.data ?? [];
    const meta      = products?.meta ?? products;

    return (
        <>
            <Head title="Produk & Harga"/>

            {/* Page Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Produk & Harga</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Catalog produk hasil generate dari formula variant
                    </p>
                </div>
                <Link href={route('recipes.index')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition shadow-sm">
                    <IconFlask size={16}/> Kelola Formula
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard icon={<IconPackage size={18}/>} color="indigo"
                    label="Total Produk" value={stats.total_products}
                    sub={`${stats.active_products} aktif`}/>
                <StatCard icon={<IconFlask size={18}/>} color="purple"
                    label="Varian Aktif" value={stats.total_variants}
                    sub="kombinasi unik"/>
                <StatCard icon={<IconTrendingUp size={18}/>} color="green"
                    label="Avg Margin" value={`${stats.avg_margin}%`}
                    sub="gross margin"/>
                <StatCard icon={<IconSparkles size={18}/>} color="amber"
                    label="Produk Nonaktif" value={stats.total_products - stats.active_products}
                    sub="perlu diaktifkan"/>
            </div>

            {/* Filter */}
            <FilterBar
                filters={filters}
                variants={variants}
                intensities={intensities}
                sizes={sizes}
                onChange={applyFilters}
                onReset={resetFilters}
            />

            {/* Table */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                {items.length === 0 ? (
                    <div className="text-center py-20">
                        <IconPackage size={48} className="mx-auto text-slate-200 mb-4"/>
                        <p className="text-slate-500 font-semibold mb-2">Belum ada produk</p>
                        <p className="text-slate-400 text-sm mb-6">
                            Generate produk terlebih dahulu dari menu Formula Variant
                        </p>
                        <Link href={route('recipes.index')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition">
                            <IconFlask size={17}/> Ke Formula Variant
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50">
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            SKU / Nama
                                        </th>
                                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Varian
                                        </th>
                                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Intensitas / Ukuran
                                        </th>
                                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Harga Jual
                                        </th>
                                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            HPP
                                        </th>
                                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Margin
                                        </th>
                                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Bahan
                                        </th>
                                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(product => (
                                        <ProductRow
                                            key={product.id}
                                            product={product}
                                            onToggle={handleToggle}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t px-4">
                            <Pagination meta={meta}/>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page}/>;
