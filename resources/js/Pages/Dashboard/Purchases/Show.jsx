import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link, router } from "@inertiajs/react";
import Table from "@/Components/Dashboard/Table";
import {
    IconArrowLeft, IconShoppingBag, IconCheck, IconX, IconSend,
    IconTruck, IconPencilCog, IconHistory, IconTrendingUp,
    IconBuilding, IconCalendar, IconInfoCircle, IconAlertTriangle,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

const STATUS_CFG = {
    draft:     { label: "Draft",     cls: "bg-slate-100 text-slate-600 border-slate-300",           step: 0 },
    pending:   { label: "Menunggu",  cls: "bg-yellow-100 text-yellow-700 border-yellow-300",          step: 1 },
    approved:  { label: "Disetujui", cls: "bg-blue-100 text-blue-700 border-blue-300",               step: 2 },
    received:  { label: "Diterima",  cls: "bg-violet-100 text-violet-700 border-violet-300",          step: 3 },
    completed: { label: "Selesai",   cls: "bg-success-100 text-success-700 border-success-300",       step: 4 },
    cancelled: { label: "Dibatal",   cls: "bg-red-100 text-red-700 border-red-300",                   step: -1 },
};
const STEPS = ["Draft", "Menunggu", "Disetujui", "Diterima", "Selesai"];

const fmtRp   = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(parseInt(n) || 0);
const fmtQty  = (n) => parseInt(n || 0).toLocaleString("id-ID");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-";
const fmtTs   = (d) => d ? new Date(d).toLocaleString("id-ID") : "-";

// ─── Custom confirm modal ─────────────────────────────────────────────────────
function ConfirmModal({ open, onConfirm, onClose, title, description, confirmLabel = "Ya, Lanjutkan", confirmClass = "bg-indigo-600 hover:bg-indigo-700 text-white" }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                        <IconAlertTriangle size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{description}</p>
                    </div>
                </div>
                <div className="flex gap-3 justify-end">
                    <button onClick={onClose} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">Batal</button>
                    <button onClick={onConfirm} className={`px-5 py-2 rounded-xl font-bold text-sm ${confirmClass}`}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}

export default function Show({ purchase, movements = [] }) {
    const [showCancelModal,   setShowCancelModal]   = useState(false);
    const [showReceiveModal,  setShowReceiveModal]  = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [cancelReason,      setCancelReason]      = useState("");
    const [arrivalDate,       setArrivalDate]       = useState(new Date().toISOString().split("T")[0]);

    const st   = STATUS_CFG[purchase.status] ?? STATUS_CFG.draft;
    const step = st.step;

    const doAction = (url, body, msg) =>
        router.post(url, body, {
            onSuccess: () => {
                toast.success(msg);
                setShowCancelModal(false);
                setShowReceiveModal(false);
                setShowCompleteModal(false);
            },
            onError: (e) => toast.error(Object.values(e)[0]),
        });

    return (
        <>
            <Head title={`PO ${purchase.purchase_number}`} />

            {/* ── Cancel Modal ── */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <IconX size={20} className="text-red-500" /> Batalkan Purchase Order
                        </h3>
                        <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                            rows={3} placeholder="Alasan pembatalan..."
                            className="w-full rounded-xl border-slate-200 dark:bg-slate-950 text-sm resize-none mb-4" />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowCancelModal(false)} className="px-5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm">Kembali</button>
                            <button onClick={() => doAction(route("purchases.cancel", purchase.id), { reason: cancelReason }, "PO dibatalkan.")}
                                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm">Ya, Batalkan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Receive Modal ── */}
            {showReceiveModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <IconTruck size={20} className="text-violet-600" /> Konfirmasi Penerimaan Barang
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Tandai bahwa barang telah tiba di <strong>{purchase.destination_name}</strong>.
                            Stok belum berubah — perbarui stok dengan klik <strong>Selesaikan</strong>.
                        </p>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Tiba Aktual</label>
                            <input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)}
                                className="w-full md:w-48 rounded-xl border-slate-200 text-sm" />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowReceiveModal(false)} className="px-5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm">Batal</button>
                            <button onClick={() => doAction(route("purchases.receive", purchase.id), { actual_delivery_date: arrivalDate }, "Barang diterima!")}
                                className="px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">
                                <IconTruck size={16} /> Konfirmasi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Complete confirm modal — replaces browser confirm() ── */}
            <ConfirmModal
                open={showCompleteModal}
                onClose={() => setShowCompleteModal(false)}
                onConfirm={() => doAction(route("purchases.complete", purchase.id), {}, "PO selesai! Stok berhasil diperbarui.")}
                title="Selesaikan Purchase Order?"
                description={`Stok di ${purchase.destination_name} akan diperbarui sesuai item PO ini. Tindakan ini tidak dapat diubah.`}
                confirmLabel="Ya, Selesaikan & Update Stok"
                confirmClass="bg-success-600 hover:bg-success-700 text-white"
            />

            <div className="max-w-5xl mx-auto">
                {/* Action bar */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <Link href={route("purchases.index")} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-sm">
                        <IconArrowLeft size={18} /> Kembali
                    </Link>
                    <div className="flex gap-2 flex-wrap">
                        {purchase.can_edit && (
                            <Link href={route("purchases.edit", purchase.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-100">
                                <IconPencilCog size={16} /> Edit
                            </Link>
                        )}
                        {purchase.can_submit && (
                            <button onClick={() => doAction(route("purchases.submit", purchase.id), {}, "PO diajukan untuk approval.")}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-bold">
                                <IconSend size={16} /> Ajukan
                            </button>
                        )}
                        {purchase.can_approve && (
                            <button onClick={() => doAction(route("purchases.approve", purchase.id), {}, "PO disetujui.")}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold">
                                <IconCheck size={16} /> Setujui
                            </button>
                        )}
                        {purchase.can_receive && (
                            <button onClick={() => setShowReceiveModal(true)}
                                className="flex items-center gap-2 px-5 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-bold shadow-md">
                                <IconTruck size={16} /> Terima Barang
                            </button>
                        )}
                        {purchase.can_complete && (
                            <button onClick={() => setShowCompleteModal(true)}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-success-600 to-success-700 text-white rounded-xl text-sm font-bold shadow-md">
                                <IconCheck size={16} /> Selesaikan &amp; Update Stok
                            </button>
                        )}
                        {purchase.can_cancel && (
                            <button onClick={() => setShowCancelModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100">
                                <IconX size={16} /> Batalkan
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress steps */}
                {purchase.status !== "cancelled" && (
                    <div className="mb-4 bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-5">
                        <div className="flex items-center justify-between">
                            {STEPS.map((s, i) => (
                                <React.Fragment key={s}>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                            i < step ? "bg-success-500 border-success-500 text-white"
                                            : i === step ? "bg-indigo-500 border-indigo-500 text-white"
                                            : "bg-white border-slate-300 text-slate-400"}`}>
                                            {i < step ? <IconCheck size={14} /> : i + 1}
                                        </div>
                                        <span className={`text-[10px] font-bold ${i <= step ? "text-indigo-600" : "text-slate-400"}`}>{s}</span>
                                    </div>
                                    {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-success-400" : "bg-slate-200"}`} />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}

                {/* Header card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                                <IconShoppingBag size={28} className="text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{purchase.purchase_number}</h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${st.cls}`}>{st.label}</span>
                                    <span className="text-sm text-slate-500">{fmtDate(purchase.purchase_date)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-400 font-bold uppercase">Total PO</p>
                            <p className="text-2xl font-black text-indigo-700">{fmtRp(purchase.total)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {[
                            { icon: <IconBuilding size={13} />, label: "Supplier",    value: `${purchase.supplier?.name} (${purchase.supplier?.code})` },
                            { icon: <IconBuilding size={13} />, label: "Destinasi",   value: `${purchase.destination_name} (${purchase.destination_type})` },
                            { icon: <IconCalendar size={13} />, label: "Est. Tiba",   value: fmtDate(purchase.expected_delivery_date) },
                            { icon: <IconCalendar size={13} />, label: "Tiba Aktual", value: fmtDate(purchase.actual_delivery_date) },
                        ].map(({ icon, label, value }) => (
                            <div key={label} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                <div className="flex items-center gap-1 text-slate-400 font-bold mb-0.5">{icon} {label}</div>
                                <div className="font-bold text-slate-700 dark:text-slate-300">{value}</div>
                            </div>
                        ))}
                    </div>

                    {purchase.notes && (
                        <p className="mt-3 text-sm text-slate-500 p-3 bg-slate-50 rounded-xl flex items-start gap-2">
                            <IconInfoCircle size={14} className="mt-0.5 shrink-0 text-slate-400" /> {purchase.notes}
                        </p>
                    )}
                </div>

                {/* Items table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden mb-4 shadow-sm">
                    <div className="p-5 border-b border-slate-200">
                        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Item Pembelian</h2>
                    </div>
                    <Table>
                        <Table.Thead>
                            <tr>
                                <Table.Th>Item</Table.Th>
                                <Table.Th>Tipe</Table.Th>
                                <Table.Th className="text-right">Qty</Table.Th>
                                <Table.Th className="text-right">Harga/Unit</Table.Th>
                                <Table.Th className="text-right">Subtotal</Table.Th>
                            </tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {purchase.items?.map((item) => (
                                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                                    <Table.Td>
                                        <div className="font-bold text-sm">{item.item_name}</div>
                                        <div className="text-xs text-slate-400">{item.item_code}</div>
                                        {item.notes && <div className="text-xs text-slate-400 italic">{item.notes}</div>}
                                    </Table.Td>
                                    <Table.Td>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                                            {item.item_type.replace("_", " ")}
                                        </span>
                                    </Table.Td>
                                    <Table.Td className="text-right font-bold">
                                        {fmtQty(item.quantity)} <span className="text-xs text-slate-400">{item.item_unit}</span>
                                    </Table.Td>
                                    <Table.Td className="text-right text-sm">{fmtRp(item.unit_price)}</Table.Td>
                                    <Table.Td className="text-right font-bold text-slate-700">{fmtRp(item.subtotal)}</Table.Td>
                                </tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                    <div className="p-5 border-t border-slate-200 flex justify-end">
                        <div className="w-full max-w-xs space-y-1.5 text-sm">
                            {[
                                { label: "Subtotal",      value: purchase.subtotal },
                                { label: "PPN / Tax",     value: purchase.tax },
                                { label: "Ongkos Kirim",  value: purchase.shipping_cost },
                                { label: "Diskon",        value: -parseInt(purchase.discount || 0) },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between">
                                    <span className="text-slate-500">{label}</span>
                                    <span className={`font-bold ${value < 0 ? "text-red-600" : "text-slate-700"}`}>{fmtRp(Math.abs(value))}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-base font-black border-t border-slate-200 pt-2">
                                <span>TOTAL</span>
                                <span className="text-indigo-700">{fmtRp(purchase.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stock Movement log */}
                {movements.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b flex items-center gap-2">
                            <IconHistory size={20} className="text-indigo-600" />
                            <div>
                                <h2 className="font-bold text-slate-800 dark:text-white">Log Pergerakan Stok</h2>
                                <p className="text-xs text-slate-500">Stok masuk akibat PO ini</p>
                            </div>
                        </div>
                        <Table>
                            <Table.Thead>
                                <tr>
                                    <Table.Th>Item</Table.Th>
                                    <Table.Th>Lokasi</Table.Th>
                                    <Table.Th className="text-right">Qty Masuk</Table.Th>
                                    <Table.Th className="text-right">Stok Sebelum → Sesudah</Table.Th>
                                    <Table.Th className="text-right">Avg Cost</Table.Th>
                                    <Table.Th>Waktu</Table.Th>
                                </tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {movements.map((mv) => (
                                    <tr key={mv.id} className="border-b border-slate-100 dark:border-slate-800">
                                        <Table.Td className="text-sm font-bold">{mv.item_name ?? mv.item_id}</Table.Td>
                                        <Table.Td className="text-sm text-slate-500">{mv.location_name ?? mv.location_type}</Table.Td>
                                        <Table.Td className="text-right font-bold text-success-600">
                                            <span className="flex items-center justify-end gap-1">
                                                <IconTrendingUp size={13} /> +{fmtQty(mv.quantity)}
                                            </span>
                                        </Table.Td>
                                        <Table.Td className="text-right text-xs">
                                            {fmtQty(mv.stock_before)} → <span className="font-bold">{fmtQty(mv.stock_after)}</span>
                                        </Table.Td>
                                        <Table.Td className="text-right text-xs">
                                            {fmtRp(mv.avg_cost_before)} → <span className="font-bold">{fmtRp(mv.avg_cost_after)}</span>
                                        </Table.Td>
                                        <Table.Td className="text-xs text-slate-500">{fmtTs(mv.created_at)}</Table.Td>
                                    </tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </div>
                )}
            </div>
        </>
    );
}
Show.layout = (page) => <DashboardLayout children={page} />;
