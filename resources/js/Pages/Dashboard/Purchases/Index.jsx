import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import Table from "@/Components/Dashboard/Table";
import Pagination from "@/Components/Dashboard/Pagination";
import Button from "@/Components/Dashboard/Button";
import {
    IconShoppingBag, IconCirclePlus, IconDatabaseOff, IconEye,
    IconPencilCog, IconCheck, IconChartBar, IconClock, IconTruck,
} from "@tabler/icons-react";

const STATUS_CFG = {
    draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-300",           step: 0 },
    pending:   { label: "Menunggu",  cls: "bg-yellow-100 text-yellow-700 border-yellow-300",          step: 1 },
    approved:  { label: "Disetujui", cls: "bg-blue-100 text-blue-700 border-blue-300",               step: 2 },
    received:  { label: "Diterima",  cls: "bg-violet-100 text-violet-700 border-violet-300",          step: 3 },
    completed: { label: "Selesai",   cls: "bg-success-100 text-success-700 border-success-300",       step: 4 },
    cancelled: { label: "Dibatal",   cls: "bg-red-100 text-red-700 border-red-300",                   step: -1 },
};

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function Index({ purchases, filters = {}, summary = {} }) {
    const [search, setSearch] = useState(filters.search || "");
    const [status, setStatus] = useState(filters.status || "");

    React.useEffect(() => {
        const t = setTimeout(() => { if (search !== filters.search) apply({ search }); }, 500);
        return () => clearTimeout(t);
    }, [search]);

    const apply = (overrides = {}) => {
        const f = { search, status, ...overrides };
        Object.keys(f).forEach((k) => { if (!f[k]) delete f[k]; });
        router.get(route("purchases.index"), f, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Purchase Order" />
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconShoppingBag size={28} className="text-indigo-500" /> Purchase Order
                    </h1>
                    <p className="text-sm text-slate-500">Pembelian bahan baku dan kemasan dari supplier.</p>
                </div>
                <Button type="link" icon={<IconCirclePlus size={18} />}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-md"
                    label="Buat PO Baru" href={route("purchases.create")} />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { label: "Total",    value: summary.total,    icon: <IconChartBar size={20} />, color: "blue" },
                    { label: "Menunggu", value: summary.pending,  icon: <IconClock size={20} />,    color: "yellow" },
                    { label: "Disetujui",value: summary.approved, icon: <IconClock size={20} />,    color: "blue" },
                    { label: "Diterima", value: summary.received, icon: <IconTruck size={20} />,    color: "violet" },
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
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nomor PO atau supplier..."
                    className="flex-1 rounded-xl border-slate-200 dark:bg-slate-900 text-sm" />
                <select value={status} onChange={(e) => { setStatus(e.target.value); apply({ status: e.target.value }); }}
                    className="w-full md:w-44 rounded-xl border-slate-200 dark:bg-slate-900 text-sm">
                    <option value="">Semua Status</option>
                    {Object.entries(STATUS_CFG).map(([v, { label }]) => (
                        <option key={v} value={v}>{label}</option>
                    ))}
                </select>
            </div>

            {purchases?.data?.length > 0 ? (
                <Table.Card title="Daftar Purchase Order">
                    <Table>
                        <Table.Thead>
                            <tr>
                                <Table.Th className="w-10">No</Table.Th>
                                <Table.Th>No. PO</Table.Th>
                                <Table.Th>Supplier</Table.Th>
                                <Table.Th>Destinasi</Table.Th>
                                <Table.Th className="text-center">Item</Table.Th>
                                <Table.Th className="text-right">Total</Table.Th>
                                <Table.Th>Tgl PO</Table.Th>
                                <Table.Th>Est. Tiba</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th className="text-center w-20">Aksi</Table.Th>
                            </tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {purchases.data.map((p, i) => {
                                const st = STATUS_CFG[p.status] ?? STATUS_CFG.draft;
                                return (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <Table.Td className="text-center text-slate-400 text-xs">
                                            {i + 1 + (purchases.current_page - 1) * purchases.per_page}
                                        </Table.Td>
                                        <Table.Td>
                                            <span className="font-mono text-xs font-bold text-indigo-600">{p.purchase_number}</span>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="font-bold text-sm text-slate-700 dark:text-slate-200">{p.supplier?.name}</div>
                                            <div className="text-xs text-slate-400">{p.supplier?.code}</div>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="font-bold text-sm text-slate-700">{p.destination_name}</div>
                                            <div className="text-xs text-slate-400 capitalize">{p.destination_type}</div>
                                        </Table.Td>
                                        <Table.Td className="text-center text-sm font-bold text-slate-700">{p.items?.length ?? 0}</Table.Td>
                                        <Table.Td className="text-right font-bold text-slate-800">{fmt(p.total)}</Table.Td>
                                        <Table.Td className="text-sm text-slate-500">{fmtDate(p.purchase_date)}</Table.Td>
                                        <Table.Td className="text-sm text-slate-500">{fmtDate(p.expected_delivery_date)}</Table.Td>
                                        <Table.Td>
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold border whitespace-nowrap ${st.cls}`}>{st.label}</span>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="flex justify-center gap-1">
                                                <Link href={route("purchases.show", p.id)}
                                                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg">
                                                    <IconEye size={14} />
                                                </Link>
                                                {p.can_edit && (
                                                    <Link href={route("purchases.edit", p.id)}
                                                        className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 rounded-lg">
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
                    <h3 className="font-bold text-slate-600 dark:text-slate-400">Belum ada Purchase Order</h3>
                    <Link href={route("purchases.create")}
                        className="mt-4 flex items-center gap-2 text-indigo-600 font-bold hover:underline text-sm">
                        <IconCirclePlus size={16} /> Buat PO Baru
                    </Link>
                </div>
            )}
            <div className="mt-4"><Pagination links={purchases?.links || []} /></div>
        </>
    );
}
Index.layout = (page) => <DashboardLayout children={page} />;
