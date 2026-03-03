import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Textarea from "@/Components/Dashboard/TextArea";
import {
    IconArrowLeft,
    IconDeviceFloppy,
    IconCurrencyDollar,
    IconDropletFilled,
    IconScale,
    IconTag,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
const formatRupiah = (value) => {
    const num = parseFloat(String(value).replace(/\D/g, "")) || 0;
    return new Intl.NumberFormat("id-ID").format(num);
};

function SelectField({ label, value, onChange, error, options, placeholder, icon: Icon }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {label} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Icon size={16} className="text-slate-400" />
                    </div>
                )}
                <select value={value} onChange={onChange}
                    className={`w-full ${Icon ? "pl-9" : "pl-4"} pr-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all appearance-none ${
                        error ? "border-red-400 dark:border-red-600" : "border-slate-200 dark:border-slate-700"
                    }`}
                >
                    <option value="">{placeholder}</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">{error}</p>}
        </div>
    );
}

// ---------------------------------------------------------------------------
export default function Edit({ intensitySizePrice, intensities, sizes }) {
    const initialDisplay = intensitySizePrice.price
        ? formatRupiah(intensitySizePrice.price)
        : "";

    const [displayPrice, setDisplayPrice] = useState(initialDisplay);

    const { data, setData, post, processing, errors } = useForm({
        _method:      "PUT",
        intensity_id: intensitySizePrice.intensity_id ?? "",
        size_id:      intensitySizePrice.size_id      ?? "",
        price:        intensitySizePrice.price        ?? "",
        is_active:    intensitySizePrice.is_active    ?? true,
        notes:        intensitySizePrice.notes        ?? "",
    });

    const handlePriceChange = (e) => {
        const raw = e.target.value.replace(/\D/g, "");
        setDisplayPrice(raw ? formatRupiah(raw) : "");
        setData("price", raw ? parseFloat(raw) : "");
    };

    const submit = (e) => {
        e.preventDefault();
        post(route("intensity-size-prices.update", intensitySizePrice.id), {
            onSuccess: () => toast.success("Harga berhasil diperbarui! 🚀"),
            onError:   () => toast.error("Terjadi kesalahan, periksa form Anda"),
        });
    };

    const intensityOptions = intensities.map((i) => ({
        value: i.id,
        label: `${i.name}${i.code ? ` (${i.code})` : ""}`,
    }));

    const sizeOptions = sizes.map((s) => ({
        value: s.id,
        label: `${s.name} — ${s.volume_ml} ml`,
    }));

    const selectedIntensity = intensities.find(i => i.id === data.intensity_id);
    const selectedSize      = sizes.find(s => s.id === data.size_id);
    const showPreview       = selectedIntensity && selectedSize;

    return (
        <>
            <Head title={`Edit Harga`} />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Header */}
                <div className="mb-6">
                    <Link href={route("intensity-size-prices.index")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors mb-4"
                    >
                        <IconArrowLeft size={18} strokeWidth={2} />
                        <span>Kembali ke daftar harga</span>
                    </Link>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Harga</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Perbarui harga untuk kombinasi intensitas dan ukuran
                            </p>
                        </div>
                        {showPreview && (
                            <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                                {selectedIntensity.name} / {selectedSize.name}
                            </span>
                        )}
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                            <div className="w-1 h-5 bg-primary-600 rounded-full" />
                            Detail Harga
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <SelectField
                                label="Intensitas"
                                value={data.intensity_id}
                                onChange={e => setData("intensity_id", e.target.value)}
                                error={errors.intensity_id}
                                options={intensityOptions}
                                placeholder="— Pilih Intensitas —"
                                icon={IconDropletFilled}
                            />
                            <SelectField
                                label="Ukuran"
                                value={data.size_id}
                                onChange={e => setData("size_id", e.target.value)}
                                error={errors.size_id}
                                options={sizeOptions}
                                placeholder="— Pilih Ukuran —"
                                icon={IconScale}
                            />
                        </div>

                        {showPreview && (
                            <div className="mt-4 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 flex items-center gap-2">
                                <IconTag size={16} className="text-primary-600 dark:text-primary-400 flex-shrink-0" />
                                <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                                    Kombinasi: <strong>{selectedIntensity.name}</strong> + <strong>{selectedSize.name} ({selectedSize.volume_ml} ml)</strong>
                                </span>
                            </div>
                        )}

                        {/* Price */}
                        <div className="mt-5">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                Harga <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <span className="text-sm font-semibold text-slate-500">Rp</span>
                                </div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={displayPrice}
                                    onChange={handlePriceChange}
                                    placeholder="0"
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
                                        errors.price ? "border-red-400 dark:border-red-600" : "border-slate-200 dark:border-slate-700"
                                    }`}
                                />
                            </div>
                            {errors.price && <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">{errors.price}</p>}
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {data.price ? `= Rp ${formatRupiah(data.price)}` : "Masukkan harga dalam Rupiah"}
                            </p>
                        </div>

                        {/* Notes */}
                        <div className="mt-5">
                            <Textarea
                                label="Catatan"
                                value={data.notes}
                                onChange={e => setData("notes", e.target.value)}
                                errors={errors.notes}
                                rows={3}
                                placeholder="Opsional: misal harga promo, harga khusus member..."
                            />
                        </div>

                        {/* Status Toggle */}
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">Status Aktif</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Harga akan berlaku untuk transaksi</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={data.is_active}
                                        onChange={e => setData("is_active", e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600" />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                        <div className="flex gap-3">
                            <IconCurrencyDollar size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                    Catatan Penetapan Harga
                                </h3>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    Mengubah kombinasi intensitas + ukuran ke kombinasi yang sudah ada akan ditolak sistem.
                                    Pastikan kombinasi baru belum memiliki harga.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                        <Link href={route("intensity-size-prices.index")}
                            className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-center"
                        >
                            Batal
                        </Link>
                        <button type="submit" disabled={processing}
                            className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
                        >
                            <IconDeviceFloppy size={20} strokeWidth={2} />
                            <span>{processing ? "Menyimpan..." : "Update Harga"}</span>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
