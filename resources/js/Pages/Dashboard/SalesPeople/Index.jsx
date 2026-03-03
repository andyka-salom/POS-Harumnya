import React from "react";
import DashboardLayout from "@/Layouts/DashboardLayout";
import { Head, Link } from "@inertiajs/react";
import Button from "@/Components/Dashboard/Button";
import { IconUsers, IconTargetArrow, IconPencilCog, IconTrash, IconCirclePlus } from "@tabler/icons-react";
import Table from "@/Components/Dashboard/Table";
import Pagination from "@/Components/Dashboard/Pagination";
import Search from "@/Components/Dashboard/Search";

export default function Index({ salesPeople }) {
    return (
        <>
            <Head title="Sales People" />
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <IconUsers className="text-primary-500" /> Tenaga Penjual
                    </h1>
                </div>
                <Button type="link" href={route('sales-people.create')} icon={<IconCirclePlus size={18} />} className="bg-primary-600 text-white" label="Tambah Sales" />
            </div>

            <div className="mb-4 w-full sm:w-80">
                <Search url={route('sales-people.index')} placeholder="Cari nama atau kode..." />
            </div>

            <Table.Card title="Daftar Sales">
                <Table>
                    <Table.Thead>
                        <tr>
                            <Table.Th>Sales</Table.Th>
                            <Table.Th>Toko / Cabang</Table.Th>
                            <Table.Th>Kontak</Table.Th>
                            <Table.Th className="text-center">Status</Table.Th>
                            <Table.Th></Table.Th>
                        </tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {salesPeople.data.map((s) => (
                            <tr key={s.id}>
                                <Table.Td>
                                    <div className="font-bold">{s.name}</div>
                                    <div className="text-xs text-slate-500 font-mono">{s.code}</div>
                                </Table.Td>
                                <Table.Td>{s.store?.name}</Table.Td>
                                <Table.Td>
                                    <div className="text-sm">{s.phone || '-'}</div>
                                    <div className="text-xs text-slate-400">{s.email || '-'}</div>
                                </Table.Td>
                                <Table.Td className="text-center">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {s.is_active ? 'AKTIF' : 'NON-AKTIF'}
                                    </span>
                                </Table.Td>
                                <Table.Td>
                                    <div className="flex gap-2">
                                        <Link href={route('sales-people.targets', s.id)} className="p-2 bg-primary-50 text-primary-600 rounded-lg" title="Set Target Bulanan">
                                            <IconTargetArrow size={18} />
                                        </Link>
                                        <Button type="edit" href={route('sales-people.edit', s.id)} icon={<IconPencilCog size={16} />} className="bg-warning-50 text-warning-600" />
                                        <Button type="delete" url={route('sales-people.destroy', s.id)} icon={<IconTrash size={16} />} className="bg-danger-50 text-danger-600" />
                                    </div>
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Table.Card>
            <Pagination links={salesPeople.links} />
        </>
    );
}
Index.layout = (page) => <DashboardLayout children={page} />;
