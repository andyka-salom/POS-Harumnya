import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import Table from "@/Components/Dashboard/Table";
import {
    IconArrowLeft, IconAdjustments, IconCheck, IconX, IconSend,
    IconPencilCog, IconHistory, IconTrendingUp, IconTrendingDown,
    IconInfoCircle,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

const STATUS_CFG = {
    draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-300",             step: 0 },
    pending:   { label: "Menunggu",  cls: "bg-yellow-100 text-yellow-700 border-yellow-300",           step: 1 },
    approved:  { label: "Disetujui", cls: "bg-blue-100 text-blue-700 border-blue-300",                step: 2 },
    completed: { label: "Selesai",   cls: "bg-success-100 text-success-700 border-success-300",        step: 3 },
    cancelled: { label: "Dibatal",   cls: "bg-red-100 text-red-700 border-red-300",                    step: -1 },
};
const STEPS = ["Draft", "Menunggu", "Disetujui", "Selesai"];

// Rupiah — value_difference adalah decimal(15,2) → parseFloat
const fmt = (n) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR", minimumFractionDigits: 0,
    }).format(parseFloat(n) || 0);

// Qty — bigInteger SIGNED → parseInt
const fmtQty = (n) => parseInt(n || 0).toLocaleString("id-ID");

// avg_cost — decimal(15,4) → 2-4 desimal
const fmtCost = (n) =>
    parseFloat(n || 0).toLocaleString("id-ID", {
        minimumFractionDigits: 2, maximumFractionDigits: 4,
    });

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("id-ID", {
        day: "2-digit", month: "long", year: "numeric",
    }) : "-";

export default function Show({ adjustment, movements = [] }) {
    const [showCancelModal,   setShowCancelModal]   = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [cancelReason,      setCancelReason]      = useState("");

    const st   = STATUS_CFG[adjustment.status] ?? STATUS_CFG.draft;
    const step = st.step;

    // value_difference adalah decimal(15,2) → parseFloat
    const totalSurplus  = adjustment.items?.reduce(
        (s, i) => s + (parseInt(i.difference) > 0 ? parseFloat(i.value_difference) : 0), 0
    ) ?? 0;
    const totalShortage = adjustment.items?.reduce(
        (s, i) => s + (parseInt(i.difference) < 0 ? Math.abs(parseFloat(i.value_difference)) : 0), 0
    ) ?? 0;
    const netEffect = totalSurplus - totalShortage;

    const doAction = (url, body, msg, closeModal) =>
        router.post(url, body, {
            onSuccess: () => { toast.success(msg); if (closeModal) closeModal(); },
            onError:   (e) => toast.error(Object.values(e)[0]),
        });

    return (
        <>
            <Head title={`Adjustment ${adjustment.adjustment_number}`} />

            {/* ── Cancel Modal ──────────────────────────────────────────────────── */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <IconX size={20} className="text-red-500" /> Batalkan Adjustment
                        </h3>
                        <p className="text-sm text-slate-500 mb-3">Alasan pembatalan (opsional):</p>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            rows={3}
                            placeholder="Alasan pembatalan..."
                            className="w-full rounded-xl border-slate-200 dark:bg-slate-950 text-sm resize-none mb-4"
                        />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowCancelModal(false)}
                                className="px-5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm">
                                Kembali
                            </button>
                            <button onClick={() => doAction(
                                route("stock-adjustments.cancel", adjustment.id),
                                { reason: cancelReason },
                                "Adjustment dibatalkan.",
                                () => setShowCancelModal(false)
                            )} className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm">
                                Ya, Batalkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Complete Confirmation Modal ────────────────────────────────────── */}
            {showCompleteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <IconCheck size={20} className="text-success-500" /> Selesaikan Adjustment
                        </h3>
                        <p className="text-sm text-slate-500 mb-2">
                            Konfirmasi penyelesaian adjustment{" "}
                            <span className="font-bold text-slate-700">{adjustment.adjustment_number}</span>?
                        </p>
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-5">
                            ⚠ Stok akan langsung diubah sesuai selisih fisik. Tindakan ini tidak dapat diubah.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowCompleteModal(false)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">
                                Batal
                            </button>
                            <button onClick={() => doAction(
                                route("stock-adjustments.complete", adjustment.id),
                                {},
                                "Stok berhasil disesuaikan!",
                                () => setShowCompleteModal(false)
                            )} className="px-5 py-2 bg-gradient-to-r from-success-600 to-success-700 hover:from-success-700 hover:to-success-800 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                                <IconCheck size={15} /> Ya, Selesaikan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-4">
                    <Link href={route("stock-adjustments.index")}
                        className="flex items-center gap-2 text-slate-500 hover:text-orange-600 text-sm">
                        <IconArrowLeft size={18} /> Kembali
                    </Link>
                    <div className="flex gap-2">
                        {adjustment.can_edit && (
                            <Link href={route("stock-adjustments.edit", adjustment.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-100">
                                <IconPencilCog size={16} /> Edit
                            </Link>
                        )}
                        {adjustment.status === "draft" && (
                            <button
                                onClick={() => doAction(route("stock-adjustments.submit", adjustment.id), {}, "Diajukan untuk approval.")}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-bold">
                                <IconSend size={16} /> Ajukan
                            </button>
                        )}
                        {adjustment.status === "pending" && (
                            <button
                                onClick={() => doAction(route("stock-adjustments.approve", adjustment.id), {}, "Adjustment disetujui.")}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold">
                                <IconCheck size={16} /> Setujui
                            </button>
                        )}
                        {adjustment.status === "approved" && (
                            <button onClick={() => setShowCompleteModal(true)}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-success-600 to-success-700 text-white rounded-xl text-sm font-bold shadow-md">
                                <IconCheck size={16} /> Selesaikan
                            </button>
                        )}
                        {["draft", "pending", "approved"].includes(adjustment.status) && (
                            <button onClick={() => setShowCancelModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100">
                                <IconX size={16} /> Batalkan
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress stepper */}
                {adjustment.status !== "cancelled" && (
                    <div className="mb-4 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                            {STEPS.map((s, i) => (
                                <React.Fragment key={s}>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                            i < step  ? "bg-success-500 border-success-500 text-white"
                                            : i === step ? "bg-orange-500 border-orange-500 text-white"
                                            : "bg-white border-slate-300 text-slate-400"
                                        }`}>
                                            {i < step ? <IconCheck size={14} /> : i + 1}
                                        </div>
                                        <span className={`text-[10px] font-bold ${i <= step ? "text-orange-600" : "text-slate-400"}`}>
                                            {s}
                                        </span>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-success-400" : "bg-slate-200"}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}

                {/* Header card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                <IconAdjustments size={28} className="text-orange-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                                    {adjustment.adjustment_number}
                                </h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${st.cls}`}>
                                        {st.label}
                                    </span>
                                    <span className="text-sm text-slate-500">{fmtDate(adjustment.adjustment_date)}</span>
                                    <span className="text-sm font-bold text-orange-600">{adjustment.type_label}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net summary — value_difference adalah decimal(15,2) */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded-xl border border-success-200 text-center">
                            <p className="text-xs text-success-600 font-bold mb-1 flex items-center justify-center gap-1">
                                <IconTrendingUp size={12} /> Surplus
                            </p>
                            <p className="font-black text-success-700">{fmt(totalSurplus)}</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 text-center">
                            <p className="text-xs text-red-600 font-bold mb-1 flex items-center justify-center gap-1">
                                <IconTrendingDown size={12} /> Kekurangan
                            </p>
                            <p className="font-black text-red-700">{fmt(totalShortage)}</p>
                        </div>
                        <div className={`p-3 rounded-xl border text-center ${netEffect >= 0 ? "bg-success-50 border-success-200" : "bg-red-50 border-red-200"}`}>
                            <p className="text-xs font-bold mb-1 text-slate-600">Net Effect</p>
                            <p className={`font-black ${netEffect >= 0 ? "text-success-700" : "text-red-700"}`}>
                                {netEffect >= 0 ? "+" : ""}{fmt(netEffect)}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-500">
                        {[
                            { label: "Lokasi",    value: `${adjustment.location_name} (${adjustment.location_type})` },
                            { label: "Dibuat",    value: adjustment.creator?.name ?? "-" },
                            { label: "Disetujui", value: adjustment.approver?.name ?? "-" },
                        ].map(({ label, value }) => (
                            <div key={label} className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                <span className="block font-bold text-slate-400 mb-0.5">{label}</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{value}</span>
                            </div>
                        ))}
                    </div>

                    {adjustment.notes && (
                        <p className="mt-3 text-sm text-slate-500 p-3 bg-slate-50 rounded-xl flex items-start gap-2">
                            <IconInfoCircle size={14} className="mt-0.5 shrink-0 text-slate-400" />
                            {adjustment.notes}
                        </p>
                    )}
                </div>

                {/* Items table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden mb-4 shadow-sm">
                    <div className="p-5 border-b border-slate-200">
                        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Rincian Item</h2>
                    </div>
                    <Table>
                        <Table.Thead>
                            <tr>
                                <Table.Th>Item</Table.Th>
                                {/* system/physical/difference → bigInteger SIGNED → parseInt */}
                                <Table.Th className="text-right">Qty Sistem</Table.Th>
                                <Table.Th className="text-right">Qty Fisik</Table.Th>
                                <Table.Th className="text-right">Selisih</Table.Th>
                                {/* unit_cost → decimal(15,4) */}
                                <Table.Th className="text-right">Avg Cost</Table.Th>
                                {/* value_difference → decimal(15,2) */}
                                <Table.Th className="text-right">Nilai Selisih</Table.Th>
                            </tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {adjustment.items?.map((item) => {
                                const diff = parseInt(item.difference); // bigInteger SIGNED
                                return (
                                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                                        <Table.Td>
                                            <div className="font-bold text-sm">{item.item_name}</div>
                                            <div className="text-xs text-slate-400">{item.item_code} · {item.item_unit}</div>
                                            {item.notes && <div className="text-xs text-slate-400 italic">{item.notes}</div>}
                                        </Table.Td>
                                        <Table.Td className="text-right font-mono text-sm text-slate-500">
                                            {fmtQty(item.system_quantity)}
                                        </Table.Td>
                                        <Table.Td className="text-right font-mono text-sm font-bold text-slate-700">
                                            {fmtQty(item.physical_quantity)}
                                        </Table.Td>
                                        <Table.Td className={`text-right font-bold text-sm ${
                                            diff > 0 ? "text-success-600"
                                            : diff < 0 ? "text-red-600"
                                            : "text-slate-400"
                                        }`}>
                                            <div className="flex items-center justify-end gap-1">
                                                {diff > 0 ? <IconTrendingUp size={14} />
                                                 : diff < 0 ? <IconTrendingDown size={14} /> : null}
                                                {diff > 0 ? "+" : ""}{fmtQty(diff)}
                                            </div>
                                        </Table.Td>
                                        {/* unit_cost → decimal(15,4) */}
                                        <Table.Td className="text-right text-sm text-slate-500">
                                            {fmtCost(item.unit_cost)}
                                        </Table.Td>
                                        {/* value_difference → decimal(15,2) → parseFloat */}
                                        <Table.Td className={`text-right font-bold text-sm ${
                                            diff > 0 ? "text-success-600"
                                            : diff < 0 ? "text-red-600"
                                            : "text-slate-400"
                                        }`}>
                                            {diff < 0 ? "-" : ""}{fmt(item.value_difference)}
                                        </Table.Td>
                                    </tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </div>

                {/* Stock movement log */}
                {movements.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b flex items-center gap-2">
                            <IconHistory size={20} className="text-orange-600" />
                            <div>
                                <h2 className="font-bold text-slate-800 dark:text-white">Log Pergerakan Stok</h2>
                                <p className="text-xs text-slate-500">Perubahan stok akibat adjustment ini</p>
                            </div>
                        </div>
                        <Table>
                            <Table.Thead>
                                <tr>
                                    <Table.Th>Tipe</Table.Th>
                                    <Table.Th>Item</Table.Th>
                                    {/* qty_change → bigInteger SIGNED sesuai migration */}
                                    <Table.Th className="text-right">Perubahan Qty</Table.Th>
                                    {/* qty_before / qty_after → bigInteger */}
                                    <Table.Th className="text-right">Sebelum → Sesudah</Table.Th>
                                    {/* avg_cost_before / after → decimal(15,4) */}
                                    <Table.Th className="text-right">Avg Cost</Table.Th>
                                    <Table.Th>Waktu</Table.Th>
                                </tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {movements.map((mv) => {
                                    // qty_change: positif = masuk, negatif = keluar
                                    const isIn = parseInt(mv.qty_change) > 0;
                                    return (
                                        <tr key={mv.id} className="border-b border-slate-100 dark:border-slate-800">
                                            <Table.Td>
                                                <span className={`text-xs px-2 py-1 rounded-lg font-bold ${
                                                    isIn ? "bg-success-100 text-success-700" : "bg-red-100 text-red-700"
                                                }`}>
                                                    {isIn ? "Penyesuaian +" : "Penyesuaian −"}
                                                </span>
                                            </Table.Td>
                                            <Table.Td>
                                                <div className="text-sm font-bold">{mv.item_name}</div>
                                            </Table.Td>
                                            {/* qty_change → bigInteger SIGNED */}
                                            <Table.Td className={`text-right font-bold ${isIn ? "text-success-600" : "text-red-600"}`}>
                                                {isIn ? "+" : ""}{fmtQty(mv.qty_change)}
                                            </Table.Td>
                                            {/* qty_before / qty_after → bigInteger */}
                                            <Table.Td className="text-right text-xs">
                                                {fmtQty(mv.qty_before)} →{" "}
                                                <span className="font-bold">{fmtQty(mv.qty_after)}</span>
                                            </Table.Td>
                                            {/* avg_cost_before / after → decimal(15,4) */}
                                            <Table.Td className="text-right text-xs">
                                                {fmtCost(mv.avg_cost_before)} →{" "}
                                                <span className="font-bold">{fmtCost(mv.avg_cost_after)}</span>
                                            </Table.Td>
                                            <Table.Td className="text-xs text-slate-500">
                                                {mv.created_at ? new Date(mv.created_at).toLocaleString("id-ID") : "-"}
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
