import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import { IconArrowLeft, IconDeviceFloppy, IconBottle, IconPhoto, IconCurrencyDollar, IconUpload } from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Create({ sizes }) {
    const [preview, setPreview] = useState(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: "",
        size_id: "",
        price: "",
        cost_price: "",
        is_active: true,
        image: null
    });

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('image', file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const submit = (e) => {
        e.preventDefault();
        post(route("bottle-prices.store"), {
            forceFormData: true,
            onSuccess: () => {
                toast.success("Botol berhasil ditambahkan!");
                reset();
                setPreview(null);
            },
            onError: () => toast.error("Cek kembali form anda"),
        });
    };

    return (
        <>
            <Head title="Tambah Botol" />
            <div className="max-w-4xl mx-auto px-4 py-6">
                <Link href={route('bottle-prices.index')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 mb-4 transition-colors">
                    <IconArrowLeft size={16} /> Kembali
                </Link>

                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <IconBottle className="text-primary-600"/> Tambah Data Botol
                </h1>

                <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold mb-4 dark:text-white border-b pb-2 border-slate-100 dark:border-slate-800">Informasi Produk</h2>

                            <div className="space-y-4">
                                <Input label="Nama Botol" value={data.name} onChange={e => setData('name', e.target.value)} errors={errors.name} placeholder="Contoh: Botol Kaca Premium 30ml" required />

                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Ukuran (Size) <span className="text-red-500">*</span></label>
                                    <select value={data.size_id} onChange={e => setData('size_id', e.target.value)} className="w-full rounded-xl border-slate-300 dark:bg-slate-950 dark:border-slate-700 dark:text-white focus:ring-primary-500">
                                        <option value="">-- Pilih Ukuran --</option>
                                        {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    {errors.size_id && <p className="text-xs text-red-500 mt-1">{errors.size_id}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Input type="number" label="Harga Jual (IDR)" value={data.price} onChange={e => setData('price', e.target.value)} errors={errors.price} placeholder="0" required prefix="Rp" />
                                    <Input type="number" label="Harga Modal (IDR)" value={data.cost_price} onChange={e => setData('cost_price', e.target.value)} errors={errors.cost_price} placeholder="0" required prefix="Rp" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Image & Status */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold mb-4 dark:text-white">Gambar Produk</h3>
                            <div className="mb-4">
                                <div className={`relative w-full aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800 dark:border-slate-700 ${preview ? 'border-primary-500' : 'border-slate-300'}`}>
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <IconPhoto size={40} className="mx-auto mb-2" />
                                            <span className="text-xs">Upload Gambar</span>
                                        </div>
                                    )}
                                    <input type="file" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                                </div>
                                {errors.image && <p className="text-xs text-red-500 mt-1">{errors.image}</p>}
                                <p className="text-xs text-slate-500 mt-2 text-center">Klik area diatas untuk upload. Max 2MB.</p>
                            </div>

                            <div className="border-t pt-4 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm dark:text-slate-300">Status Aktif</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={processing} className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                            <IconDeviceFloppy size={20} /> Simpan Botol
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = page => <DashboardLayout children={page} />;
