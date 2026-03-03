import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, router } from "@inertiajs/react";
import Table from "@/Components/Dashboard/Table";
import Pagination from "@/Components/Dashboard/Pagination";
import {
    IconDatabaseOff, IconTrendingUp, IconTrendingDown,
    IconHistory, IconFilter, IconChartBar, IconCalendar,
} from "@tabler/icons-react";

const TYPE_CFG = {
    purchase_in:    { label: "Beli Masuk",      color: "success" },
    transfer_in:    { label: "Transfer Masuk",  color: "blue" },
    transfer_out:   { label: "Transfer Keluar", color: "blue" },
    repack_in:      { label: "Repack Masuk",    color: "violet" },
    repack_out:     { label: "Repack Keluar",   color: "violet" },
    production_in:  { label: "Produksi Masuk",  color: "success" },
    production_out: { label: "Produksi Keluar", color: "warning" },
    sales_out:      { label: "Penjualan",       color: "danger" },
    adjustment_in:  { label: "Penyesuaian (+)", color: "success" },
    adjustment_out: { label: "Penyesuaian (-)", color: "warning" },
    waste:          { label: "Waste",           color: "danger" },
    return_in:      { label: "Retur Masuk",     color: "success" },
    return_out:     { label: "Retur Keluar",    color: "warning" },
};

const COLOR_CLS = {
    success: "bg-success-100 text-success-700 border-success-300",
    blue:    "bg-blue-100 text-blue-700 border-blue-300",
    violet:  "bg-violet-100 text-violet-700 border-violet-300",
    warning: "bg-amber-100 text-amber-700 border-amber-300",
    danger:  "bg-red-100 text-red-700 border-red-300",
    slate:   "bg-slate-100 text-slate-600 border-slate-300",
};

export default function Index({
    movements,
    locations     = [],
    movementTypes = [],
    filters       = {},
    summary       = {},
}) {
    const [search,      setSearch]      = useState(filters.search        || "");
    const [movType,     setMovType]     = useState(filters.movement_type || "");
    const [locType,     setLocType]     = useState(filters.location_type || "");
    const [locId,       setLocId]       = useState(filters.location_id   || "");
    const [itemType,    setItemType]    = useState(filters.item_type     || "");
    const [dateFrom,    setDateFrom]    = useState(filters.date_from     || "");
    const [dateTo,      setDateTo]      = useState(filters.date_to       || "");
    const [showFilters, setShowFilters] = useState(false);

    React.useEffect(() => {
        const t = setTimeout(() => { if (search !== filters.search) applyFilters({ search }); }, 500);
        return () => clearTimeout(t);
    }, [search]);

    const applyFilters = (overrides = {}) => {
        const f = {
            search,
            movement_type: movType,
            location_type: locType,
            location_id:   locId,
            item_type:     itemType,
            date_from:     dateFrom,
            date_to:       dateTo,
            ...overrides,
        };
        Object.keys(f).forEach((k) => { if (!f[k]) delete f[k]; });
        router.get(route("stock-movements.index"), f, { preserveState: true, replace: true });
    };

    // Rupiah — unit_cost adalah decimal(15,4) → parseFloat
    const fmt = (n) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency", currency: "IDR", minimumFractionDigits: 0,
        }).format(parseFloat(n) || 0);

    // Qty — bigInteger SIGNED → parseInt
    const fmtQty = (n) => parseInt(n || 0).toLocaleString("id-ID");

    // avg_cost — decimal(15,4) → 2-4 desimal
    const fmtDec = (n) =>
        parseFloat(n || 0).toLocaleString("id-ID", {
            minimumFractionDigits: 2, maximumFractionDigits: 4,
        });

    const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString("id-ID", {
            day: "2-digit", month: "short", year: "numeric",
        }) : "-";

    const filteredLocations = locType
        ? locations.filter((l) => l.type === locType)
        : locations;

    return (
        <>
            <Head title="Log Pergerakan Stok" />

            {/* Page header */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconHistory size={28} className="text-primary-500" /> Log Pergerakan Stok
                    </h1>
                    <p className="text-sm text-slate-500">
                        Catatan semua pergerakan stok: repack, transfer, penyesuaian, dll.
                    </p>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { label: "Total Log",  value: summary.total,    icon: <IconChartBar size={20} />,   color: "blue" },
                    { label: "Hari Ini",   value: summary.today,    icon: <IconCalendar size={20} />,   color: "primary" },
                    { label: "Repack",     value: summary.repack,   icon: <IconHistory size={20} />,    color: "violet" },
                    { label: "Transfer",   value: summary.transfer, icon: <IconTrendingUp size={20} />, color: "success" },
                ].map(({ label, value, icon, color }) => (
                    <div key={label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">{label}</p>
                                <p className={`text-2xl font-black text-${color}-600 mt-0.5`}>{value ?? 0}</p>
                            </div>
                            <div className={`p-2.5 bg-${color}-50 rounded-lg text-${color}-600`}>{icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search + filter toggle */}
            <div className="mb-3 flex gap-3">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nomor referensi atau catatan..."
                    className="flex-1 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm"
                />
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                        showFilters
                            ? "bg-primary-50 border-primary-300 text-primary-700"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                >
                    <IconFilter size={16} /> Filter
                    {Object.values(filters).filter(Boolean).length > 1 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary-500 text-white rounded-full font-black">
                            {Object.values(filters).filter(Boolean).length - (filters.search ? 0 : 1)}
                        </span>
                    )}
                </button>
            </div>

            {/* Expanded filters */}
            {showFilters && (
                <div className="mb-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Tipe Gerakan</label>
                        <select
                            value={movType}
                            onChange={(e) => { setMovType(e.target.value); applyFilters({ movement_type: e.target.value }); }}
                            className="w-full rounded-lg border-slate-200 dark:bg-slate-950 text-xs"
                        >
                            <option value="">Semua</option>
                            {movementTypes.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Tipe Lokasi</label>
                        <select
                            value={locType}
                            onChange={(e) => { setLocType(e.target.value); setLocId(""); applyFilters({ location_type: e.target.value, location_id: "" }); }}
                            className="w-full rounded-lg border-slate-200 dark:bg-slate-950 text-xs"
                        >
                            <option value="">Semua</option>
                            <option value="warehouse">Gudang</option>
                            <option value="store">Toko</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Lokasi</label>
                        <select
                            value={locId}
                            onChange={(e) => { setLocId(e.target.value); applyFilters({ location_id: e.target.value }); }}
                            className="w-full rounded-lg border-slate-200 dark:bg-slate-950 text-xs"
                        >
                            <option value="">Semua</option>
                            {filteredLocations.map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Tipe Item</label>
                        <select
                            value={itemType}
                            onChange={(e) => { setItemType(e.target.value); applyFilters({ item_type: e.target.value }); }}
                            className="w-full rounded-lg border-slate-200 dark:bg-slate-950 text-xs"
                        >
                            <option value="">Semua</option>
                            <option value="ingredient">Ingredient</option>
                            <option value="packaging_material">Packaging</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Dari Tanggal</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); applyFilters({ date_from: e.target.value }); }}
                            className="w-full rounded-lg border-slate-200 dark:bg-slate-950 text-xs"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Sampai Tanggal</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); applyFilters({ date_to: e.target.value }); }}
                            className="w-full rounded-lg border-slate-200 dark:bg-slate-950 text-xs"
                        />
                    </div>
                </div>
            )}

            {/* Table */}
            {movements?.data?.length > 0 ? (
                <Table.Card title="Log Pergerakan Stok">
                    <Table>
                        <Table.Thead>
                            <tr>
                                <Table.Th className="w-10">No</Table.Th>
                                <Table.Th>Tipe</Table.Th>
                                <Table.Th>Item</Table.Th>
                                <Table.Th>Lokasi</Table.Th>
                                <Table.Th>Referensi</Table.Th>
                                {/* qty_change → bigInteger SIGNED */}
                                <Table.Th className="text-right">Qty</Table.Th>
                                {/* qty_before / qty_after → bigInteger */}
                                <Table.Th className="text-right">Sebelum → Sesudah</Table.Th>
                                {/* avg_cost_before / after → decimal(15,4) */}
                                <Table.Th className="text-right">Avg Cost</Table.Th>
                                <Table.Th>Tanggal</Table.Th>
                                <Table.Th>Oleh</Table.Th>
                            </tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {movements.data.map((mv, i) => {
                                const cfg  = TYPE_CFG[mv.movement_type] ?? { label: mv.movement_type, color: "slate" };
                                const isIn = mv.direction === "in";
                                return (
                                    <tr key={mv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <Table.Td className="text-center text-slate-400">
                                            {i + 1 + (movements.current_page - 1) * movements.per_page}
                                        </Table.Td>
                                        <Table.Td>
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${COLOR_CLS[cfg.color] ?? COLOR_CLS.slate}`}>
                                                {cfg.label}
                                            </span>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                {mv.item_name}
                                            </div>
                                            <div className="text-xs text-slate-400 capitalize">
                                                {mv.item_type?.replace("_", " ")}
                                            </div>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="text-sm text-slate-700 dark:text-slate-300">{mv.location_name}</div>
                                            <div className="text-xs text-slate-400 capitalize">{mv.location_type}</div>
                                        </Table.Td>
                                        <Table.Td>
                                            {mv.reference_number
                                                ? <span className="font-mono text-xs text-primary-600 font-bold">{mv.reference_number}</span>
                                                : <span className="text-xs text-slate-400">-</span>}
                                        </Table.Td>
                                        {/* qty_change → bigInteger SIGNED: parseInt, tanda + jika positif */}
                                        <Table.Td className="text-right">
                                            <div className={`font-bold flex items-center justify-end gap-1 ${isIn ? "text-success-600" : "text-red-600"}`}>
                                                {isIn ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
                                                {isIn ? "+" : ""}{fmtQty(mv.qty_change)}
                                            </div>
                                            {/* unit_cost → decimal(15,4): parseFloat */}
                                            <div className="text-xs text-slate-400">@ {fmt(mv.unit_cost)}</div>
                                        </Table.Td>
                                        {/* qty_before / qty_after → bigInteger: parseInt */}
                                        <Table.Td className="text-right">
                                            <div className="text-xs text-slate-500">
                                                {fmtQty(mv.qty_before)}
                                                <span className="mx-1 text-slate-300">→</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    {fmtQty(mv.qty_after)}
                                                </span>
                                            </div>
                                        </Table.Td>
                                        {/* avg_cost_before / after → decimal(15,4): parseFloat 4 desimal */}
                                        <Table.Td className="text-right">
                                            <div className="text-xs text-slate-500">{fmtDec(mv.avg_cost_before)}</div>
                                            <div className="text-xs font-bold text-slate-700">→ {fmtDec(mv.avg_cost_after)}</div>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {fmtDate(mv.movement_date)}
                                            </div>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="text-xs text-slate-600 dark:text-slate-400">
                                                {mv.creator?.name ?? "-"}
                                            </div>
                                        </Table.Td>
                                    </tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </Table.Card>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <IconDatabaseOff size={48} className="text-slate-300 mb-3" />
                    <h3 className="font-bold text-slate-600 dark:text-slate-400">Belum ada log pergerakan stok</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Log akan muncul setelah ada transaksi repack, transfer, atau penyesuaian.
                    </p>
                </div>
            )}

            <div className="mt-4"><Pagination links={movements?.links || []} /></div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
