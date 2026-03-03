import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import Button from "@/Components/Dashboard/Button";
import Table from "@/Components/Dashboard/Table";
import Pagination from "@/Components/Dashboard/Pagination";
import {
    IconCirclePlus, IconDatabaseOff, IconEye, IconPencilCog, IconTrash,
    IconCheck, IconX, IconFlask, IconClock, IconChartBar,
} from "@tabler/icons-react";

const STATUS_CFG = {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-300" },
    pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    approved: { label: "Disetujui", cls: "bg-blue-100 text-blue-700 border-blue-300" },
    completed: { label: "Selesai", cls: "bg-success-100 text-success-700 border-success-300" },
    cancelled: { label: "Batal", cls: "bg-red-100 text-red-700 border-red-300" },
};

export default function Index({ repacks, filters = {}, summary = {} }) {
    const [search, setSearch] = useState(filters.search || "");
    const [status, setStatus] = useState(filters.status || "");

    React.useEffect(() => {
        const t = setTimeout(() => {
            if (search !== filters.search) handleFilter("search", search);
        }, 500);
        return () => clearTimeout(t);
    }, [search]);

    // total_cost adalah decimal(15,2) → parseFloat untuk format rupiah
    const fmt = (n) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency", currency: "IDR", minimumFractionDigits: 0,
        }).format(parseFloat(n) || 0);

    // output_quantity & qty item adalah bigInteger → parseInt
    const fmtQty = (n) => parseInt(n || 0).toLocaleString("id-ID");

    const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString("id-ID", {
            day: "2-digit", month: "short", year: "numeric",
        }) : "-";

    const handleFilter = (key, value) => {
        const f = { ...filters, [key]: value };
        Object.keys(f).forEach((k) => { if (!f[k]) delete f[k]; });
        router.get(route("repacks.index"), f, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Repack Ingredient" />

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <IconFlask size={28} className="text-primary-500" /> Repack Ingredient
                    </h1>
                    <p className="text-sm text-slate-500">Gabungkan beberapa ingredient menjadi satu ingredient baru.</p>
                </div>
                <Button
                    type="link"
                    icon={<IconCirclePlus size={18} />}
                    className="bg-primary-500 hover:bg-primary-600 text-white shadow-md"
                    label="Buat Repack"
                    href={route("repacks.create")}
                />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                {[
                    { label: "Total", value: summary.total, icon: <IconChartBar size={20} />, color: "blue" },
                    { label: "Draft", value: summary.draft, icon: <IconClock size={20} />, color: "slate" },
                    { label: "Pending", value: summary.pending, icon: <IconClock size={20} />, color: "yellow" },
                    { label: "Selesai", value: summary.completed, icon: <IconCheck size={20} />, color: "success" },
                    { label: "Batal", value: summary.cancelled, icon: <IconX size={20} />, color: "red" },
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
                    placeholder="Cari nomor repack atau ingredient..."
                    className="flex-1 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm"
                />
                <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); handleFilter("status", e.target.value); }}
                    className="w-full md:w-44 rounded-xl border-slate-200 dark:bg-slate-900 text-sm"
                >
                    <option value="">Semua Status</option>
                    {Object.entries(STATUS_CFG).map(([v, { label }]) => (
                        <option key={v} value={v}>{label}</option>
                    ))}
                </select>
            </div>

            {repacks?.data?.length > 0 ? (
                <Table.Card title="Daftar Repack">
                    <Table>
                        <Table.Thead>
                            <tr>
                                <Table.Th className="w-10">No</Table.Th>
                                <Table.Th>No. Repack</Table.Th>
                                <Table.Th>Output Ingredient</Table.Th>
                                <Table.Th>Lokasi</Table.Th>
                                <Table.Th className="text-right">Output Qty</Table.Th>
                                <Table.Th className="text-right">Total Cost Input</Table.Th>
                                <Table.Th>Tgl Repack</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th className="text-center w-28">Aksi</Table.Th>
                            </tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {repacks.data.map((r, i) => {
                                const st = STATUS_CFG[r.status] ?? STATUS_CFG.draft;
                                return (
                                    <tr
                                        key={r.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800"
                                    >
                                        <Table.Td className="text-center text-slate-400">
                                            {i + 1 + (repacks.current_page - 1) * repacks.per_page}
                                        </Table.Td>
                                        <Table.Td>
                                            <span className="font-mono text-xs font-bold text-primary-600">
                                                {r.repack_number}
                                            </span>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                {r.repack_ingredient?.name}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {r.repack_ingredient?.code} · {r.items?.length ?? 0} input item
                                            </div>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="text-sm text-slate-700 dark:text-slate-300">
                                                {r.location_name}
                                            </div>
                                            <div className="text-xs text-slate-400 capitalize">{r.location_type}</div>
                                        </Table.Td>
                                        <Table.Td className="text-right">
                                            {/* output_quantity → bigInteger → parseInt */}
                                            <div className="font-bold text-primary-600">
                                                {fmtQty(r.output_quantity)}
                                            </div>
                                            <div className="text-xs text-slate-400">{r.repack_ingredient?.unit}</div>
                                        </Table.Td>
                                        <Table.Td className="text-right">
                                            {/* total_input_cost → float (sum of decimal(15,2)) */}
                                            <div className="font-bold text-slate-700 dark:text-slate-200">
                                                {fmt(r.total_input_cost)}
                                            </div>
                                            {/* output_cost → decimal(15,4) */}
                                            <div className="text-xs text-slate-400">
                                                @ {fmt(r.output_cost)}/unit
                                            </div>
                                        </Table.Td>
                                        <Table.Td className="text-sm text-slate-600 dark:text-slate-400">
                                            {fmtDate(r.repack_date)}
                                        </Table.Td>
                                        <Table.Td>
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${st.cls}`}>
                                                {st.label}
                                            </span>
                                        </Table.Td>
                                        <Table.Td>
                                            <div className="flex justify-center gap-1">
                                                <Button
                                                    type="link"
                                                    icon={<IconEye size={14} />}
                                                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                                                    href={route("repacks.show", r.id)}
                                                />
                                                {["draft", "pending"].includes(r.status) && (
                                                    <Button
                                                        type="edit"
                                                        icon={<IconPencilCog size={14} />}
                                                        className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
                                                        href={route("repacks.edit", r.id)}
                                                    />
                                                )}
                                                {r.status === "draft" && (
                                                    <Button
                                                        type="delete"
                                                        icon={<IconTrash size={14} />}
                                                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                                                        url={route("repacks.destroy", r.id)}
                                                    />
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
                    <h3 className="font-bold text-slate-600 dark:text-slate-400">Tidak ada data repack</h3>
                    <Link
                        href={route("repacks.create")}
                        className="mt-4 flex items-center gap-2 text-primary-600 font-bold hover:underline text-sm"
                    >
                        <IconCirclePlus size={16} /> Buat Repack Baru
                    </Link>
                </div>
            )}

            <div className="mt-4">
                <Pagination links={repacks?.links || []} />
            </div>
        </>
    );
}

Index.layout = (page) => <DashboardLayout children={page} />;