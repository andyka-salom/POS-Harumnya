import { router } from '@inertiajs/react'; // Gunakan router langsung untuk fleksibilitas lebih
import { IconSearch, IconX } from '@tabler/icons-react';
import React, { useEffect, useRef, useState } from 'react';

export default function Search({ url, placeholder = 'Search...', value = '' }) {
    // Gunakan state lokal agar input terasa instan (tidak lag karena debounce)
    const [searchQuery, setSearchQuery] = useState(value);
    const [isSearching, setIsSearching] = useState(false);

    // Ref untuk melacak apakah ini render pertama
    const isFirstRender = useRef(true);
    const debounceTimeout = useRef(null);

    // Sinkronisasi state lokal jika prop 'value' berubah (misal tombol reset diklik di parent)
    useEffect(() => {
        setSearchQuery(value);
    }, [value]);

    useEffect(() => {
        // Jangan jalankan pencarian di render pertama (mencegah reset URL saat page load)
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        // Debounce Logic
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        debounceTimeout.current = setTimeout(() => {
            // Ambil parameter URL saat ini (seperti page, gender, dll)
            const params = new URLSearchParams(window.location.search);

            // Update atau hapus parameter search
            if (searchQuery) {
                params.set('search', searchQuery);
            } else {
                params.delete('search');
            }

            // RESET halaman ke 1 saat user mengetik pencarian baru
            params.delete('page');

            setIsSearching(true);

            // Navigasi menggunakan router.get dengan object data agar Inertia yang menangani URL
            router.get(url, Object.fromEntries(params.entries()), {
                preserveState: true,
                preserveScroll: true,
                replace: true, // Agar tidak memenuhi history browser
                onFinish: () => setIsSearching(false),
            });
        }, 500);

        return () => clearTimeout(debounceTimeout.current);
    }, [searchQuery]);

    const clearSearch = () => {
        setSearchQuery('');
    };

    return (
        <div className="relative w-full max-w-md">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <IconSearch
                        className={`w-5 h-5 transition-colors ${
                            isSearching ? 'text-primary-500' : 'text-slate-400'
                        }`}
                        strokeWidth={2}
                    />
                </div>

                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="
                        w-full h-11 pl-10 pr-10
                        text-sm font-medium
                        bg-white dark:bg-slate-900
                        border border-slate-200 dark:border-slate-800
                        rounded-xl
                        text-slate-900 dark:text-slate-100
                        placeholder:text-slate-400
                        focus:ring-4 focus:ring-primary-500/10
                        focus:border-primary-500
                        transition-all duration-200
                    "
                    placeholder={placeholder}
                    autoComplete="off"
                />

                {searchQuery && !isSearching && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                    >
                        <IconX className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                )}

                {isSearching && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
