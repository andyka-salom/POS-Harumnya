import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import Table from "@/Components/Dashboard/Table";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";
import {
    IconAdjustments, IconCirclePlus, IconDatabaseOff, IconEye,
    IconPencilCog, IconChartBar, IconClock, IconCheck,
    IconTrendingUp, IconTrendingDown,
} from "@tabler/icons-react";

const STATUS_CFG = {
    draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-300" },
    pending:   { label: "Menunggu",  cls: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    approved:  { label: "Disetujui", cls: "bg-blue-100 text-blue-700 border-blue-300" },
    completed: { label: "Selesai",   cls: "bg-success-100 text-success-700 border-success-300" },
    cancelled: { label: "Dibatal",   cls: "bg-red-100 text-red-700 border-red-300" },
};

const TYPE_CFG = {
    stock_opname: { label: "Stock Opname", color: "blue" },
    damage:       { label: "Rusak",        color: "red" },
    loss:         { label: "Hilang",       color: "red" },
    found:        { label: "Ditemukan",    color: "success" },
    expired:      { label: "Kadaluarsa",   color: "warning" },
    other:        { label: "Lainnya",      color: "slate" },
};

// total_surplus / total_shortage adalah decimal(15,2) dari server → parseFloat
const fmt     = (n) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR", minimumFractionDigits: 0,
    }).format(parseFloat(n) || 0);

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
    }) : "-";

export default function Index({ adjustments, filters = {}, summary = {}, typeOptions = [] }) {
    const [search, setSearch] = useState(filters.search || "");
    const [status, setStatus] = useState(filters.status || "");
    const [type,   setType]   = useState(filters.type   || "");

    React.useEffect(() => {
        const t = setTimeout(() => { if (search !== filters.search) apply({ search }); }, 500);
        return () => clearTimeout(t);
    }, [search]);

    const apply = (overrides = {}) => {
        const f = { search, status, type, ...overrides };
        Object.keys(f).forEach((k) => { if (!f[k]) delete f[k]; });
        router.get(route("stock-adjustments.index"), f, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Penyesuaian Stok" />

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconAdjustments size={28} className="text-orange-500" /> Penyesuaian Stok
                    </h1>
                    <p className="text-sm text-slate-500">Stock opname, barang rusak, hilang, dan penyesuaian lainnya.</p>
                </div>
                <Button type="link" icon={<IconCirclePlus size={18} />}
                    className="bg-orange-500 hover:bg-orange-600 text-white shadow-md"
                    label="Buat Adjustment" href={route("stock-adjustments.create")} />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { label: "Total",     value: summary.total,     icon: <IconChartBar size={20} />, color: "blue" },
                    { label: "Menunggu",  value: summary.pending,   icon: <IconClock size={20} />,    color: "yellow" },
                    { label: "Disetujui", value: summary.approved,  icon: <IconClock size={20} />,    color: "blue" },
                    { label: "Selesai",   value: summary.completed, icon: <IconCheck size={20} />,    color: "success" },
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

            {/* Filters */}
            <div className="mb-4 flex flex-col md:flex-row gap-3">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nomor adjustment..."
                    className="flex-1 rounded-xl border-slate-200 dark:bg-slate-900 text-sm"
                />
                <select
                    value={type}
                    onChange={(e) => { setType(e.target.value); apply({ type: e.target.value }); }}
                    className="w-full md:w-44 rounded-xl border-slate-200 dark:bg-slate-900 text-sm"
                >
                    <option value="">Semua Tipe</option>
                    {typeOptions.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
                <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); apply({ status: e.target.value }); }}
                    className="w-full md:w-40 rounded-xl border-slate-200 dark:bg-slate-900 text-sm"
                >
                    <option value="">Semua Status</option>
                    {Object.entries(STATUS_CFG).map(([v, { label }]) => (
                        <option key={v} value={v}>{label}</option>
                    ))}
                </select>
            </div>

            {adjustments?.data?.length > 0 ? (
                <Table.Card title="Daftar Penyesuaian Stok">
                    <Table>
                        <Table.Thead>
                            <tr>
                                <Table.Th className="w-10">No</Table.Th>
                                <Table.Th>No. Adjustment</Table.Th>
                                <Table.Th>Tipe</Table.Th>
                                <Table.Th>Lokasi</Table.Th>
                                <Table.Th className="text-center">Item</Table.Th>
                                {/* total_surplus/shortage → decimal(15,2) */}
                                <Table.Th className="text-right">Surplus</Table.Th>
                                <Table.Th className="text-right">Kekurangan</Table.Th>
                                <Table.Th>Tgl</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th className="text-center w-24">Aksi</Table.Th>
                            </tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {adjustments.data.map((adj, i) => {
                                const st  = STATUS_CFG[adj.status] ?? STATUS_CFG.draft;
                                const typ = TYPE_CFG[adj.type]     ?? TYPE_CFG.other;
                                return (
                                    <tr key={adj.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <Table.Td className="text-center text-slate-400 text-xs">
                                            {i + 1 + (adjustments.current_page - 1) * adjustments.per_page}
                                        </Table.Td>
                                        <Table.Td>
                                            <span className="font-mono text-xs font-bold text-orange-600">
                                                {adj.adjustment_number}
                                            </span>
                                        </Table.Td>
                                        <Table.Td>
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold bg-${typ.color}-100 text-${typ.color}-700 border border-${typ.color}-300`}>
                                                {typ.label}
                                            </span>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                                {adj.location_name}
                                            </div>
                                            <div className="text-xs text-slate-400 capitalize">{adj.location_type}</div>
                                        </Table.Td>
                                        <Table.Td className="text-center text-sm font-bold text-slate-700">
                                            {adj.item_count ?? 0}
                                        </Table.Td>
                                        {/* total_surplus → decimal(15,2): parseFloat di dalam fmt() */}
                                        <Table.Td className="text-right">
                                            {parseFloat(adj.total_surplus) > 0
                                                ? <span className="font-bold text-success-600 flex items-center justify-end gap-1">
                                                    <IconTrendingUp size={13} />{fmt(adj.total_surplus)}
                                                  </span>
                                                : <span className="text-slate-300 text-xs">-</span>}
                                        </Table.Td>
                                        {/* total_shortage → decimal(15,2): parseFloat di dalam fmt() */}
                                        <Table.Td className="text-right">
                                            {parseFloat(adj.total_shortage) > 0
                                                ? <span className="font-bold text-red-600 flex items-center justify-end gap-1">
                                                    <IconTrendingDown size={13} />{fmt(adj.total_shortage)}
                                                  </span>
                                                : <span className="text-slate-300 text-xs">-</span>}
                                        </Table.Td>
                                        <Table.Td className="text-sm text-slate-500">
                                            {fmtDate(adj.adjustment_date)}
                                        </Table.Td>
                                        <Table.Td>
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${st.cls}`}>
                                                {st.label}
                                            </span>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="flex justify-center gap-1">
                                                <Link
                                                    href={route("stock-adjustments.show", adj.id)}
                                                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg"
                                                >
                                                    <IconEye size={14} />
                                                </Link>
                                                {["draft", "pending"].includes(adj.status) && (
                                                    <Link
                                                        href={route("stock-adjustments.edit", adj.id)}
                                                        className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 rounded-lg"
                                                    >
                                                        <IconPencilCog size={14} />
                                                    </Link>
                                                )}
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
                    <h3 className="font-bold text-slate-600 dark:text-slate-400">Belum ada penyesuaian stok</h3>
                    <Link
                        href={route("stock-adjustments.create")}
                        className="mt-4 flex items-center gap-2 text-orange-600 font-bold hover:underline text-sm"
                    >
                        <IconCirclePlus size={16} /> Buat Adjustment Baru
                    </Link>
                </div>
            )}
            <div className="mt-4"><Pagination links={adjustments?.links || []} /></div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;
