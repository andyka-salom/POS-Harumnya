import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";
import { IconMenu2, IconMoon, IconSun, IconSpray } from "@tabler/icons-react";
import AuthDropdown from "@/Components/Dashboard/AuthDropdown";
import Menu from "@/Utils/Menu";
import Notification from "@/Components/Dashboard/Notification";

export default function Navbar({ toggleSidebar, themeSwitcher, darkMode }) {
    const { auth } = usePage().props;
    const menuNavigation = Menu();

    const links = menuNavigation.flatMap((item) => item.details);
    const sublinks = links
        .filter((item) => item.hasOwnProperty("subdetails"))
        .flatMap((item) => item.subdetails);

    const getCurrentTitle = () => {
        for (const link of links) {
            if (link.hasOwnProperty("subdetails")) {
                const activeSublink = sublinks.find((s) => s.active);
                if (activeSublink) return activeSublink.title;
            } else if (link.active) {
                return link.title;
            }
        }
        return "Dashboard";
    };

    const [isMobile, setIsMobile] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 0);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const currentTitle = getCurrentTitle();

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

                .nb-root {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    position: sticky; top: 0; z-index: 30;
                    height: 64px;
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 0 20px;
                    background: rgba(255,255,255,0.97);
                    border-bottom: 1px solid rgba(86,184,195,0.18);
                    transition: all 0.25s;
                }
                .nb-root.nb-scrolled {
                    box-shadow: 0 4px 24px rgba(7,35,40,0.08), 0 1px 0 rgba(86,184,195,0.12);
                }
                .nb-root.nb-dark {
                    background: rgba(7,35,40,0.97);
                    border-bottom-color: rgba(86,184,195,0.12);
                }

                /* Teal shimmer line at top */
                .nb-root::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; height: 2px;
                    background: linear-gradient(90deg, transparent 0%, #56B8C3 30%, #82CDD6 50%, #56B8C3 70%, transparent 100%);
                    opacity: 0.7;
                }

                /* ── Left ── */
                .nb-left { display: flex; align-items: center; gap: 14px; }

                .nb-toggle-btn {
                    display: none;
                    padding: 8px; border-radius: 10px;
                    background: none; border: none; cursor: pointer;
                    color: #5A8A90;
                    transition: all 0.2s;
                }
                @media (min-width: 768px) { .nb-toggle-btn { display: flex; align-items: center; } }
                .nb-toggle-btn:hover {
                    color: #56B8C3;
                    background: rgba(86,184,195,0.1);
                }

                /* Mobile logo */
                .nb-mobile-logo {
                    display: flex; align-items: center; gap: 9px;
                    text-decoration: none;
                }
                @media (min-width: 768px) { .nb-mobile-logo { display: none; } }
                .nb-mobile-logo-img {
                    width: 32px; height: 32px; border-radius: 9px;
                    overflow: hidden; flex-shrink: 0;
                    border: 1.5px solid rgba(86,184,195,0.35);
                    box-shadow: 0 0 10px rgba(86,184,195,0.2);
                }
                .nb-mobile-logo-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .nb-mobile-brand {
                    font-family: 'Cormorant Garamond', serif;
                    font-size: 19px; font-weight: 700;
                    color: #0D2B30; line-height: 1; letter-spacing: -0.2px;
                }
                .nb-dark .nb-mobile-brand { color: #E4F6F8; }

                /* Separator + page title */
                .nb-title-area {
                    display: none;
                    align-items: center; gap: 14px;
                }
                @media (min-width: 768px) { .nb-title-area { display: flex; } }
                .nb-separator {
                    width: 1px; height: 22px;
                    background: linear-gradient(180deg, transparent, rgba(86,184,195,0.4), transparent);
                }
                .nb-breadcrumb { display: flex; align-items: center; gap: 6px; }
                .nb-breadcrumb-prefix {
                    font-size: 11px; font-weight: 600;
                    letter-spacing: 1.2px; text-transform: uppercase;
                    color: rgba(86,184,195,0.6);
                }
                .nb-breadcrumb-sep { color: rgba(86,184,195,0.3); font-size: 14px; }
                .nb-page-title {
                    font-size: 15px; font-weight: 700;
                    color: #0D2B30; letter-spacing: -0.1px;
                }
                .nb-dark .nb-page-title { color: #E4F6F8; }

                /* ── Right ── */
                .nb-right { display: flex; align-items: center; gap: 6px; }

                /* Icon buttons */
                .nb-icon-btn {
                    padding: 9px; border-radius: 11px;
                    background: none; border: none; cursor: pointer;
                    color: #5A8A90;
                    transition: all 0.2s; display: flex;
                    position: relative;
                }
                .nb-icon-btn:hover {
                    color: #56B8C3;
                    background: rgba(86,184,195,0.1);
                }
                .nb-dark .nb-icon-btn { color: rgba(86,184,195,0.5); }
                .nb-dark .nb-icon-btn:hover { color: #56B8C3; background: rgba(86,184,195,0.12); }

                /* Vertical divider */
                .nb-vdivider {
                    width: 1px; height: 28px; margin: 0 4px;
                    background: linear-gradient(180deg, transparent, rgba(86,184,195,0.25), transparent);
                }
            `}</style>

            <header className={`nb-root${scrolled ? " nb-scrolled" : ""}${darkMode ? " nb-dark" : ""}`}>

                {/* Left */}
                <div className="nb-left">
                    {/* Desktop sidebar toggle */}
                    <button className="nb-toggle-btn" onClick={toggleSidebar} title="Toggle Sidebar">
                        <IconMenu2 size={20} strokeWidth={1.5} />
                    </button>

                    {/* Mobile logo */}
                    <a href="/" className="nb-mobile-logo">
                        <div className="nb-mobile-logo-img">
                            <img src="/Logo.png" alt="Harumnya" />
                        </div>
                        <span className="nb-mobile-brand">Harumnya</span>
                    </a>

                    {/* Page title */}
                    <div className="nb-title-area">
                        <div className="nb-separator"></div>
                        <div className="nb-breadcrumb">
                            <span className="nb-breadcrumb-prefix">Harumnya</span>
                            <span className="nb-breadcrumb-sep">/</span>
                            <h1 className="nb-page-title">{currentTitle}</h1>
                        </div>
                    </div>
                </div>

                {/* Right */}
                <div className="nb-right">
                    {/* Theme toggle */}
                    {/* <button
                        className="nb-icon-btn"
                        onClick={themeSwitcher}
                        title={darkMode ? "Light Mode" : "Dark Mode"}
                    >
                        {darkMode ? (
                            <IconSun size={19} strokeWidth={1.5} style={{ color: "#E8B84B" }} />
                        ) : (
                            <IconMoon size={19} strokeWidth={1.5} />
                        )}
                    </button> */}

                    {/* Notifications */}
                    {/* <Notification /> */}

                    {/* Divider */}
                    <div className="nb-vdivider"></div>

                    {/* Auth */}
                    <AuthDropdown auth={auth} isMobile={isMobile} />
                </div>
            </header>
        </>
    );
}
