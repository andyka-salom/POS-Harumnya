import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import Table from "@/Components/Dashboard/Table";
import {
    IconArrowLeft, IconArrowRight, IconTransfer, IconCheck, IconX,
    IconSend, IconDownload, IconAlertTriangle, IconHistory,
    IconClock, IconPencilCog, IconTrendingUp, IconTrendingDown,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

const STATUS_CFG = {
    draft:      { label: "Draft",           cls: "bg-slate-100 text-slate-600 border-slate-300",      step: 0 },
    pending:    { label: "Menunggu",         cls: "bg-yellow-100 text-yellow-700 border-yellow-300",   step: 1 },
    approved:   { label: "Disetujui",        cls: "bg-blue-100 text-blue-700 border-blue-300",         step: 2 },
    in_transit: { label: "Dalam Perjalanan", cls: "bg-violet-100 text-violet-700 border-violet-300",   step: 3 },
    completed:  { label: "Selesai",          cls: "bg-success-100 text-success-700 border-success-300", step: 4 },
    cancelled:  { label: "Dibatalkan",       cls: "bg-red-100 text-red-700 border-red-300",            step: -1 },
};

const STEPS = ["Draft", "Menunggu", "Disetujui", "Dikirim", "Selesai"];

export default function Show({ transfer, movements = [] }) {
    const [showSendModal,    setShowSendModal]    = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [showCancelModal,  setShowCancelModal]  = useState(false);
    const [cancelReason,     setCancelReason]     = useState("");

    // Per-item qty overrides untuk send/receive modal
    const [sentQtys,   setSentQtys]   = useState({});
    const [rcvdQtys,   setRcvdQtys]   = useState({});
    const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split("T")[0]);

    // Rupiah — parseFloat karena unit_cost/avg_cost adalah decimal
    const fmt = (n) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency", currency: "IDR", minimumFractionDigits: 0,
        }).format(parseFloat(n) || 0);

    // Qty — bigInteger → parseInt
    const fmtQty  = (n) => parseInt(n || 0).toLocaleString("id-ID");

    // avg_cost decimal(15,4) → tampilkan 4 desimal
    const fmtAvg  = (n) =>
        parseFloat(n || 0).toLocaleString("id-ID", {
            minimumFractionDigits: 2, maximumFractionDigits: 4,
        });

    const fmtDate = (d) =>
        d ? new Date(d).toLocaleDateString("id-ID", {
            day: "2-digit", month: "long", year: "numeric",
        }) : "-";
    const fmtTs   = (d) => d ? new Date(d).toLocaleString("id-ID") : "-";

    const st   = STATUS_CFG[transfer.status] ?? STATUS_CFG.draft;
    const step = st.step;

    const doAction = (url, body, successMsg) => {
        router.post(url, body, {
            onSuccess: () => {
                toast.success(successMsg);
                setShowSendModal(false);
                setShowReceiveModal(false);
                setShowCancelModal(false);
            },
            onError: (e) => toast.error(Object.values(e)[0]),
        });
    };

    const handleSubmit  = () => doAction(route("stock-transfers.submit",  transfer.id), {}, "Transfer diajukan untuk approval.");
    const handleApprove = () => doAction(route("stock-transfers.approve", transfer.id), {}, "Transfer disetujui.");
    const handleCancel  = () => doAction(route("stock-transfers.cancel",  transfer.id), { reason: cancelReason }, "Transfer dibatalkan.");

    const handleSend = () => {
        const items = transfer.items.map((item) => ({
            id:            item.id,
            // quantity_sent → bigInteger: kirim sebagai integer
            quantity_sent: parseInt(sentQtys[item.id] ?? item.quantity_requested) || 0,
        }));
        doAction(route("stock-transfers.send", transfer.id), { items }, "Transfer dikirim! Stok telah dikurangi dari lokasi asal.");
    };

    const handleReceive = () => {
        const items = transfer.items.map((item) => ({
            id:                item.id,
            // quantity_received → bigInteger: kirim sebagai integer
            quantity_received: parseInt(rcvdQtys[item.id] ?? item.quantity_sent) || 0,
        }));
        doAction(route("stock-transfers.receive", transfer.id), { items, actual_arrival_date: arrivalDate }, "Stok berhasil diterima!");
    };

    return (
        <>
            <Head title={`Transfer ${transfer.transfer_number}`} />

            {/* ── Send Modal ────────────────────────────────────────────────────── */}
            {showSendModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                            <IconSend size={20} className="text-primary-500" /> Konfirmasi Pengiriman
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Verifikasi jumlah yang benar-benar dikirim. Stok akan dikurangi dari{" "}
                            <strong>{transfer.from_name}</strong>.
                        </p>
                        <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-1">
                            {transfer.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                    <div className="flex-1">
                                        <div className="font-bold text-sm">{item.item_name}</div>
                                        <div className="text-xs text-slate-400">
                                            {item.item_unit} · Diminta: {fmtQty(item.quantity_requested)}
                                        </div>
                                        {parseInt(item.source_stock) < parseInt(item.quantity_requested) && (
                                            <div className="text-xs text-red-500 font-bold flex items-center gap-1 mt-0.5">
                                                <IconAlertTriangle size={11} /> Stok hanya {fmtQty(item.source_stock)}
                                            </div>
                                        )}
                                    </div>
                                    {/* quantity_sent → bigInteger: step=1 */}
                                    <div className="w-28">
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={sentQtys[item.id] ?? item.quantity_requested}
                                            onChange={(e) => setSentQtys({ ...sentQtys, [item.id]: e.target.value })}
                                            className="w-full rounded-xl border-slate-200 text-sm text-right"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowSendModal(false)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">
                                Batal
                            </button>
                            <button onClick={handleSend}
                                className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                                <IconSend size={16} /> Kirim Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Receive Modal ─────────────────────────────────────────────────── */}
            {showReceiveModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                            <IconDownload size={20} className="text-success-600" /> Konfirmasi Penerimaan
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Verifikasi jumlah yang benar-benar diterima di <strong>{transfer.to_name}</strong>.
                        </p>
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Tiba Aktual</label>
                            <input
                                type="date"
                                value={arrivalDate}
                                onChange={(e) => setArrivalDate(e.target.value)}
                                className="w-full md:w-48 rounded-xl border-slate-200 text-sm"
                            />
                        </div>
                        <div className="space-y-2 mb-5 max-h-60 overflow-y-auto pr-1">
                            {transfer.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                    <div className="flex-1">
                                        <div className="font-bold text-sm">{item.item_name}</div>
                                        <div className="text-xs text-slate-400">
                                            {item.item_unit} · Dikirim: {fmtQty(item.quantity_sent)}
                                        </div>
                                    </div>
                                    {/* quantity_received → bigInteger: step=1 */}
                                    <div className="w-28">
                                        <input
                                            type="number"
                                            step="1"
                                            min="0"
                                            value={rcvdQtys[item.id] ?? item.quantity_sent}
                                            onChange={(e) => setRcvdQtys({ ...rcvdQtys, [item.id]: e.target.value })}
                                            className="w-full rounded-xl border-slate-200 text-sm text-right"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowReceiveModal(false)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">
                                Batal
                            </button>
                            <button onClick={handleReceive}
                                className="px-5 py-2 bg-success-500 hover:bg-success-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                                <IconCheck size={16} /> Konfirmasi Diterima
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Cancel Modal ──────────────────────────────────────────────────── */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <IconX size={20} className="text-red-500" /> Batalkan Transfer
                        </h3>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            rows={3}
                            placeholder="Alasan pembatalan..."
                            className="w-full rounded-xl border-slate-200 dark:bg-slate-950 text-sm resize-none mb-4"
                        />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowCancelModal(false)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">
                                Kembali
                            </button>
                            <button onClick={handleCancel}
                                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm">
                                Ya, Batalkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">

                {/* Top bar */}
                <div className="flex items-center justify-between mb-4">
                    <Link
                        href={route("stock-transfers.index")}
                        className="flex items-center gap-2 text-slate-500 hover:text-primary-600 text-sm"
                    >
                        <IconArrowLeft size={18} /> Kembali
                    </Link>
                    <div className="flex gap-2">
                        {transfer.can_edit && (
                            <Link
                                href={route("stock-transfers.edit", transfer.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-100"
                            >
                                <IconPencilCog size={16} /> Edit
                            </Link>
                        )}
                        {transfer.status === "draft" && (
                            <button onClick={handleSubmit}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-bold">
                                <IconSend size={16} /> Ajukan
                            </button>
                        )}
                        {transfer.status === "pending" && (
                            <button onClick={handleApprove}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold">
                                <IconCheck size={16} /> Setujui
                            </button>
                        )}
                        {transfer.status === "approved" && (
                            <button onClick={() => setShowSendModal(true)}
                                className="flex items-center gap-2 px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md">
                                <IconSend size={16} /> Kirim
                            </button>
                        )}
                        {transfer.status === "in_transit" && (
                            <button onClick={() => setShowReceiveModal(true)}
                                className="flex items-center gap-2 px-5 py-2 bg-success-500 hover:bg-success-600 text-white rounded-xl text-sm font-bold shadow-md">
                                <IconDownload size={16} /> Terima
                            </button>
                        )}
                        {["draft", "pending", "approved"].includes(transfer.status) && (
                            <button onClick={() => setShowCancelModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100">
                                <IconX size={16} /> Batalkan
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress steps */}
                {transfer.status !== "cancelled" && (
                    <div className="mb-4 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                            {STEPS.map((s, i) => (
                                <React.Fragment key={s}>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                                            i < step  ? "bg-success-500 border-success-500 text-white"
                                            : i === step ? "bg-primary-500 border-primary-500 text-white"
                                            : "bg-white border-slate-300 text-slate-400"
                                        }`}>
                                            {i < step ? <IconCheck size={14} /> : i + 1}
                                        </div>
                                        <span className={`text-[10px] font-bold whitespace-nowrap ${
                                            i <= step ? "text-primary-600" : "text-slate-400"
                                        }`}>{s}</span>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-success-400" : "bg-slate-200"}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}

                {/* Header info */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                                <IconTransfer size={28} className="text-primary-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                                    {transfer.transfer_number}
                                </h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${st.cls}`}>
                                        {st.label}
                                    </span>
                                    <span className="text-sm text-slate-500">{fmtDate(transfer.transfer_date)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <div className="flex-1 text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100">
                            <p className="text-xs text-red-500 font-bold uppercase mb-1">Dari</p>
                            <p className="font-black text-slate-800 dark:text-slate-200">{transfer.from_name}</p>
                            <p className="text-xs text-slate-400 capitalize">{transfer.from_location_type}</p>
                        </div>
                        <IconArrowRight size={24} className="text-slate-400 shrink-0" />
                        <div className="flex-1 text-center p-3 bg-success-50 dark:bg-success-900/20 rounded-xl border border-success-100">
                            <p className="text-xs text-success-600 font-bold uppercase mb-1">Ke</p>
                            <p className="font-black text-slate-800 dark:text-slate-200">{transfer.to_name}</p>
                            <p className="text-xs text-slate-400 capitalize">{transfer.to_location_type}</p>
                        </div>
                    </div>

                    {/* Dates & audit */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs text-slate-500">
                        {[
                            { label: "Tgl Transfer", value: fmtDate(transfer.transfer_date) },
                            { label: "Est. Tiba",    value: fmtDate(transfer.expected_arrival_date) },
                            { label: "Tiba Aktual",  value: fmtDate(transfer.actual_arrival_date) },
                            { label: "Dibuat",       value: transfer.creator?.name ?? "-" },
                        ].map(({ label, value }) => (
                            <div key={label} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                <span className="block font-bold text-slate-400 mb-0.5">{label}</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{value}</span>
                            </div>
                        ))}
                    </div>

                    {transfer.notes && (
                        <p className="mt-3 text-sm text-slate-500 p-3 bg-slate-50 rounded-xl">{transfer.notes}</p>
                    )}
                </div>

                {/* Items table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden mb-4 shadow-sm">
                    <div className="p-5 border-b border-slate-200">
                        <h2 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                            Item Transfer
                        </h2>
                    </div>
                    <Table>
                        <Table.Thead>
                            <tr>
                                <Table.Th>Item</Table.Th>
                                <Table.Th>Tipe</Table.Th>
                                {/* Qty → bigInteger → tampilkan sebagai integer */}
                                <Table.Th className="text-right">Diminta</Table.Th>
                                <Table.Th className="text-right">Dikirim</Table.Th>
                                <Table.Th className="text-right">Diterima</Table.Th>
                                {/* unit_cost → decimal(15,4) */}
                                <Table.Th className="text-right">Unit Cost</Table.Th>
                                <Table.Th className="text-right">Total Nilai</Table.Th>
                                {["draft", "pending", "approved"].includes(transfer.status) && (
                                    <Table.Th className="text-right">Stok Tersedia</Table.Th>
                                )}
                            </tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {transfer.items?.map((item) => {
                                const shortage = parseInt(item.source_stock ?? 0) < parseInt(item.quantity_requested);
                                // Total nilai — gunakan quantity_received jika sudah ada, else quantity_requested
                                const valuableQty = parseInt(item.quantity_received) > 0
                                    ? parseInt(item.quantity_received)
                                    : parseInt(item.quantity_requested);
                                return (
                                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                                        <Table.Td>
                                            <div className="font-bold text-sm">{item.item_name}</div>
                                            <div className="text-xs text-slate-400">{item.item_code} · {item.item_unit}</div>
                                            {item.notes && <div className="text-xs text-slate-400 italic mt-0.5">{item.notes}</div>}
                                        </Table.Td>
                                        <Table.Td>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                                                {item.item_type.replace("_", " ")}
                                            </span>
                                        </Table.Td>
                                        <Table.Td className="text-right font-bold text-slate-700">
                                            {fmtQty(item.quantity_requested)}{" "}
                                            <span className="text-xs text-slate-400">{item.item_unit}</span>
                                        </Table.Td>
                                        <Table.Td className={`text-right font-bold ${
                                            parseInt(item.quantity_sent) < parseInt(item.quantity_requested)
                                                ? "text-amber-600" : "text-slate-700"
                                        }`}>
                                            {fmtQty(item.quantity_sent)}{" "}
                                            <span className="text-xs text-slate-400">{item.item_unit}</span>
                                        </Table.Td>
                                        <Table.Td className={`text-right font-bold ${
                                            parseInt(item.quantity_received) < parseInt(item.quantity_sent)
                                                ? "text-amber-600" : "text-success-600"
                                        }`}>
                                            {fmtQty(item.quantity_received)}{" "}
                                            <span className="text-xs text-slate-400">{item.item_unit}</span>
                                        </Table.Td>
                                        {/* unit_cost → decimal(15,4) */}
                                        <Table.Td className="text-right text-sm">{fmt(item.unit_cost)}</Table.Td>
                                        <Table.Td className="text-right font-bold text-slate-700">
                                            {fmt(valuableQty * parseFloat(item.unit_cost || 0))}
                                        </Table.Td>
                                        {["draft", "pending", "approved"].includes(transfer.status) && (
                                            <Table.Td className={`text-right font-bold ${shortage ? "text-red-600" : "text-success-600"}`}>
                                                {fmtQty(item.source_stock ?? 0)}
                                                {shortage && (
                                                    <IconAlertTriangle size={12} className="inline ml-1 text-red-500" />
                                                )}
                                            </Table.Td>
                                        )}
                                    </tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </div>

                {/* Stock movement log */}
                {movements.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-slate-200 flex items-center gap-2">
                            <IconHistory size={20} className="text-primary-600" />
                            <div>
                                <h2 className="font-bold text-slate-800 dark:text-white">Log Pergerakan Stok</h2>
                                <p className="text-xs text-slate-500">Perubahan stok akibat transfer ini</p>
                            </div>
                        </div>
                        <Table>
                            <Table.Thead>
                                <tr>
                                    <Table.Th>Tipe</Table.Th>
                                    <Table.Th>Lokasi</Table.Th>
                                    {/* qty_change → bigInteger SIGNED sesuai migration */}
                                    <Table.Th className="text-right">Perubahan Qty</Table.Th>
                                    {/* qty_before / qty_after → bigInteger sesuai migration */}
                                    <Table.Th className="text-right">Sebelum → Sesudah</Table.Th>
                                    {/* avg_cost_before / avg_cost_after → decimal(15,4) */}
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
                                                <span className={`text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1 w-fit ${
                                                    isIn
                                                        ? "bg-success-100 text-success-700"
                                                        : "bg-red-100 text-red-700"
                                                }`}>
                                                    {isIn ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
                                                    {isIn ? "Transfer Masuk" : "Transfer Keluar"}
                                                </span>
                                            </Table.Td>
                                            <Table.Td className="text-sm">
                                                {mv.location_name ?? mv.location_type}
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
                                            {/* avg_cost_before / avg_cost_after → decimal(15,4) */}
                                            <Table.Td className="text-right text-xs">
                                                {fmt(mv.avg_cost_before)} →{" "}
                                                <span className="font-bold">{fmt(mv.avg_cost_after)}</span>
                                            </Table.Td>
                                            <Table.Td className="text-xs text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <IconClock size={11} />
                                                    {fmtTs(mv.created_at)}
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
