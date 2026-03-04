import React, { useEffect, useState, useRef } from "react";
import Sidebar from "@/Components/Dashboard/Sidebar";
import Navbar from "@/Components/Dashboard/Navbar";
import { Toaster } from "react-hot-toast";
import { useTheme } from "@/Context/ThemeSwitcherContext";
import { usePage } from "@inertiajs/react";

export default function AppLayout({ children }) {
    const { darkMode, themeSwitcher } = useTheme();
    const mainRef = useRef(null);
    const { url } = usePage();

    const [sidebarOpen, setSidebarOpen] = useState(
        localStorage.getItem("sidebarOpen") === "true"
    );

    useEffect(() => {
        localStorage.setItem("sidebarOpen", sidebarOpen);
    }, [sidebarOpen]);

    // Scroll ke top hanya jika PATHNAME berubah (bukan query string / hash)
    const prevPathname = useRef(null);
    useEffect(() => {
        try {
            const pathname = new URL(url, window.location.origin).pathname;
            if (prevPathname.current !== null && prevPathname.current !== pathname) {
                if (mainRef.current) {
                    mainRef.current.scrollTop = 0;
                }
            }
            prevPathname.current = pathname;
        } catch {
            // abaikan jika URL tidak valid
        }
    }, [url]);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    return (
        <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 transition-colors duration-200">
            <Sidebar sidebarOpen={sidebarOpen} />
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                <Navbar
                    toggleSidebar={toggleSidebar}
                    themeSwitcher={themeSwitcher}
                    darkMode={darkMode}
                />
                <main ref={mainRef} className="flex-1 overflow-y-auto">
                    <div className="w-full py-6 px-4 md:px-6 lg:px-8 pb-20 md:pb-6">
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                className: "text-sm",
                                duration: 3000,
                                style: {
                                    background: darkMode ? "#1e293b" : "#fff",
                                    color: darkMode ? "#f1f5f9" : "#1e293b",
                                    border: `1px solid ${
                                        darkMode ? "#334155" : "#e2e8f0"
                                    }`,
                                    borderRadius: "12px",
                                },
                            }}
                        />
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
