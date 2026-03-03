import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import axios from "axios";
import toast from "react-hot-toast";
import POSLayout from "@/Layouts/POSLayout";
import {
    IconBottle, IconChevronRight, IconFlask,
    IconMinus, IconPackage, IconPlus, IconReceipt,
    IconSearch, IconShoppingCart, IconTrash, IconX, IconUser,
    IconClock, IconCheck, IconAlertTriangle, IconTag,
    IconChevronDown, IconPercentage, IconCurrencyDollar,
    IconUserPlus, IconPhone, IconMail, IconGift,
    IconBox,
} from "@tabler/icons-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v = 0) =>
    Number(v || 0).toLocaleString("id-ID", {
        style: "currency", currency: "IDR", minimumFractionDigits: 0,
    });

const GENDER_ICON = { male: "👔", female: "👗", unisex: "⚡" };
const TIER_COLOR  = {
    bronze: "text-amber-700", silver: "text-slate-500",
    gold: "text-yellow-500", platinum: "text-violet-500",
};

// ─── Modal Shell ──────────────────────────────────────────────────────────────
function Modal({ show, onClose, children, maxW = "max-w-lg" }) {
    useEffect(() => {
        document.body.style.overflow = show ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [show]);
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose}/>
            <div className={`relative w-full ${maxW} bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]`}>
                <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"/>
                </div>
                {children}
            </div>
        </div>
    );
}

// ─── Intensity Modal ──────────────────────────────────────────────────────────
function IntensityModal({ show, onClose, variant, intensities, loading, onSelect }) {
    const gradients = [
        "from-violet-500 to-purple-600", "from-blue-500 to-indigo-600",
        "from-emerald-500 to-teal-600",  "from-rose-500 to-pink-600",
        "from-amber-500 to-orange-600",
    ];
    return (
        <Modal show={show} onClose={onClose} maxW="max-w-md">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <div>
                    <p className="text-xs text-slate-400 font-medium mb-0.5">Pilih konsentrasi untuk</p>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{variant?.name}</h3>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center flex-shrink-0 transition-colors">
                    <IconX size={17} className="text-slate-500"/>
                </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
                {loading ? (
                    <div className="py-10 flex items-center justify-center gap-2 text-slate-400">
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/>
                        <span className="text-sm">Mengecek ketersediaan...</span>
                    </div>
                ) : intensities.length === 0 ? (
                    <div className="py-10 text-center">
                        <IconAlertTriangle size={32} className="mx-auto mb-2 text-amber-400"/>
                        <p className="text-sm text-slate-500">Stok tidak tersedia untuk varian ini</p>
                    </div>
                ) : intensities.map((intensity, i) => {
                    const oilPct = parseFloat(intensity.oil_ratio) || 0;
                    const grad = gradients[i % gradients.length];
                    return (
                        <button key={intensity.id} onClick={() => { onSelect(intensity); onClose(); }}
                            className="group w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary-400 dark:hover:border-primary-600 bg-white dark:bg-slate-800/50 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 transition-all text-left flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                <IconFlask size={22} className="text-white"/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-slate-800 dark:text-white">{intensity.name}</span>
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold">{intensity.code}</span>
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xs text-slate-500">Oil <strong className="text-slate-700 dark:text-slate-200">{intensity.oil_ratio}%</strong></span>
                                    <span className="text-xs text-slate-500">Alkohol <strong className="text-slate-700 dark:text-slate-200">{intensity.alcohol_ratio}%</strong></span>
                                </div>
                                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className={`h-full bg-gradient-to-r ${grad} rounded-full`} style={{ width: `${oilPct}%` }}/>
                                </div>
                            </div>
                            <IconChevronRight size={18} className="text-slate-300 group-hover:text-primary-500 flex-shrink-0 transition-colors"/>
                        </button>
                    );
                })}
            </div>
        </Modal>
    );
}

// ─── Size Modal ───────────────────────────────────────────────────────────────
function SizeModal({ show, onClose, variant, intensity, sizes, loading, onSelect }) {
    return (
        <Modal show={show} onClose={onClose} maxW="max-w-sm">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <div>
                    <p className="text-xs text-slate-400 font-medium mb-0.5">
                        {variant?.name} · <span className="text-primary-500 font-bold">{intensity?.code}</span>
                    </p>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">Pilih Ukuran</h3>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center flex-shrink-0 transition-colors">
                    <IconX size={17} className="text-slate-500"/>
                </button>
            </div>
            <div className="p-4">
                {loading ? (
                    <div className="py-10 flex items-center justify-center gap-2 text-slate-400">
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/>
                        <span className="text-sm">Mengecek ketersediaan...</span>
                    </div>
                ) : sizes.length === 0 ? (
                    <div className="py-10 text-center">
                        <IconAlertTriangle size={32} className="mx-auto mb-2 text-amber-400"/>
                        <p className="text-sm text-slate-500">Tidak ada ukuran tersedia</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        {sizes.map((size) => {
                            const ml = parseInt(size.volume_ml) || 50;
                            const bottleH = ml <= 10 ? "h-5" : ml <= 30 ? "h-8" : ml <= 50 ? "h-12" : "h-16";
                            return (
                                <button key={size.id} onClick={() => { onSelect(size); onClose(); }}
                                    className="group flex flex-col items-center p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary-400 dark:hover:border-primary-600 bg-white dark:bg-slate-800/50 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 transition-all">
                                    <div className="flex items-end justify-center mb-3 h-20">
                                        <div className="relative">
                                            <div className="w-2 h-3 bg-slate-300 dark:bg-slate-600 rounded-t-sm mx-auto mb-0.5"/>
                                            <div className={`w-10 ${bottleH} rounded-xl bg-gradient-to-b from-primary-400 to-primary-600 group-hover:from-primary-500 group-hover:to-primary-700 shadow-lg transition-all relative overflow-hidden`}>
                                                <div className="absolute inset-x-1 top-1 h-1/3 bg-white/20 rounded-lg"/>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{size.volume_ml}</p>
                                    <p className="text-xs font-semibold text-slate-400 -mt-0.5">ml</p>
                                    {size.price != null && (
                                        <p className="text-[11px] font-bold text-primary-600 dark:text-primary-400 mt-1">{fmt(size.price)}</p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}

// ─── Add Customer Modal ───────────────────────────────────────────────────────
function AddCustomerModal({ show, onClose, onSaved }) {
    const [form, setForm] = useState({ name: "", phone: "", email: "", gender: "", birth_date: "" });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: null })); };

    const handleSave = async () => {
        const errs = {};
        if (!form.name.trim()) errs.name = "Nama wajib diisi";
        if (!form.phone.trim()) errs.phone = "No. HP wajib diisi";
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setSaving(true);
        try {
            const res = await axios.post(route("customers.store"), form);
            if (res.data.success) {
                toast.success("Pelanggan berhasil ditambahkan");
                onSaved(res.data.data);
                onClose();
                setForm({ name: "", phone: "", email: "", gender: "", birth_date: "" });
            } else {
                toast.error(res.data.message ?? "Gagal menyimpan");
            }
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors) setErrors(data.errors);
            else toast.error(data?.message ?? "Gagal menyimpan pelanggan");
        } finally {
            setSaving(false);
        }
    };

    const Field = ({ label, error, children }) => (
        <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
            {children}
            {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
    );

    return (
        <Modal show={show} onClose={onClose} maxW="max-w-md">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                    <IconUserPlus size={20} className="text-primary-500"/> Pelanggan Baru
                </h3>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center transition-colors">
                    <IconX size={17} className="text-slate-500"/>
                </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
                <Field label="Nama Lengkap *" error={errors.name}>
                    <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
                        placeholder="Nama pelanggan"
                        className={`w-full h-10 px-3 rounded-xl border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:bg-slate-900 dark:text-white ${errors.name ? "border-red-400" : "border-slate-200 dark:border-slate-700"}`}/>
                </Field>
                <Field label="No. HP *" error={errors.phone}>
                    <div className="relative">
                        <IconPhone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                            placeholder="08xx-xxxx-xxxx"
                            className={`w-full h-10 pl-9 pr-3 rounded-xl border text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:bg-slate-900 dark:text-white ${errors.phone ? "border-red-400" : "border-slate-200 dark:border-slate-700"}`}/>
                    </div>
                </Field>
                <Field label="Email" error={errors.email}>
                    <div className="relative">
                        <IconMail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                            placeholder="email@contoh.com"
                            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:bg-slate-900 dark:text-white"/>
                    </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Jenis Kelamin">
                        <select value={form.gender} onChange={e => set("gender", e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20">
                            <option value="">— Pilih —</option>
                            <option value="male">Pria</option>
                            <option value="female">Wanita</option>
                            <option value="other">Lainnya</option>
                        </select>
                    </Field>
                    <Field label="Tanggal Lahir">
                        <input type="date" value={form.birth_date} onChange={e => set("birth_date", e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500/20"/>
                    </Field>
                </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 flex-shrink-0">
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors">
                    Batal
                </button>
                <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                    {saving
                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Menyimpan...</>
                        : <><IconUserPlus size={16}/> Simpan Pelanggan</>
                    }
                </button>
            </div>
        </Modal>
    );
}

// ─── Discount Popup ───────────────────────────────────────────────────────────
function DiscountPopup({ show, onClose, eligibleDiscounts, subtotal, onApply }) {
    if (!show || eligibleDiscounts.length === 0) return null;
    const calcDiscount = (d) => {
        if (d.discount_category === "percentage") {
            const amt = Math.round(subtotal * (d.value ?? 0) / 100);
            return d.max_discount_amount ? Math.min(amt, d.max_discount_amount) : amt;
        }
        if (d.discount_category === "fixed_amount") return Math.min(Math.round(d.value ?? 0), subtotal);
        return 0;
    };
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}/>
            <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"/>
                </div>
                <div className="px-5 pt-4 pb-2 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30">
                        <IconGift size={28} className="text-white"/>
                    </div>
                    <h3 className="font-black text-lg text-slate-800 dark:text-white">Promo Tersedia! 🎉</h3>
                    <p className="text-xs text-slate-400 mt-1">Pembelian kamu memenuhi syarat promo berikut</p>
                </div>
                <div className="px-4 pb-2 space-y-2 max-h-56 overflow-y-auto">
                    {eligibleDiscounts.map(d => {
                        const amt = calcDiscount(d);
                        return (
                            <button key={d.id} onClick={() => { onApply({ ...d, amount: amt }); onClose(); }}
                                className="w-full p-3.5 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 hover:border-emerald-400 text-left flex items-center gap-3 transition-all group">
                                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center flex-shrink-0">
                                    <IconTag size={16} className="text-emerald-600 dark:text-emerald-400"/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{d.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{d.description ?? ""}</p>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">-{fmt(amt)}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="p-4">
                    <button onClick={onClose} className="w-full py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-semibold text-sm text-slate-500 hover:bg-slate-50 transition-colors">
                        Lewati
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Discount Modal ───────────────────────────────────────────────────────────
function DiscountModal({ show, onClose, discounts = [], subtotal, selectedDiscount, onApply }) {
    const [search, setSearch] = useState("");
    const [manualType, setManualType] = useState("percentage");
    const [manualValue, setManualValue] = useState("");
    const [activeTab, setActiveTab] = useState("promo");

    const filtered = useMemo(() => {
        const eligible = discounts.filter(d => !d.min_purchase_amount || subtotal >= d.min_purchase_amount);
        if (!search) return eligible;
        return eligible.filter(d =>
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            (d.code ?? "").toLowerCase().includes(search.toLowerCase())
        );
    }, [discounts, search, subtotal]);

    const calcDiscount = (d) => {
        if (d.discount_category === "percentage") {
            const amt = Math.round(subtotal * (d.value ?? 0) / 100);
            return d.max_discount_amount ? Math.min(amt, d.max_discount_amount) : amt;
        }
        if (d.discount_category === "fixed_amount") return Math.min(Math.round(d.value ?? 0), subtotal);
        return 0;
    };

    const handleApplyManual = () => {
        const val = parseFloat(manualValue) || 0;
        if (!val) { toast.error("Masukkan nilai diskon"); return; }
        let amount = manualType === "percentage" ? Math.round(subtotal * val / 100) : Math.round(val);
        if (amount > subtotal) { toast.error("Diskon melebihi subtotal"); return; }
        onApply({ id: "__manual__", name: manualType === "percentage" ? `Diskon ${val}%` : `Potongan ${fmt(val)}`, amount });
        onClose();
    };

    return (
        <Modal show={show} onClose={onClose} maxW="max-w-md">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                    <IconTag size={20} className="text-primary-500"/> Diskon
                </h3>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center transition-colors">
                    <IconX size={17} className="text-slate-500"/>
                </button>
            </div>
            <div className="flex border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                {[{ key: "promo", label: "Promo / Voucher" }, { key: "manual", label: "Manual" }].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${
                            activeTab === tab.key ? "text-primary-600 border-b-2 border-primary-500" : "text-slate-400 hover:text-slate-600"
                        }`}>
                        {tab.label}
                    </button>
                ))}
            </div>
            {activeTab === "promo" ? (
                <div className="flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                        <div className="relative">
                            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Cari kode atau nama promo..."
                                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/>
                        </div>
                    </div>
                    <div className="overflow-y-auto p-3 space-y-2 flex-1">
                        {selectedDiscount && (
                            <button onClick={() => { onApply(null); onClose(); }}
                                className="w-full p-3 rounded-xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-left flex items-center gap-3 hover:bg-red-100 transition-colors">
                                <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                                    <IconX size={16} className="text-red-500"/>
                                </div>
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Hapus Diskon</p>
                            </button>
                        )}
                        {filtered.length === 0 ? (
                            <div className="py-8 text-center">
                                <IconTag size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600"/>
                                <p className="text-sm text-slate-400">Tidak ada promo yang sesuai</p>
                                <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Gunakan tab Manual untuk diskon langsung</p>
                            </div>
                        ) : filtered.map(d => {
                            const discAmt = calcDiscount(d);
                            const isSelected = selectedDiscount?.id === d.id;
                            return (
                                <button key={d.id} onClick={() => { onApply({ ...d, amount: discAmt }); onClose(); }}
                                    className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
                                        isSelected ? "border-primary-400 bg-primary-50 dark:bg-primary-950/30"
                                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-primary-300"
                                    }`}>
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        d.discount_category === "percentage" ? "bg-violet-100 dark:bg-violet-900/40" : "bg-emerald-100 dark:bg-emerald-900/40"
                                    }`}>
                                        {d.discount_category === "percentage"
                                            ? <IconPercentage size={16} className="text-violet-600 dark:text-violet-400"/>
                                            : <IconCurrencyDollar size={16} className="text-emerald-600 dark:text-emerald-400"/>
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{d.name}</p>
                                            {d.code && <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded text-[10px] font-mono flex-shrink-0">{d.code}</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">{d.description ?? ""}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-sm text-primary-600 dark:text-primary-400">-{fmt(discAmt)}</p>
                                        {isSelected && <IconCheck size={14} className="text-primary-500 ml-auto mt-0.5"/>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                        {[
                            { key: "percentage", label: "Persentase", icon: <IconPercentage size={14}/> },
                            { key: "fixed", label: "Nominal (Rp)", icon: <IconCurrencyDollar size={14}/> },
                        ].map(t => (
                            <button key={t.key} onClick={() => setManualType(t.key)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                                    manualType === t.key
                                        ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300"
                                        : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                                }`}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                            {manualType === "percentage" ? "Persentase Diskon (%)" : "Nominal Potongan (Rp)"}
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                {manualType === "percentage" ? "%" : "Rp"}
                            </span>
                            <input type="text" inputMode="numeric" value={manualValue}
                                onChange={e => setManualValue(e.target.value.replace(/\D/g, ""))}
                                placeholder={manualType === "percentage" ? "0 – 100" : "0"}
                                className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xl font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/>
                        </div>
                        {manualValue > 0 && (
                            <p className="text-xs text-primary-600 dark:text-primary-400 mt-1.5 font-semibold">
                                = Potongan {fmt(manualType === "percentage" ? subtotal * manualValue / 100 : parseFloat(manualValue))}
                            </p>
                        )}
                    </div>
                    <button onClick={handleApplyManual}
                        className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold transition-colors flex items-center justify-center gap-2">
                        <IconCheck size={18}/> Terapkan Diskon
                    </button>
                </div>
            )}
        </Modal>
    );
}

// ─── Packaging Panel (Staged Selection) ──────────────────────────────────────
const PKG_COLORS = [
    { grad: "from-orange-400 to-amber-500",  light: "bg-orange-50 dark:bg-orange-950/20",  border: "border-orange-300 dark:border-orange-700"  },
    { grad: "from-violet-400 to-purple-500", light: "bg-violet-50 dark:bg-violet-950/20",  border: "border-violet-300 dark:border-violet-700"  },
    { grad: "from-rose-400 to-pink-500",     light: "bg-rose-50 dark:bg-rose-950/20",      border: "border-rose-300 dark:border-rose-700"      },
    { grad: "from-teal-400 to-emerald-500",  light: "bg-teal-50 dark:bg-teal-950/20",      border: "border-teal-300 dark:border-teal-700"      },
    { grad: "from-sky-400 to-blue-500",      light: "bg-sky-50 dark:bg-sky-950/20",        border: "border-sky-300 dark:border-sky-700"        },
];

function PackagingPanel({ packagingMaterials = [], cartPackagings = [], onAddBatch, onUpdateQty }) {
    const [search, setSearch] = useState("");
    const [staged, setStaged] = useState({});

    const filtered = useMemo(() => {
        if (!search) return packagingMaterials;
        return packagingMaterials.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.code ?? "").toLowerCase().includes(search.toLowerCase())
        );
    }, [packagingMaterials, search]);

    const stagedCount = useMemo(() => Object.values(staged).reduce((s, q) => s + q, 0), [staged]);
    const stagedTotal = useMemo(() =>
        packagingMaterials.reduce((sum, pkg) =>
            sum + Number(pkg.selling_price || 0) * (staged[pkg.id] ?? 0), 0)
    , [staged, packagingMaterials]);
    const stagedItems = useMemo(() =>
        packagingMaterials.filter(p => (staged[p.id] ?? 0) > 0)
    , [staged, packagingMaterials]);

    const selectPkg    = (pkg)         => setStaged(p => ({ ...p, [pkg.id]: (p[pkg.id] ?? 0) + 1 }));
    const clearStaged  = ()            => setStaged({});
    const updateStaged = (id, delta)   => setStaged(p => {
        const next = (p[id] ?? 0) + delta;
        if (next <= 0) { const c = { ...p }; delete c[id]; return c; }
        return { ...p, [id]: next };
    });

    const handleCommit = () => {
        if (!stagedCount) return;
        const batch = packagingMaterials
            .filter(p => (staged[p.id] ?? 0) > 0)
            .map(p => ({ pkg: p, qty: staged[p.id] }));
        onAddBatch(batch);
        setStaged({});
        toast.success(`${stagedCount} kemasan ditambahkan ke keranjang`);
    };

    return (
        <div className="flex flex-col h-full">

            {/* ── Search ── */}
            <div className="flex-shrink-0 px-4 pt-3 pb-2">
                <div className="relative">
                    <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input type="text" placeholder="Cari kemasan..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/>
                </div>
            </div>

            {/* ── Catalog grid ── */}
            <div className="flex-1 overflow-y-auto px-4 pb-3">
                {filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <IconPackage size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-3"/>
                        <p className="text-sm text-slate-400 font-medium">Kemasan tidak ditemukan</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {filtered.map((pkg, i) => {
                            const c       = PKG_COLORS[i % PKG_COLORS.length];
                            const inStage = staged[pkg.id] ?? 0;
                            const inCart  = cartPackagings.find(p => p.pkg.id === pkg.id);

                            return (
                                <button key={pkg.id} onClick={() => selectPkg(pkg)}
                                    className={`group relative rounded-2xl border-2 text-left transition-all overflow-hidden ${
                                        inStage > 0
                                            ? `${c.border} ${c.light} shadow-md`
                                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-orange-300 hover:shadow-sm"
                                    }`}>

                                    {/* Illustration */}
                                    <div className={`h-24 bg-gradient-to-br ${c.grad} relative overflow-hidden flex items-center justify-center`}>
                                        <div className="absolute inset-0 opacity-20"
                                            style={{ backgroundImage: "radial-gradient(circle at 25% 75%, white 1px, transparent 1px), radial-gradient(circle at 75% 25%, white 1px, transparent 1px)", backgroundSize: "14px 14px" }}/>
                                        <IconBox size={36} className="text-white drop-shadow-md"/>

                                        {/* Already-in-cart badge */}
                                        {inCart && (
                                            <div className="absolute top-2 left-2 bg-white/90 dark:bg-slate-900/80 rounded-lg px-1.5 py-0.5 flex items-center gap-1">
                                                <IconShoppingCart size={9} className="text-primary-500"/>
                                                <span className="text-[9px] font-bold text-primary-600">{inCart.qty}</span>
                                            </div>
                                        )}

                                        {/* Staged count */}
                                        {inStage > 0 && (
                                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center">
                                                <span className="text-[11px] font-black text-orange-600">{inStage}</span>
                                            </div>
                                        )}

                                        {/* Hover plus */}
                                        {inStage === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-9 h-9 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                                                    <IconPlus size={18} className="text-white"/>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-3">
                                        <p className="font-bold text-sm text-slate-800 dark:text-white line-clamp-2 leading-tight">{pkg.name}</p>
                                        {pkg.code && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{pkg.code}</p>}
                                        <p className="text-xs font-black text-orange-600 dark:text-orange-400 mt-1">{fmt(pkg.selling_price)}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Staging confirmation bar ── */}
            {stagedCount > 0 && (
                <div className="flex-shrink-0 border-t-2 border-orange-100 dark:border-orange-900/50 bg-white dark:bg-slate-900 px-4 pt-3 pb-3 space-y-2.5">

                    {/* Title row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
                                <IconPackage size={13} className="text-white"/>
                            </div>
                            <span className="text-sm font-bold text-slate-800 dark:text-white">
                                {stagedCount} kemasan dipilih
                            </span>
                        </div>
                        <button onClick={clearStaged}
                            className="text-[11px] text-slate-400 hover:text-red-500 font-semibold flex items-center gap-1 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors">
                            <IconX size={11}/> Reset
                        </button>
                    </div>

                    {/* Staged items list with qty controls */}
                    <div className="space-y-1.5">
                        {stagedItems.map((pkg, i) => {
                            const c   = PKG_COLORS[i % PKG_COLORS.length];
                            const qty = staged[pkg.id] ?? 0;
                            return (
                                <div key={pkg.id}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 ${c.border} ${c.light}`}>
                                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${c.grad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                        <IconBox size={13} className="text-white"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{pkg.name}</p>
                                        <p className="text-[10px] text-slate-400">{fmt(pkg.selling_price)} / pcs</p>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => updateStaged(pkg.id, -1)}
                                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-sm">
                                            <IconMinus size={10}/>
                                        </button>
                                        <span className="w-6 text-center text-sm font-black text-slate-800 dark:text-white">{qty}</span>
                                        <button onClick={() => updateStaged(pkg.id, 1)}
                                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-sm">
                                            <IconPlus size={10}/>
                                        </button>
                                    </div>
                                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400 w-16 text-right flex-shrink-0">
                                        {fmt(Number(pkg.selling_price || 0) * qty)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Total + CTA */}
                    <div className="flex items-center gap-2 pt-0.5">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400">Total kemasan</p>
                            <p className="text-lg font-black text-orange-600 dark:text-orange-400 leading-tight">{fmt(stagedTotal)}</p>
                        </div>
                        <button onClick={handleCommit}
                            className="flex-shrink-0 h-11 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-orange-500/30 transition-all">
                            <IconShoppingCart size={15}/> Tambah ke Keranjang
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN INDEX
// ═══════════════════════════════════════════════════════════════════════════════
export default function Index({
    carts              = [],
    carts_total        = 0,
    heldCarts          = [],
    customers          = [],
    salesPeople        = [],
    variants           = [],
    packagingMaterials = [],
    paymentMethods     = [],
    discounts          = [],
    storeId            = null,
    storeName          = null,
    error              = null,
}) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [selectedCustomer,     setSelectedCustomer]     = useState(null);
    const [customerSearch,       setCustomerSearch]       = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [showAddCustomer,      setShowAddCustomer]      = useState(false);
    const [selectedSalesPerson,  setSelectedSalesPerson]  = useState(null);
    const [salesSearch,          setSalesSearch]          = useState("");
    const [showSalesDropdown,    setShowSalesDropdown]    = useState(false);
    const [selectedDiscount,     setSelectedDiscount]     = useState(null);
    const [cashInput,            setCashInput]            = useState("");
    const [selectedPaymentId,    setSelectedPaymentId]    = useState(null);
    const [isSubmitting,         setIsSubmitting]         = useState(false);
    const [showPaymentModal,     setShowPaymentModal]     = useState(false);
    const [showDiscountModal,    setShowDiscountModal]    = useState(false);
    const [removingId,           setRemovingId]           = useState(null);
    const [updatingId,           setUpdatingId]           = useState(null);
    const [isHolding,            setIsHolding]            = useState(false);

    const [showDiscountPopup,    setShowDiscountPopup]    = useState(false);
    const [popupDiscounts,       setPopupDiscounts]       = useState([]);
    const prevCartTotal                                   = useRef(0);

    // Builder
    const [selectedVariant,      setSelectedVariant]      = useState(null);
    const [selectedIntensity,    setSelectedIntensity]    = useState(null);
    const [selectedSize,         setSelectedSize]         = useState(null);
    const [selectedPkgs,         setSelectedPkgs]         = useState([]);
    const [builderQty,           setBuilderQty]           = useState(1);
    const [priceData,            setPriceData]            = useState(null);
    const [loadingPrice,         setLoadingPrice]         = useState(false);
    const [addingToCart,         setAddingToCart]         = useState(false);
    const [availableIntensities, setAvailableIntensities] = useState([]);
    const [availableSizes,       setAvailableSizes]       = useState([]);
    const [loadingIntensities,   setLoadingIntensities]   = useState(false);
    const [loadingSizes,         setLoadingSizes]         = useState(false);
    const [showIntensityModal,   setShowIntensityModal]   = useState(false);
    const [showSizeModal,        setShowSizeModal]        = useState(false);

    // ── LEFT panel tab: "parfum" | "packaging"
    const [leftTab,        setLeftTab]        = useState("parfum");
    // ── Mobile tab: "left" | "cart"
    const [mobileTab,      setMobileTab]      = useState("left");
    // ── Cart right panel tab: "items" | "packaging"
    const [cartTab,        setCartTab]        = useState("items");

    const [searchVariant,  setSearchVariant]  = useState("");
    const [filterGender,   setFilterGender]   = useState("all");
    const [cartPackagings, setCartPackagings] = useState([]);

    const customerRef = useRef(null);
    const salesRef    = useRef(null);

    // ── Init ───────────────────────────────────────────────────────────────────
    useEffect(() => { if (error) toast.error(error); }, [error]);
    useEffect(() => {
        if (paymentMethods.length > 0 && !selectedPaymentId)
            setSelectedPaymentId(paymentMethods[0].id);
    }, [paymentMethods]);
    useEffect(() => {
        const handler = (e) => {
            if (customerRef.current && !customerRef.current.contains(e.target)) setShowCustomerDropdown(false);
            if (salesRef.current    && !salesRef.current.contains(e.target))    setShowSalesDropdown(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);
    useEffect(() => {
        if (selectedVariant && selectedIntensity && selectedSize) fetchPrice();
        else setPriceData(null);
    }, [selectedVariant, selectedIntensity, selectedSize, selectedPkgs]);
    useEffect(() => {
        if (carts_total > prevCartTotal.current && carts_total > 0) checkAutoDiscounts(carts_total);
        prevCartTotal.current = carts_total;
    }, [carts_total]);

    // ── Derived ────────────────────────────────────────────────────────────────
    const discountAmount = useMemo(() => selectedDiscount?.amount ?? 0, [selectedDiscount]);
    const subtotal       = useMemo(() => carts_total ?? 0, [carts_total]);
    const pkgCartTotal   = useMemo(() =>
        cartPackagings.reduce((s, p) => s + Number(p.pkg.selling_price || 0) * p.qty, 0)
    , [cartPackagings]);
    const payable        = useMemo(() => Math.max(subtotal + pkgCartTotal - discountAmount, 0), [subtotal, pkgCartTotal, discountAmount]);
    const cartCount      = useMemo(() => carts.reduce((t, i) => t + Number(i.qty), 0), [carts]);
    const pkgCartCount   = useMemo(() => cartPackagings.reduce((s, p) => s + p.qty, 0), [cartPackagings]);
    const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentId);
    const isCash         = !selectedMethod || selectedMethod.type === "cash";
    const cash           = useMemo(
        () => (isCash ? Math.max(0, Number(cashInput) || 0) : payable),
        [cashInput, isCash, payable]
    );
    const kembalian = Math.max(0, cash - payable);
    useEffect(() => { if (!isCash) setCashInput(String(payable)); }, [isCash, payable]);
    const isReadyToAdd = selectedVariant && selectedIntensity && selectedSize;

    // ── Helpers ────────────────────────────────────────────────────────────────
    const checkAutoDiscounts = (total) => {
        const eligible = discounts.filter(d => {
            if (!d.is_active) return false;
            if (d.min_purchase_amount && total < d.min_purchase_amount) return false;
            if (selectedDiscount?.id === d.id) return false;
            return true;
        });
        if (eligible.length > 0) { setPopupDiscounts(eligible); setShowDiscountPopup(true); }
    };

    const getCartItemTotal = (item) => {
        const pkgTotal = (item.packagings ?? []).reduce((s, p) =>
            s + Number(p.unit_price || 0) * Number(p.qty || 1), 0);
        return (Number(item.unit_price || 0) + pkgTotal) * Number(item.qty || 1);
    };

    // ── AJAX ───────────────────────────────────────────────────────────────────
    const fetchIntensities = async (variantId) => {
        setLoadingIntensities(true); setAvailableIntensities([]);
        try {
            const res = await axios.get(route("transactions.get-intensities"), { params: { variant_id: variantId } });
            if (res.data.success) setAvailableIntensities(res.data.data);
            else toast.error(res.data.message ?? "Gagal memuat intensitas");
        } catch { toast.error("Gagal memuat intensitas"); }
        finally { setLoadingIntensities(false); }
    };

    const fetchSizes = async (variantId, intensityId) => {
        setLoadingSizes(true); setAvailableSizes([]);
        try {
            const res = await axios.get(route("transactions.get-sizes"), { params: { variant_id: variantId, intensity_id: intensityId } });
            if (res.data.success) setAvailableSizes(res.data.data);
            else toast.error(res.data.message ?? "Gagal memuat ukuran");
        } catch { toast.error("Gagal memuat ukuran"); }
        finally { setLoadingSizes(false); }
    };

    const fetchPrice = async () => {
        setLoadingPrice(true);
        try {
            const res = await axios.post(route("transactions.get-perfume-price"), {
                variant_id: selectedVariant.id, intensity_id: selectedIntensity.id,
                size_id: selectedSize.id, packaging_ids: selectedPkgs,
            });
            if (res.data.success) setPriceData(res.data.data);
            else { toast.error(res.data.message); setPriceData(null); }
        } catch (err) {
            toast.error(err.response?.data?.message || "Gagal mendapatkan harga"); setPriceData(null);
        } finally { setLoadingPrice(false); }
    };

    // ── Builder actions ────────────────────────────────────────────────────────
    const selectVariant = (v) => {
        setSelectedVariant(v); setSelectedIntensity(null); setSelectedSize(null);
        setSelectedPkgs([]); setPriceData(null);
        setAvailableIntensities([]); setAvailableSizes([]);
        setShowIntensityModal(true); fetchIntensities(v.id);
    };

    const selectIntensity = (intensity) => {
        setSelectedIntensity(intensity); setSelectedSize(null); setPriceData(null); setAvailableSizes([]);
        setTimeout(() => setShowSizeModal(true), 100);
        fetchSizes(selectedVariant.id, intensity.id);
    };

    const selectSize = (size) => { setSelectedSize(size); };

    const togglePkg = (pkgId) =>
        setSelectedPkgs(prev => prev.includes(pkgId) ? prev.filter(id => id !== pkgId) : [...prev, pkgId]);

    const resetBuilder = () => {
        setSelectedVariant(null); setSelectedIntensity(null); setSelectedSize(null);
        setSelectedPkgs([]); setBuilderQty(1); setPriceData(null);
        setAvailableIntensities([]); setAvailableSizes([]); setSearchVariant("");
    };

    // ── Cart actions ───────────────────────────────────────────────────────────
    const handleAddToCart = () => {
        if (!selectedVariant || !selectedIntensity || !selectedSize) { toast.error("Lengkapi pilihan"); return; }
        setAddingToCart(true);
        router.post(route("transactions.add-to-cart"), {
            variant_id: selectedVariant.id, intensity_id: selectedIntensity.id,
            size_id: selectedSize.id, packaging_ids: selectedPkgs, qty: builderQty,
        }, {
            preserveScroll: true, preserveState: true, only: ["carts", "carts_total"],
            onSuccess: () => { toast.success("Ditambahkan ke keranjang"); resetBuilder(); setAddingToCart(false); setMobileTab("cart"); },
            onError: (errs) => { toast.error(errs?.message || "Gagal menambahkan"); setAddingToCart(false); },
        });
    };

    const handleAddCartPackagingBatch = (batch) => {
        setCartPackagings(prev => {
            let updated = [...prev];
            batch.forEach(({ pkg, qty }) => {
                const idx = updated.findIndex(p => p.pkg.id === pkg.id);
                if (idx >= 0) updated[idx] = { ...updated[idx], qty: updated[idx].qty + qty };
                else updated.push({ pkg, qty });
            });
            return updated;
        });
        // Switch right panel to show packaging summary
        setCartTab("packaging");
    };

    const handleUpdatePkgQty = (pkgId, delta) => {
        setCartPackagings(prev =>
            prev.map(p => p.pkg.id === pkgId ? { ...p, qty: Math.max(0, p.qty + delta) } : p)
                .filter(p => p.qty > 0)
        );
    };

    const handleUpdateQty = (cartId, newQty) => {
        if (newQty < 1) return;
        setUpdatingId(cartId);
        router.patch(route("transactions.update-cart", cartId), { qty: newQty }, {
            preserveScroll: true, preserveState: true, only: ["carts", "carts_total"],
            onFinish: () => setUpdatingId(null),
        });
    };

    const handleRemove = (cartId) => {
        setRemovingId(cartId);
        router.delete(route("transactions.destroy-cart", cartId), {
            preserveScroll: true, preserveState: true, only: ["carts", "carts_total"],
            onSuccess: () => { toast.success("Item dihapus"); setRemovingId(null); },
            onError: () => { toast.error("Gagal menghapus"); setRemovingId(null); },
        });
    };

    const handleHold = () => {
        if (!carts.length) { toast.error("Keranjang kosong"); return; }
        setIsHolding(true);
        router.post(route("transactions.hold"), {
            label: "Hold " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        }, {
            preserveScroll: true, preserveState: true, only: ["carts", "carts_total", "heldCarts"],
            onSuccess: () => { toast.success("Transaksi ditahan"); setIsHolding(false); },
            onFinish: () => setIsHolding(false),
        });
    };

    const handleResume = (holdId) =>
        router.post(route("transactions.resume", holdId), {}, {
            preserveScroll: true, preserveState: true, only: ["carts", "carts_total", "heldCarts"],
        });

    const handleDeleteHeld = (holdId) => {
        if (!confirm("Hapus transaksi ditahan ini?")) return;
        router.delete(route("transactions.delete-held", holdId), {
            preserveScroll: true, preserveState: true, only: ["carts", "carts_total", "heldCarts"],
        });
    };

    const handleCheckout = () => {
        if (!carts.length) { toast.error("Keranjang kosong"); return; }
        setShowPaymentModal(true);
    };

    const handleSubmit = () => {
        if (isCash && cash < payable) { toast.error("Jumlah bayar kurang dari total"); return; }
        setIsSubmitting(true);
        router.post(route("transactions.store"), {
            customer_id: selectedCustomer?.id ?? null,
            sales_person_id: selectedSalesPerson?.id ?? null,
            payment_method_id: selectedPaymentId,
            discount_type_id: selectedDiscount?.id !== "__manual__" ? (selectedDiscount?.id ?? null) : null,
            discount_amount: discountAmount,
            cash_amount: isCash ? cash : null,
            standalone_packagings: cartPackagings.map(p => ({ packaging_material_id: p.pkg.id, qty: p.qty })),
        }, {
            onSuccess: () => {
                setCashInput(""); setSelectedCustomer(null); setSelectedSalesPerson(null);
                setSelectedDiscount(null); setCartPackagings([]);
                setSelectedPaymentId(paymentMethods[0]?.id ?? null);
                setIsSubmitting(false); setShowPaymentModal(false);
                toast.success("Transaksi berhasil!");
            },
            onError: (errs) => { setIsSubmitting(false); toast.error(errs?.message || "Gagal menyimpan transaksi"); },
        });
    };

    // ── Filtered data ──────────────────────────────────────────────────────────
    const filteredVariants = useMemo(() => {
        let f = variants;
        if (filterGender !== "all") f = f.filter(v => v.gender === filterGender);
        if (searchVariant) f = f.filter(v =>
            v.name.toLowerCase().includes(searchVariant.toLowerCase()) ||
            (v.code ?? "").toLowerCase().includes(searchVariant.toLowerCase())
        );
        return f;
    }, [variants, filterGender, searchVariant]);

    const filteredCustomers = useMemo(() => {
        const list = customerSearch
            ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone ?? "").includes(customerSearch))
            : customers;
        return list.slice(0, 10);
    }, [customers, customerSearch]);

    const filteredSalesPeople = useMemo(() => {
        const list = salesSearch
            ? salesPeople.filter(s => s.name.toLowerCase().includes(salesSearch.toLowerCase()) || (s.code ?? "").toLowerCase().includes(salesSearch.toLowerCase()))
            : salesPeople;
        return list.slice(0, 10);
    }, [salesPeople, salesSearch]);

    // ══════════════════════════════════════════════════════════════════════════
    return (
        <>
            <Head title="Transaksi POS"/>

            <IntensityModal show={showIntensityModal} onClose={() => setShowIntensityModal(false)}
                variant={selectedVariant} intensities={availableIntensities} loading={loadingIntensities} onSelect={selectIntensity}/>
            <SizeModal show={showSizeModal} onClose={() => setShowSizeModal(false)}
                variant={selectedVariant} intensity={selectedIntensity} sizes={availableSizes} loading={loadingSizes} onSelect={selectSize}/>
            <AddCustomerModal show={showAddCustomer} onClose={() => setShowAddCustomer(false)} onSaved={c => setSelectedCustomer(c)}/>
            <DiscountModal show={showDiscountModal} onClose={() => setShowDiscountModal(false)}
                discounts={discounts} subtotal={subtotal + pkgCartTotal}
                selectedDiscount={selectedDiscount} onApply={setSelectedDiscount}/>
            <DiscountPopup show={showDiscountPopup} onClose={() => setShowDiscountPopup(false)}
                eligibleDiscounts={popupDiscounts} subtotal={subtotal + pkgCartTotal}
                onApply={(d) => { setSelectedDiscount(d); setShowDiscountPopup(false); }}/>

            <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">

                {/* ── Mobile top bar (only 2 tabs now) ── */}
                <div className="lg:hidden flex-shrink-0 flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    {[
                        { key: "left",  label: "Produk", icon: <IconBottle size={15}/> },
                        { key: "cart",  label: "Keranjang", icon: <IconShoppingCart size={15}/>, badge: cartCount },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setMobileTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold relative transition-colors ${
                                mobileTab === tab.key ? "text-primary-600 border-b-2 border-primary-500" : "text-slate-500"
                            }`}>
                            {tab.icon} {tab.label}
                            {tab.badge > 0 && (
                                <span className="absolute top-2 right-[22%] w-4 h-4 text-[9px] font-bold bg-primary-500 text-white rounded-full flex items-center justify-center">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    LEFT PANEL — contains both Parfum & Kemasan as inner tabs
                ══════════════════════════════════════════════════════════════ */}
                <div className={`flex-1 flex flex-col overflow-hidden ${mobileTab !== "left" ? "hidden lg:flex" : "flex"}`}>

                    {/* ── Inner tab bar: Parfum / Kemasan ── */}
                    <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex">
                        <button onClick={() => setLeftTab("parfum")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
                                leftTab === "parfum"
                                    ? "text-primary-600 border-b-2 border-primary-500"
                                    : "text-slate-400 hover:text-slate-600"
                            }`}>
                            <IconBottle size={15}/>
                            Parfum
                        </button>
                        <button onClick={() => setLeftTab("packaging")}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${
                                leftTab === "packaging"
                                    ? "text-orange-600 border-b-2 border-orange-500"
                                    : "text-slate-400 hover:text-slate-600"
                            }`}>
                            <IconPackage size={15}/>
                            Kemasan
                            {pkgCartCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-[10px] font-bold">
                                    {pkgCartCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* ── PARFUM TAB ── */}
                    {leftTab === "parfum" && (
                        <>
                            {/* Header: search + gender filter */}
                            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-3 pb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="font-bold text-slate-800 dark:text-white text-sm">Pilih Varian Parfum</h2>
                                    {storeName && (
                                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                            🏪 {storeName}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2 mb-2.5">
                                    <div className="relative flex-1">
                                        <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                        <input type="text" placeholder="Cari varian..." value={searchVariant}
                                            onChange={e => setSearchVariant(e.target.value)}
                                            className="w-full h-9 pl-9 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/>
                                        {searchVariant && (
                                            <button onClick={() => setSearchVariant("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                <IconX size={13}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                                    {[
                                        { value: "all",    label: "Semua", icon: "🌟" },
                                        { value: "male",   label: "Pria",  icon: "👔" },
                                        { value: "female", label: "Wanita", icon: "👗" },
                                        { value: "unisex", label: "Unisex", icon: "⚡" },
                                    ].map(g => (
                                        <button key={g.value} onClick={() => setFilterGender(g.value)}
                                            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                                                filterGender === g.value
                                                    ? "bg-primary-500 text-white shadow-md shadow-primary-500/30"
                                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                                            }`}>
                                            {g.icon} {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Variant grid */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {filteredVariants.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {filteredVariants.map(variant => {
                                            const isSelected = selectedVariant?.id === variant.id;
                                            return (
                                                <button key={variant.id} onClick={() => selectVariant(variant)}
                                                    className={`group relative bg-white dark:bg-slate-900 rounded-2xl border-2 transition-all overflow-hidden text-left ${
                                                        isSelected
                                                            ? "border-primary-500 shadow-lg shadow-primary-500/20 ring-2 ring-primary-500/20"
                                                            : "border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:shadow-md"
                                                    }`}>
                                                    <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 relative overflow-hidden">
                                                        {variant.image ? (
                                                            <img src={`/storage/${variant.image}`} alt={variant.name}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <IconBottle size={40} className="text-slate-300 dark:text-slate-600"/>
                                                            </div>
                                                        )}
                                                        {variant.gender && (
                                                            <span className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/90 rounded-full w-7 h-7 flex items-center justify-center shadow text-sm">
                                                                {GENDER_ICON[variant.gender] ?? ""}
                                                            </span>
                                                        )}
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-primary-600/10 flex items-center justify-center">
                                                                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-lg">
                                                                    <IconCheck size={20} className="text-white"/>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-3">
                                                        <p className="font-bold text-slate-800 dark:text-white text-sm line-clamp-2 leading-tight">{variant.name}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">{variant.code}</p>
                                                        {isSelected && selectedIntensity && (
                                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                                <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-[10px] font-bold rounded">
                                                                    {selectedIntensity.code}
                                                                </span>
                                                                {selectedSize && (
                                                                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded">
                                                                        {selectedSize.volume_ml}ml
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <IconBottle size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3"/>
                                        <p className="text-slate-500 font-medium">Varian tidak ditemukan</p>
                                        <button onClick={() => { setSearchVariant(""); setFilterGender("all"); }}
                                            className="mt-2 text-sm text-primary-500 hover:text-primary-600 font-semibold">
                                            Reset Filter
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Konfirmasi bar */}
                            {isReadyToAdd && (
                                <div className="flex-shrink-0 border-t-2 border-primary-100 dark:border-primary-900/50 bg-white dark:bg-slate-900 px-3 pt-3 pb-3 space-y-2.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            <IconBottle size={11} className="text-primary-500"/> {selectedVariant.name}
                                        </span>
                                        <IconChevronRight size={11} className="text-slate-300 flex-shrink-0"/>
                                        <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/40 rounded-lg text-xs font-bold text-violet-700 dark:text-violet-300">
                                            {selectedIntensity.name} ({selectedIntensity.code})
                                        </span>
                                        <IconChevronRight size={11} className="text-slate-300 flex-shrink-0"/>
                                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-xs font-bold text-blue-700 dark:text-blue-300">
                                            {selectedSize.volume_ml}ml
                                        </span>
                                        <button onClick={() => setShowIntensityModal(true)}
                                            className="ml-auto text-[11px] text-slate-400 hover:text-primary-500 font-semibold transition-colors px-2 py-1 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg">
                                            ✎ Ganti
                                        </button>
                                    </div>

                                    {packagingMaterials.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                                <IconPackage size={10}/> Kemasan Tambahan (opsional)
                                            </p>
                                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                                                {packagingMaterials.map(pkg => {
                                                    const isOn = selectedPkgs.includes(pkg.id);
                                                    return (
                                                        <button key={pkg.id} onClick={() => togglePkg(pkg.id)}
                                                            className={`flex-shrink-0 h-8 px-3 rounded-xl border-2 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                                                isOn
                                                                    ? "border-primary-400 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300"
                                                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                                            }`}>
                                                            <IconPackage size={11} className={isOn ? "text-primary-500" : ""}/>
                                                            {pkg.name}
                                                            <span className="text-primary-500 font-bold">+{fmt(pkg.selling_price)}</span>
                                                            {isOn && <IconCheck size={10} className="text-primary-500"/>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1.5">
                                            <button onClick={() => setBuilderQty(Math.max(1, builderQty - 1))}
                                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shadow-sm">
                                                <IconMinus size={12}/>
                                            </button>
                                            <span className="w-8 text-center font-bold text-slate-800 dark:text-white text-sm">{builderQty}</span>
                                            <button onClick={() => setBuilderQty(builderQty + 1)}
                                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors shadow-sm">
                                                <IconPlus size={12}/>
                                            </button>
                                        </div>
                                        <div className="flex-1 text-center min-w-0">
                                            {loadingPrice ? (
                                                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"/>
                                            ) : priceData ? (
                                                <>
                                                    <p className="font-black text-primary-600 dark:text-primary-400 text-lg leading-none truncate">
                                                        {fmt(priceData.total_price * builderQty)}
                                                    </p>
                                                    {builderQty > 1 && (
                                                        <p className="text-[10px] text-slate-400">{fmt(priceData.total_price)} / pcs</p>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-xs text-slate-400">Harga tidak tersedia</p>
                                            )}
                                        </div>
                                        <button onClick={handleAddToCart} disabled={!priceData || addingToCart}
                                            className={`flex-shrink-0 h-11 px-5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                                                priceData && !addingToCart
                                                    ? "bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/30"
                                                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                            }`}>
                                            {addingToCart
                                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                                : <><IconShoppingCart size={16}/> Tambah</>
                                            }
                                        </button>
                                    </div>

                                    {priceData && !priceData.stock_available && (
                                        <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                                            <IconAlertTriangle size={14} className="text-amber-500 flex-shrink-0"/>
                                            <p className="text-xs text-amber-700 dark:text-amber-400">Stok bahan baku mungkin tidak mencukupi</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── KEMASAN TAB ── */}
                    {leftTab === "packaging" && (
                        <PackagingPanel
                            packagingMaterials={packagingMaterials}
                            cartPackagings={cartPackagings}
                            onAddBatch={handleAddCartPackagingBatch}
                            onUpdateQty={handleUpdatePkgQty}
                        />
                    )}
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    RIGHT PANEL — Cart
                ══════════════════════════════════════════════════════════════ */}
                <div className={`w-full lg:w-[400px] xl:w-[440px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 ${
                    mobileTab !== "cart" ? "hidden lg:flex" : "flex"
                }`} style={{ height: "calc(100vh - 4rem)" }}>

                    {/* Customer + Sales Person */}
                    <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 space-y-2">
                        {/* Customer */}
                        <div ref={customerRef} className="relative">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                    <IconUser size={10}/> Pelanggan
                                </label>
                                <button onClick={() => setShowAddCustomer(true)}
                                    className="text-[10px] text-primary-500 hover:text-primary-600 font-bold flex items-center gap-0.5 hover:bg-primary-50 dark:hover:bg-primary-950/20 px-2 py-0.5 rounded-lg transition-colors">
                                    <IconUserPlus size={11}/> Baru
                                </button>
                            </div>
                            <div className="relative">
                                <input type="text" placeholder="Cari nama / no. HP..."
                                    value={selectedCustomer ? selectedCustomer.name : customerSearch}
                                    onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowCustomerDropdown(true); }}
                                    onFocus={() => setShowCustomerDropdown(true)}
                                    className="w-full h-9 px-3 pr-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/>
                                {selectedCustomer
                                    ? <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors">
                                        <IconX size={13}/>
                                      </button>
                                    : <IconChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                }
                            </div>
                            {selectedCustomer && (
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                        <IconCheck size={11}/> {selectedCustomer.name}
                                    </p>
                                    {selectedCustomer.tier && (
                                        <span className={`text-[10px] font-bold capitalize ${TIER_COLOR[selectedCustomer.tier] ?? "text-slate-500"}`}>
                                            ⭐ {selectedCustomer.tier}
                                        </span>
                                    )}
                                    {selectedCustomer.points > 0 && (
                                        <span className="ml-auto text-[10px] text-amber-500 font-bold">
                                            {Number(selectedCustomer.points).toLocaleString("id-ID")} poin
                                        </span>
                                    )}
                                </div>
                            )}
                            {showCustomerDropdown && !selectedCustomer && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 overflow-hidden max-h-52 overflow-y-auto">
                                    <button onClick={() => { setSelectedCustomer({ id: null, name: "Pelanggan Umum" }); setShowCustomerDropdown(false); setCustomerSearch(""); }}
                                        className="w-full text-left px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                        <span>👤</span> Pelanggan Umum
                                    </button>
                                    {filteredCustomers.map(c => (
                                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); setCustomerSearch(""); }}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <p className="font-semibold text-sm text-slate-800 dark:text-white">{c.name}</p>
                                            <p className="text-xs text-slate-400">{c.phone ?? c.code}
                                                {c.tier && <span className={`ml-2 capitalize font-semibold ${TIER_COLOR[c.tier] ?? ""}`}>{c.tier}</span>}
                                            </p>
                                        </button>
                                    ))}
                                    {filteredCustomers.length === 0 && customerSearch && (
                                        <div className="px-3 py-3 text-center">
                                            <p className="text-sm text-slate-400">Tidak ditemukan</p>
                                            <button onClick={() => { setShowAddCustomer(true); setShowCustomerDropdown(false); }}
                                                className="mt-1.5 text-xs text-primary-500 font-bold hover:text-primary-600 flex items-center gap-1 mx-auto">
                                                <IconUserPlus size={12}/> Tambah pelanggan baru
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sales Person */}
                        {salesPeople.length > 0 && (
                            <div ref={salesRef} className="relative">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">🏷 Sales Person</label>
                                <div className="relative">
                                    <input type="text" placeholder="Pilih sales person..."
                                        value={selectedSalesPerson ? selectedSalesPerson.name : salesSearch}
                                        onChange={e => { setSalesSearch(e.target.value); setSelectedSalesPerson(null); setShowSalesDropdown(true); }}
                                        onFocus={() => setShowSalesDropdown(true)}
                                        className="w-full h-9 px-3 pr-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/>
                                    {selectedSalesPerson
                                        ? <button onClick={() => { setSelectedSalesPerson(null); setSalesSearch(""); }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors">
                                            <IconX size={13}/>
                                          </button>
                                        : <IconChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                    }
                                </div>
                                {selectedSalesPerson && (
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                                        <IconCheck size={11}/> {selectedSalesPerson.name}
                                        <span className="font-mono text-[10px] text-slate-400 ml-1">{selectedSalesPerson.code}</span>
                                    </p>
                                )}
                                {showSalesDropdown && !selectedSalesPerson && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 overflow-hidden max-h-44 overflow-y-auto">
                                        {filteredSalesPeople.map(s => (
                                            <button key={s.id} onClick={() => { setSelectedSalesPerson(s); setShowSalesDropdown(false); setSalesSearch(""); }}
                                                className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                <p className="font-semibold text-sm text-slate-800 dark:text-white">{s.name}</p>
                                                <p className="text-xs text-slate-400">{s.code}{s.phone ? ` · ${s.phone}` : ""}</p>
                                            </button>
                                        ))}
                                        {filteredSalesPeople.length === 0 && (
                                            <p className="px-3 py-3 text-sm text-slate-400 text-center">Tidak ditemukan</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Held Carts */}
                    {heldCarts.length > 0 && (
                        <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 px-3 py-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                <IconClock size={10}/> Ditahan ({heldCarts.length})
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {heldCarts.map(h => (
                                    <div key={h.hold_id} className="flex-shrink-0 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 flex items-center gap-2">
                                        <div>
                                            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{h.label}</p>
                                            <p className="text-xs text-amber-600">{fmt(h.total)}</p>
                                        </div>
                                        <button onClick={() => handleResume(h.hold_id)} className="text-xs text-primary-600 font-bold hover:underline">Lanjut</button>
                                        <button onClick={() => handleDeleteHeld(h.hold_id)} className="text-red-400 hover:text-red-600"><IconX size={12}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cart inner tabs: Parfum items | Kemasan items */}
                    <div className="flex-shrink-0 flex border-b border-slate-200 dark:border-slate-800">
                        <button onClick={() => setCartTab("items")}
                            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                                cartTab === "items" ? "text-primary-600 border-b-2 border-primary-500" : "text-slate-400 hover:text-slate-600"
                            }`}>
                            <IconShoppingCart size={13}/>
                            Parfum
                            {cartCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full text-[10px] font-bold">{cartCount}</span>
                            )}
                        </button>
                        <button onClick={() => setCartTab("packaging")}
                            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                                cartTab === "packaging" ? "text-orange-600 border-b-2 border-orange-500" : "text-slate-400 hover:text-slate-600"
                            }`}>
                            <IconPackage size={13}/>
                            Kemasan
                            {pkgCartCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-[10px] font-bold">{pkgCartCount}</span>
                            )}
                        </button>
                    </div>

                    {/* Cart content */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        {cartTab === "items" ? (
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Items</p>
                                    {carts.length > 0 && (
                                        <button onClick={handleHold} disabled={isHolding}
                                            className="text-[11px] text-amber-600 font-bold hover:text-amber-700 flex items-center gap-1 px-2 py-1 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors">
                                            <IconClock size={12}/> Tahan
                                        </button>
                                    )}
                                </div>
                                {carts.length > 0 ? (
                                    <div className="space-y-2">
                                        {carts.map(item => (
                                            <div key={item.id} className={`bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 transition-opacity ${removingId === item.id ? "opacity-40" : ""}`}>
                                                <div className="flex items-start gap-2.5">
                                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                                                        <IconBottle size={17} className="text-white"/>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                                                            {item.variant?.name ?? "Parfum Custom"}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                                            {item.intensity?.code} · {item.size?.volume_ml}ml
                                                            {(item.packagings ?? []).length > 0 && (
                                                                <span> · {item.packagings.map(p => p.packaging_material?.name ?? "Kemasan").join(", ")}</span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs font-bold text-primary-600 dark:text-primary-400 mt-0.5">
                                                            {fmt(getCartItemTotal(item))}
                                                        </p>
                                                    </div>
                                                    <button onClick={() => handleRemove(item.id)} disabled={removingId === item.id}
                                                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                                                        <IconTrash size={14}/>
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between mt-2 ml-11">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => handleUpdateQty(item.id, item.qty - 1)}
                                                            disabled={item.qty <= 1 || updatingId === item.id}
                                                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors">
                                                            <IconMinus size={11}/>
                                                        </button>
                                                        <span className="w-7 text-center text-sm font-bold text-slate-800 dark:text-white">{item.qty}</span>
                                                        <button onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                                                            disabled={updatingId === item.id}
                                                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors">
                                                            <IconPlus size={11}/>
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400">
                                                        {fmt(Number(item.unit_price || 0))} / pcs
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center">
                                        <IconShoppingCart size={36} className="mx-auto text-slate-200 dark:text-slate-700 mb-2"/>
                                        <p className="text-sm text-slate-400 font-medium">Keranjang kosong</p>
                                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Tap varian parfum untuk memilih</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Packaging cart tab — just shows what's been added with qty controls */
                            <div className="p-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <IconPackage size={10}/> Kemasan di Keranjang
                                </p>
                                {cartPackagings.length > 0 ? (
                                    <div className="space-y-2">
                                        {cartPackagings.map(({ pkg, qty }, i) => {
                                            const c = PKG_COLORS[i % PKG_COLORS.length];
                                            return (
                                                <div key={pkg.id}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 ${c.border} ${c.light}`}>
                                                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.grad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                                        <IconBox size={16} className="text-white"/>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{pkg.name}</p>
                                                        <p className="text-xs text-slate-400">{fmt(pkg.selling_price)} / pcs</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button onClick={() => handleUpdatePkgQty(pkg.id, -1)}
                                                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-sm">
                                                            <IconMinus size={10}/>
                                                        </button>
                                                        <span className="w-6 text-center text-sm font-bold text-slate-800 dark:text-white">{qty}</span>
                                                        <button onClick={() => handleUpdatePkgQty(pkg.id, 1)}
                                                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-sm">
                                                            <IconPlus size={10}/>
                                                        </button>
                                                    </div>
                                                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400 w-16 text-right flex-shrink-0">
                                                        {fmt(Number(pkg.selling_price || 0) * qty)}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center">
                                        <IconBox size={36} className="mx-auto text-slate-200 dark:text-slate-700 mb-2"/>
                                        <p className="text-sm text-slate-400 font-medium">Belum ada kemasan</p>
                                        <button onClick={() => setLeftTab("packaging")}
                                            className="mt-2 text-xs text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1 mx-auto">
                                            <IconPackage size={12}/> Pilih kemasan di tab Parfum
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 space-y-2.5">
                        <button onClick={() => setShowDiscountModal(true)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all ${
                                selectedDiscount
                                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                                    : "border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-950/20"
                            }`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                selectedDiscount ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-slate-100 dark:bg-slate-800"
                            }`}>
                                <IconTag size={14} className={selectedDiscount ? "text-emerald-600" : "text-slate-400"}/>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className={`text-xs font-bold truncate ${selectedDiscount ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"}`}>
                                    {selectedDiscount ? selectedDiscount.name : "Tambah Diskon / Voucher"}
                                </p>
                                {selectedDiscount && (
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold">-{fmt(selectedDiscount.amount)}</p>
                                )}
                            </div>
                            {selectedDiscount ? (
                                <button onClick={e => { e.stopPropagation(); setSelectedDiscount(null); }}
                                    className="p-0.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                                    <IconX size={14}/>
                                </button>
                            ) : (
                                <IconChevronRight size={14} className="text-slate-300 flex-shrink-0"/>
                            )}
                        </button>

                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Parfum</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">{fmt(subtotal)}</span>
                            </div>
                            {pkgCartTotal > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Kemasan</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{fmt(pkgCartTotal)}</span>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-emerald-600 dark:text-emerald-400 text-xs">Diskon</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">-{fmt(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700">
                                <span className="font-bold text-slate-800 dark:text-white">Total</span>
                                <span className="text-xl font-black text-primary-600 dark:text-primary-400">{fmt(payable)}</span>
                            </div>
                        </div>

                        <button onClick={handleCheckout} disabled={!carts.length}
                            className={`w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                carts.length
                                    ? "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg shadow-primary-500/30"
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                            }`}>
                            <IconReceipt size={17}/>
                            {carts.length ? `Bayar ${fmt(payable)}` : "Keranjang Kosong"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ══ PAYMENT MODAL ════════════════════════════════════════════════ */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}/>
                    <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col max-h-[92vh]">
                        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"/>
                        </div>
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                                <IconReceipt size={20} className="text-primary-500"/> Pembayaran
                            </h3>
                            <button onClick={() => setShowPaymentModal(false)}
                                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <IconX size={17} className="text-slate-500"/>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-2">
                                {(selectedCustomer || selectedSalesPerson) && (
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                                        {selectedCustomer && (
                                            <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">👤 {selectedCustomer.name}</span>
                                        )}
                                        {selectedSalesPerson && (
                                            <span className="text-xs text-slate-500 flex items-center gap-1 ml-auto">Sales: <strong>{selectedSalesPerson.name}</strong></span>
                                        )}
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Parfum</span>
                                    <span className="font-medium">{fmt(subtotal)}</span>
                                </div>
                                {pkgCartTotal > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Kemasan</span>
                                        <span className="font-medium">{fmt(pkgCartTotal)}</span>
                                    </div>
                                )}
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-emerald-600 dark:text-emerald-400">{selectedDiscount?.name}</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">-{fmt(discountAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-2">
                                    <span className="font-bold text-slate-800 dark:text-white">Total Bayar</span>
                                    <span className="text-2xl font-black text-primary-600 dark:text-primary-400">{fmt(payable)}</span>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Metode Pembayaran</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {paymentMethods.map(method => (
                                        <button key={method.id} onClick={() => setSelectedPaymentId(method.id)}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                                                selectedPaymentId === method.id
                                                    ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                                                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                            }`}>
                                            <p className={`font-bold text-sm ${selectedPaymentId === method.id ? "text-primary-700 dark:text-primary-300" : "text-slate-700 dark:text-slate-300"}`}>
                                                {method.name}
                                            </p>
                                            <p className="text-xs text-slate-400 capitalize mt-0.5">{method.type}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {isCash && (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nominal Cepat</p>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[10000, 20000, 50000, 100000, Math.ceil(payable / 50000) * 50000]
                                            .filter((v, i, a) => a.indexOf(v) === i && v > 0).slice(0, 4)
                                            .map(amt => (
                                                <button key={amt} onClick={() => setCashInput(String(amt))}
                                                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                                                        Number(cashInput) === amt
                                                            ? "bg-primary-500 text-white shadow-md"
                                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                    }`}>
                                                    {fmt(amt)}
                                                </button>
                                            ))}
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 block mb-1.5">Jumlah Diterima</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                                            <input type="text" inputMode="numeric" value={cashInput}
                                                onChange={e => setCashInput(e.target.value.replace(/\D/g, ""))}
                                                placeholder="0"
                                                className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xl font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"/>
                                        </div>
                                    </div>
                                    {cash >= payable && payable > 0 && (
                                        <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Kembalian</span>
                                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmt(kembalian)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 flex-shrink-0">
                            <button onClick={() => setShowPaymentModal(false)}
                                className="px-5 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                Batal
                            </button>
                            <button onClick={handleSubmit}
                                disabled={(isCash && cash < payable) || isSubmitting || !selectedPaymentId}
                                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                    (!isCash || cash >= payable) && !isSubmitting && selectedPaymentId
                                        ? "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg shadow-primary-500/30"
                                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                }`}>
                                {isSubmitting
                                    ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Memproses...</>
                                    : <><IconReceipt size={18}/> Selesaikan Transaksi</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

Index.layout = page => <POSLayout children={page}/>;
