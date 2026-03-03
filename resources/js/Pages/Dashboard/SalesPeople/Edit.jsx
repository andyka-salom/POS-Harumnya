import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/Components/Dashboard/Input";
import { IconArrowLeft, IconDeviceFloppy } from "@tabler/icons-react";
import toast from "react-hot-toast";

export default function Edit({ salesPerson, stores }) {
    const { data, setData, put, processing, errors } = useForm({
        store_id: salesPerson.store_id || "",
        code: salesPerson.code || "",
        name: salesPerson.name || "",
        phone: salesPerson.phone || "",
        email: salesPerson.email || "",
        join_date: salesPerson.join_date || "",
        is_active: salesPerson.is_active,
    });

    const submit = (e) => {
        e.preventDefault();
        put(route("sales-people.update", salesPerson.id), {
            onSuccess: () => toast.success("Data sales berhasil diperbarui"),
        });
    };

    return (
        <>
            <Head title={`Edit Sales: ${salesPerson.name}`} />
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <Link href={route('sales-people.index')} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 transition-all">
                        <IconArrowLeft size={20} /> Kembali ke daftar
                    </Link>
                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">
                        ID: {salesPerson.code}
                    </span>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Toko / Cabang</label>
                                <select
                                    value={data.store_id}
                                    onChange={e => setData('store_id', e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">Pilih Toko</option>
                                    {stores.map(store => (
                                        <option key={store.id} value={store.id}>{store.name}</option>
                                    ))}
                                </select>
                                {errors.store_id && <p className="text-red-500 text-xs mt-1">{errors.store_id}</p>}
                            </div>
                            <Input label="Kode Sales (NIK/ID)" value={data.code} onChange={e => setData('code', e.target.value)} errors={errors.code} />

                            <Input label="Nama Lengkap" value={data.name} onChange={e => setData('name', e.target.value)} errors={errors.name} />
                            <Input label="Tanggal Bergabung" type="date" value={data.join_date} onChange={e => setData('join_date', e.target.value)} errors={errors.join_date} />

                            <Input label="Nomor Telepon" value={data.phone} onChange={e => setData('phone', e.target.value)} errors={errors.phone} />
                            <Input label="Email" type="email" value={data.email} onChange={e => setData('email', e.target.value)} errors={errors.email} />
                        </div>

                        <div className="flex items-center justify-between mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <span className="text-sm font-bold">Status Keaktifan Sales</span>
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={e => setData('is_active', e.target.checked)}
                                className="w-10 h-5 bg-slate-200 rounded-full appearance-none checked:bg-primary-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:left-5 after:transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="submit" disabled={processing} className="px-8 py-2.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-primary-500/30">
                            <IconDeviceFloppy size={20} />
                            {processing ? 'Memperbarui...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = (page) => <DashboardLayout children={page} />;
