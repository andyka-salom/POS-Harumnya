import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    IconArrowLeft, IconFlask, IconCheck, IconX, IconPencilCog,
    IconTrendingUp, IconTrendingDown, IconAlertTriangle, IconHistory,
    IconClock, IconUser, IconInfoCircle,
} from "@tabler/icons-react";
import Table from "@/Components/Dashboard/Table";
import toast from "react-hot-toast";

const STATUS_CFG = {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-300" },
    pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    approved: { label: "Disetujui", cls: "bg-blue-100 text-blue-700 border-blue-300" },
    completed: { label: "Selesai", cls: "bg-success-100 text-success-700 border-success-300" },
    cancelled: { label: "Batal", cls: "bg-red-100 text-red-700 border-red-300" },
};

export default function Show({ repack, movements = [] }) {
    const [cancelReason, setCancelReason] = useState("");
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);

    // Nilai rupiah — parseFloat karena bisa decimal(15,2) atau decimal(15,4)
    const fmt = (n) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency", currency: "IDR", minimumFractionDigits: 0,
        }).format(parseFloat(n) || 0);

    // qty stok — bigInteger SIGNED → parseInt
    const fmtQty = (n) => parseInt(n || 0).toLocaleString("id-ID");

    // avg_cost — decimal(15,4) → 4 desimal
    const fmtAvg = (n) =>
        parseFloat(n || 0).toLocaleString("id-ID", {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
        });

    const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString("id-ID", {
            day: "2-digit", month: "short", year: "numeric",
        }) : "-";

    const st = STATUS_CFG[repack.status] ?? STATUS_CFG.draft;
    // total_cost di items adalah decimal(15,2) → parseFloat sum
    const totalInputCost = repack.items?.reduce(
        (s, i) => s + parseFloat(i.total_cost || 0), 0
    ) ?? 0;

    const handleComplete = () => {
        router.post(route("repacks.complete", repack.id), {}, {
            onSuccess: () => { toast.success("Repack berhasil diselesaikan!"); setShowCompleteModal(false); },
            onError: (e) => { toast.error(Object.values(e)[0]); setShowCompleteModal(false); },
        });
    };

    const handleCancel = () => {
        router.post(route("repacks.cancel", repack.id), { reason: cancelReason }, {
            onSuccess: () => { toast.success("Repack dibatalkan."); setShowCancelModal(false); },
            onError: (e) => toast.error(Object.values(e)[0]),
        });
    };

    const canEdit = ["draft", "pending"].includes(repack.status);
    const canComplete = ["draft", "pending", "approved"].includes(repack.status);
    const canCancel = ["draft", "pending", "approved"].includes(repack.status);

    return (
        <>
            <Head title={`Repack ${repack.repack_number}`} />

            {/* ── Cancel Modal ──────────────────────────────────────────────────── */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                            <IconX size={20} className="text-red-500" /> Batalkan Repack
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">Alasan pembatalan (opsional):</p>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            rows={3}
                            placeholder="Contoh: Bahan tidak cukup..."
                            className="w-full rounded-xl border-slate-200 dark:bg-slate-950 text-sm resize-none mb-4"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm"
                            >
                                Kembali
                            </button>
                            <button
                                onClick={handleCancel}
                                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm"
                            >
                                Ya, Batalkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Complete Confirmation Modal ───────────────────────────────────── */}
            {showCompleteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                            <IconCheck size={20} className="text-success-500" /> Selesaikan Repack
                        </h3>
                        <p className="text-sm text-slate-500 mb-2">
                            Konfirmasi penyelesaian repack{" "}
                            <span className="font-bold text-slate-700">{repack.repack_number}</span>?
                        </p>
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-5">
                            ⚠ Stok akan langsung diperbarui dan tindakan ini tidak dapat diubah.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowCompleteModal(false)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleComplete}
                                className="px-5 py-2 bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 text-white rounded-xl font-bold text-sm flex items-center gap-2"
                            >
                                <IconCheck size={15} /> Ya, Selesaikan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">

                {/* Top nav */}
                <div className="flex items-center justify-between mb-4">
                    <Link
                        href={route("repacks.index")}
                        className="flex items-center gap-2 text-slate-500 hover:text-primary-600 transition-all text-sm"
                    >
                        <IconArrowLeft size={18} /> Kembali
                    </Link>
                    <div className="flex gap-2">
                        {canEdit && (
                            <Link
                                href={route("repacks.edit", repack.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-100"
                            >
                                <IconPencilCog size={16} /> Edit
                            </Link>
                        )}
                        {canCancel && (
                            <button
                                onClick={() => setShowCancelModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100"
                            >
                                <IconX size={16} /> Batalkan
                            </button>
                        )}
                        {canComplete && (
                            <button
                                onClick={() => setShowCompleteModal(true)}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-success-600 to-success-700 text-white rounded-xl text-sm font-bold hover:from-success-700 hover:to-success-800 shadow-md shadow-success-500/30"
                            >
                                <IconCheck size={16} /> Selesaikan Repack
                            </button>
                        )}
                    </div>
                </div>

                {/* Header card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                                <IconFlask size={28} className="text-violet-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                                    {repack.repack_number}
                                </h1>
                                <p className="text-slate-500 text-sm">
                                    {fmtDate(repack.repack_date)} · {repack.location_name}
                                </p>
                            </div>
                        </div>
                        <span className={`text-xs px-3 py-1.5 rounded-full font-bold border ${st.cls}`}>
                            {st.label}
                        </span>
                    </div>

                    {repack.status === "completed" && (
                        <div className="mt-4 p-3 bg-success-50 dark:bg-success-900/20 rounded-xl border border-success-200 flex items-center gap-2 text-sm text-success-700">
                            <IconCheck size={16} /> Repack selesai · Stok telah diperbarui
                            {repack.approver && (
                                <span className="text-xs text-success-500 ml-2">
                                    Oleh: {repack.approver.name}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

                    {/* Input items */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <h2 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <IconTrendingDown size={16} className="text-red-500" /> Ingredient Input (Dikurangi)
                        </h2>
                        <div className="space-y-2">
                            {repack.items?.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100"
                                >
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                            {item.ingredient?.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {item.ingredient?.code} · {item.ingredient?.unit}
                                        </div>
                                        {item.current_stock !== undefined && (
                                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                                                Stok saat ini: {fmtQty(item.current_stock)} {item.ingredient?.unit}
                                                {parseInt(item.current_stock) < parseInt(item.quantity) && (
                                                    <span className="ml-1 text-red-600 font-bold flex items-center gap-0.5">
                                                        <IconAlertTriangle size={11} /> Tidak cukup!
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        {/* quantity → bigInteger */}
                                        <div className="font-bold text-red-600 text-lg">
                                            -{fmtQty(item.quantity)}{" "}
                                            <span className="text-sm">{item.ingredient?.unit}</span>
                                        </div>
                                        {/* unit_cost → decimal(15,4) */}
                                        <div className="text-xs text-slate-400">@ {fmt(item.unit_cost)}</div>
                                        {/* total_cost → decimal(15,2) */}
                                        <div className="text-xs font-bold text-slate-600">{fmt(item.total_cost)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Output & summary */}
                    <div className="space-y-4">

                        {/* Output */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <h2 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <IconTrendingUp size={16} className="text-success-500" /> Output (Ditambah)
                            </h2>
                            <div className="p-3 bg-success-50 dark:bg-success-900/10 rounded-xl border border-success-200">
                                <div className="font-bold text-slate-800 dark:text-slate-200">
                                    {repack.repack_ingredient?.name}
                                </div>
                                <div className="text-xs text-slate-500 mb-2">
                                    {repack.repack_ingredient?.code} · {repack.repack_ingredient?.unit}
                                </div>
                                {/* output_quantity → bigInteger */}
                                <div className="text-2xl font-black text-success-600">
                                    +{fmtQty(repack.output_quantity)}{" "}
                                    <span className="text-sm">{repack.repack_ingredient?.unit}</span>
                                </div>
                                {/* output_cost → decimal(15,4) */}
                                <div className="text-xs text-slate-400 mt-1">
                                    @ {fmt(repack.output_cost)}/unit
                                </div>
                                {repack.output_current_stock !== undefined && (
                                    <div className="text-xs text-slate-500 mt-1">
                                        Stok saat ini: {fmtQty(repack.output_current_stock)}{" "}
                                        {repack.repack_ingredient?.unit}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Cost summary */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <h3 className="font-bold text-slate-600 text-xs uppercase tracking-wide mb-3">
                                Ringkasan Biaya
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Cost Input</span>
                                    <span className="font-bold">{fmt(totalInputCost)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Output Qty</span>
                                    <span className="font-bold">
                                        {fmtQty(repack.output_quantity)} {repack.repack_ingredient?.unit}
                                    </span>
                                </div>
                                <div className="border-t pt-2 flex justify-between">
                                    <span className="text-slate-500">Cost/Unit Output</span>
                                    {/* output_cost decimal(15,4) */}
                                    <span className="font-black text-violet-600">{fmt(repack.output_cost)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-xs text-slate-500 space-y-1.5">
                            {repack.creator && (
                                <div className="flex items-center gap-1.5">
                                    <IconUser size={12} /> Dibuat: {repack.creator.name}
                                </div>
                            )}
                            {repack.notes && (
                                <div className="flex items-start gap-1.5">
                                    <IconInfoCircle size={12} className="mt-0.5 shrink-0" />
                                    <span>{repack.notes}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stock movements log */}
                {movements.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <IconHistory size={20} className="text-primary-600" />
                            <div>
                                <h2 className="font-bold text-slate-800 dark:text-white">Log Pergerakan Stok</h2>
                                <p className="text-xs text-slate-500">
                                    Perubahan stok yang terjadi akibat repack ini
                                </p>
                            </div>
                        </div>
                        <Table>
                            <Table.Thead>
                                <tr>
                                    <Table.Th>Tipe</Table.Th>
                                    <Table.Th>Item</Table.Th>
                                    {/* qty_change sesuai migration (bukan quantity) */}
                                    <Table.Th className="text-right">Perubahan Qty</Table.Th>
                                    {/* qty_before sesuai migration (bukan stock_before) */}
                                    <Table.Th className="text-right">Sebelum</Table.Th>
                                    {/* qty_after sesuai migration (bukan stock_after) */}
                                    <Table.Th className="text-right">Sesudah</Table.Th>
                                    {/* avg_cost_after → decimal(15,4) */}
                                    <Table.Th className="text-right">Avg Cost Baru</Table.Th>
                                    <Table.Th>Waktu</Table.Th>
                                </tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {movements.map((mv) => {
                                    // qty_change: positif = masuk, negatif = keluar
                                    const isIn = parseInt(mv.qty_change) > 0;
                                    return (
                                        <tr
                                            key={mv.id}
                                            className="border-b border-slate-100 dark:border-slate-800"
                                        >
                                            <Table.Td>
                                                <span className={`text-xs px-2 py-1 rounded-lg font-bold ${isIn
                                                        ? "bg-success-100 text-success-700"
                                                        : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {isIn ? "Repack Masuk" : "Repack Keluar"}
                                                </span>
                                            </Table.Td>
                                            <Table.Td>
                                                <div className="text-sm font-bold">{mv.item_name}</div>
                                            </Table.Td>
                                            <Table.Td className="text-right">
                                                {/* qty_change → bigInteger SIGNED */}
                                                <span className={`font-bold ${isIn ? "text-success-600" : "text-red-600"}`}>
                                                    {isIn ? "+" : ""}{fmtQty(mv.qty_change)}
                                                </span>
                                            </Table.Td>
                                            {/* qty_before → bigInteger */}
                                            <Table.Td className="text-right text-sm text-slate-500">
                                                {fmtQty(mv.qty_before)}
                                            </Table.Td>
                                            {/* qty_after → bigInteger */}
                                            <Table.Td className="text-right text-sm font-bold text-slate-700">
                                                {fmtQty(mv.qty_after)}
                                            </Table.Td>
                                            {/* avg_cost_after → decimal(15,4) */}
                                            <Table.Td className="text-right text-sm text-slate-500">
                                                {fmt(mv.avg_cost_after)}
                                            </Table.Td>
                                            <Table.Td>
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <IconClock size={11} />
                                                    {mv.created_at
                                                        ? new Date(mv.created_at).toLocaleString("id-ID")
                                                        : "-"}
                                                </div>
                                            </Table.Td>
                                        </tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </div>
                )}
            </div>
        </>
    );
}

Show.layout = (page) => <DashboardLayout children={page} />;