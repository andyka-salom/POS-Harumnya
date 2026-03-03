import React, { useState } from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import { IconArrowLeft, IconDeviceFloppy, IconTrash, IconPhoto } from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Edit({ bottle, sizes }) {
    const [preview, setPreview] = useState(bottle.image_url);

    // Penting: Gunakan method spoofing untuk file upload di Laravel PUT
    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        name: bottle.name,
        size_id: bottle.size_id,
        price: bottle.price,
        cost_price: bottle.cost_price,
        is_active: Boolean(bottle.is_active),
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
        // Post request ke route update karena ada file upload + _method: PUT
        post(route("bottle-prices.update", bottle.id), {
            forceFormData: true,
            onSuccess: () => toast.success("Data berhasil diperbarui!"),
            onError: () => toast.error("Gagal memperbarui data"),
        });
    };

    return (
        <>
            <Head title={`Edit ${bottle.name}`} />
            <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                    <Link href={route('bottle-prices.index')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 transition-colors">
                        <IconArrowLeft size={16} /> Kembali
                    </Link>
                    <Link href={route('bottle-prices.destroy', bottle.id)} method="delete" as="button" className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
                        <IconTrash size={16} /> Hapus
                    </Link>
                </div>

                <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-bold mb-4 dark:text-white border-b pb-2 border-slate-100 dark:border-slate-800">Edit Informasi</h2>
                            <div className="space-y-4">
                                <Input label="Nama Botol" value={data.name} onChange={e => setData('name', e.target.value)} errors={errors.name} required />
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Ukuran <span className="text-red-500">*</span></label>
                                    <select value={data.size_id} onChange={e => setData('size_id', e.target.value)} className="w-full rounded-xl border-slate-300 dark:bg-slate-950 dark:border-slate-700 dark:text-white">
                                        {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input type="number" label="Harga Jual" value={data.price} onChange={e => setData('price', e.target.value)} errors={errors.price} required prefix="Rp" />
                                    <Input type="number" label="Harga Modal" value={data.cost_price} onChange={e => setData('cost_price', e.target.value)} errors={errors.cost_price} required prefix="Rp" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold mb-4 dark:text-white">Gambar</h3>
                            <div className="mb-4">
                                <div className="relative w-full aspect-square rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
                                    {preview ? <img src={preview} alt="Preview" className="w-full h-full object-cover" /> : <IconPhoto size={40} className="text-slate-400" />}
                                    <input type="file" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                                </div>
                            </div>
                            <div className="border-t pt-4 dark:border-slate-800 flex justify-between items-center">
                                <span className="font-semibold text-sm dark:text-slate-300">Status Aktif</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                </label>
                            </div>
                        </div>
                        <button type="submit" disabled={processing} className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                            <IconDeviceFloppy size={20} /> Update Botol
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = page => <DashboardLayout children={page} />;
