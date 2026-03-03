import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { IconX, IconChevronDown, IconChevronRight, IconMenu2 } from "@tabler/icons-react";
import LinkItem from "@/Components/Dashboard/LinkItem";
import LinkItemDropdown from "@/Components/Dashboard/LinkItemDropdown";
import Menu from "@/Utils/Menu";

export default function Sidebar({ sidebarOpen, onClose }) {
    const { auth } = usePage().props;
    const menuNavigation = Menu();
    const [openSections, setOpenSections] = useState({});
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const check = () => setIsDark(document.documentElement.classList.contains("dark"));
        check();
        const observer = new MutationObserver(check);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    const toggleSection = (index) => {
        setOpenSections((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    const closeMobile = () => {
        setMobileOpen(false);
        if (onClose) onClose();
    };

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) { setMobileOpen(false); document.body.style.overflow = ""; }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const t = isDark ? {
        bg:           "#0D2B30",
        bgUser:       "linear-gradient(135deg, #0F3339 0%, #112F35 100%)",
        bgFooter:     "linear-gradient(135deg, #0A2328, #0D2D33)",
        border:       "rgba(86,184,195,0.14)",
        borderUser:   "rgba(86,184,195,0.18)",
        logoShadow:   "0 3px 12px rgba(86,184,195,0.25)",
        brandName:    "#E4F6F8",
        userName:     "#E4F6F8",
        userEmail:    "rgba(86,184,195,0.55)",
        sectionLabel: "rgba(86,184,195,0.45)",
        sectionHover: "rgba(86,184,195,0.8)",
        sectionLine:  "rgba(86,184,195,0.12)",
        chevron:      "rgba(86,184,195,0.3)",
        scrollThumb:  "rgba(86,184,195,0.25)",
        footerText:   "rgba(86,184,195,0.3)",
        closeBtnHover:"rgba(86,184,195,0.12)",
        hamburgerBg:  "#0D2B30",
        hamburgerBdr: "rgba(86,184,195,0.3)",
        hamburgerClr: "#56B8C3",
        topBar:       "linear-gradient(90deg, #1A6B77, #56B8C3, #82CDD6, #56B8C3, #1A6B77)",
        // active item tokens (dark)
        activeText:   "#82CDD6",
        activeBg:     "rgba(86,184,195,0.12)",
        activeIcon:   "#FFFFFF",
        inactiveText: "rgba(86,184,195,0.6)",
        inactiveIcon: "rgba(86,184,195,0.5)",
        hoverBg:      "rgba(86,184,195,0.08)",
        hoverText:    "#82CDD6",
    } : {
        bg:           "#FFFFFF",
        bgUser:       "linear-gradient(135deg, #F0FAFB 0%, #E8F7F9 100%)",
        bgFooter:     "linear-gradient(135deg, #F7FDFE, #EFFAFB)",
        border:       "#D8F0F3",
        borderUser:   "#D5EFF2",
        logoShadow:   "0 3px 12px rgba(86,184,195,0.18)",
        brandName:    "#0D2B30",
        userName:     "#0D2B30",
        userEmail:    "#5A8A90",
        sectionLabel: "#82CDD6",
        sectionHover: "#3A9DAA",
        sectionLine:  "#D5EFF2",
        chevron:      "#B8E8ED",
        scrollThumb:  "#B8E8ED",
        footerText:   "#A8CACF",
        closeBtnHover:"#EBF7F9",
        hamburgerBg:  "#FFFFFF",
        hamburgerBdr: "#D5EFF2",
        hamburgerClr: "#3A9DAA",
        topBar:       "linear-gradient(90deg, #3A9DAA, #56B8C3, #82CDD6, #56B8C3, #3A9DAA)",
        // active item tokens (light)
        activeText:   "#0D6B77",
        activeBg:     "rgba(86,184,195,0.13)",
        activeIcon:   "#FFFFFF",
        inactiveText: "#5A8A90",
        inactiveIcon: "#82CDD6",
        hoverBg:      "rgba(86,184,195,0.07)",
        hoverText:    "#3A9DAA",
    };

    const NavContent = ({ isMobile = false }) => {
        const expanded = isMobile || sidebarOpen;

        return (
            <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                display: "flex", flexDirection: "column",
                height: "100%", width: "100%",
                background: t.bg,
                borderRight: `1.5px solid ${t.border}`,
                position: "relative", overflow: "hidden",
                transition: "background 0.3s, border-color 0.3s",
            }}>
                {/* CSS overrides for LinkItem active/inactive states per theme */}
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

                    /* Scrollbar */
                    .sb-scroll::-webkit-scrollbar { width: 3px; }
                    .sb-scroll::-webkit-scrollbar-track { background: transparent; }
                    .sb-scroll::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 10px; }

                    /* Section button hover */
                    .sb-sec-btn:hover .sb-sec-lbl { color: ${t.sectionHover} !important; }
                    .sb-sec-btn:hover .sb-sec-chev { color: #56B8C3 !important; }

                    /* ── Active link (expanded) ── */
                    a[data-active="true"].sb-link-exp {
                        color: ${t.activeText} !important;
                        background: ${t.activeBg} !important;
                        border-left-color: #56B8C3 !important;
                        font-weight: 700 !important;
                    }
                    a[data-active="true"].sb-link-exp .sb-icon {
                        background: linear-gradient(135deg, #56B8C3 0%, #3A9DAA 100%) !important;
                        box-shadow: 0 3px 10px rgba(86,184,195,0.35) !important;
                        color: #fff !important;
                    }

                    /* ── Inactive link (expanded) ── */
                    a[data-active="false"].sb-link-exp {
                        color: ${t.inactiveText} !important;
                        background: transparent !important;
                        border-left-color: transparent !important;
                    }
                    a[data-active="false"].sb-link-exp .sb-icon {
                        background: transparent !important;
                        color: ${t.inactiveIcon} !important;
                        box-shadow: none !important;
                    }
                    a[data-active="false"].sb-link-exp:hover {
                        background: ${t.hoverBg} !important;
                        color: ${t.hoverText} !important;
                    }

                    /* ── Active link (collapsed) ── */
                    a[data-active="true"].sb-link-col {
                        background: linear-gradient(135deg, #56B8C3 0%, #3A9DAA 100%) !important;
                        color: #fff !important;
                        box-shadow: 0 3px 12px rgba(86,184,195,0.4) !important;
                        border-left-color: #56B8C3 !important;
                    }

                    /* ── Inactive link (collapsed) ── */
                    a[data-active="false"].sb-link-col {
                        background: transparent !important;
                        color: ${t.inactiveIcon} !important;
                        box-shadow: none !important;
                        border-left-color: transparent !important;
                    }
                    a[data-active="false"].sb-link-col:hover {
                        background: rgba(86,184,195,0.1) !important;
                        color: #56B8C3 !important;
                    }

                    @keyframes liDot {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50%       { opacity: 0.4; transform: scale(0.6); }
                    }
                    @keyframes sbPulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50%      { transform: scale(0.7); opacity: 0.4; }
                    }
                `}</style>

                {/* Top accent bar */}
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    background: t.topBar, zIndex: 10,
                }} />

                {/* Subtle glow */}
                <div style={{
                    position: "absolute", top: 40, right: -50,
                    width: 200, height: 200,
                    background: isDark
                        ? "radial-gradient(circle, rgba(86,184,195,0.1) 0%, transparent 70%)"
                        : "radial-gradient(circle, rgba(86,184,195,0.07) 0%, transparent 70%)",
                    pointerEvents: "none", zIndex: 0,
                }} />

                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", paddingTop: 3 }}>

                    {/* ── Logo ── */}
                    <div style={{
                        flexShrink: 0, display: "flex", alignItems: "center",
                        justifyContent: "space-between", padding: "0 14px", height: 64,
                        background: isDark ? "rgba(0,0,0,0.2)" : "#FFFFFF",
                        borderBottom: `1px solid ${t.border}`,
                        transition: "background 0.3s",
                    }}>
                        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: 11, overflow: "hidden", flexShrink: 0,
                                border: "2px solid rgba(86,184,195,0.35)",
                                boxShadow: t.logoShadow, transition: "box-shadow 0.25s",
                            }}>
                                <img src="/Logo.png" alt="Harumnya" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            </div>
                            {expanded && (
                                <div>
                                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 21, fontWeight: 700, color: t.brandName, lineHeight: 1, letterSpacing: -0.3, transition: "color 0.3s" }}>Harumnya</div>
                                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#56B8C3", marginTop: 3 }}>Parfum · POS</div>
                                </div>
                            )}
                        </a>
                        {isMobile && (
                            <button onClick={closeMobile} style={{
                                padding: 6, borderRadius: 8, background: "none", border: "none",
                                cursor: "pointer", color: "#A0C4C8", display: "flex",
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = t.closeBtnHover; e.currentTarget.style.color = "#3A9DAA"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#A0C4C8"; }}
                            >
                                <IconX size={18} />
                            </button>
                        )}
                    </div>

                    {/* ── User Card ── */}
                    <div style={{
                        flexShrink: 0, margin: "10px 10px 6px",
                        padding: "12px 13px", borderRadius: 14,
                        background: t.bgUser,
                        border: `1px solid ${t.borderUser}`,
                        boxShadow: isDark ? "none" : "0 2px 8px rgba(86,184,195,0.07)",
                        transition: "background 0.3s, border-color 0.3s",
                    }}>
                        {expanded ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                                <img
                                    src={auth.user.avatar || `https://ui-avatars.com/api/?name=${auth.user.name}&background=56B8C3&color=fff`}
                                    style={{ width: 42, height: 42, borderRadius: "50%", border: "2.5px solid #56B8C3", boxShadow: "0 0 0 3px rgba(86,184,195,0.15)", flexShrink: 0 }}
                                    alt={auth.user.name}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: t.userName, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: "color 0.3s" }}>{auth.user.name}</div>
                                    <div style={{ fontSize: 11, color: t.userEmail, fontWeight: 400, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: "color 0.3s" }}>{auth.user.email}</div>
                                    <div style={{
                                        display: "inline-flex", alignItems: "center",
                                        padding: "2px 9px", borderRadius: 100, marginTop: 6,
                                        background: "#56B8C3", fontSize: 9, fontWeight: 800,
                                        letterSpacing: 1, textTransform: "uppercase", color: "#fff",
                                        boxShadow: "0 2px 6px rgba(86,184,195,0.4)",
                                    }}>Admin</div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: "flex", justifyContent: "center" }}>
                                <img
                                    src={auth.user.avatar || `https://ui-avatars.com/api/?name=${auth.user.name}&background=56B8C3&color=fff`}
                                    style={{ width: 34, height: 34, borderRadius: "50%", border: "2.5px solid #56B8C3", boxShadow: "0 0 0 3px rgba(86,184,195,0.15)" }}
                                    alt={auth.user.name}
                                />
                            </div>
                        )}
                    </div>

                    {/* ── Nav ── */}
                    <nav style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 0" }} className="sb-scroll">
                        {menuNavigation.map((section, index) => {
                            const hasPermission = section.details.some(d => d.permissions === true);
                            if (!hasPermission) return null;
                            const isOpen = openSections[index] !== false;

                            return (
                                <div key={index} style={{ marginBottom: 2 }}>
                                    {expanded && (
                                        <>
                                            <button className="sb-sec-btn" onClick={() => toggleSection(index)} style={{
                                                width: "100%", padding: "10px 16px 5px",
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                background: "none", border: "none", cursor: "pointer",
                                            }}>
                                                <span className="sb-sec-lbl" style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.7px", textTransform: "uppercase", color: t.sectionLabel, transition: "color 0.2s" }}>
                                                    {section.title}
                                                </span>
                                                <span className="sb-sec-chev" style={{ color: t.chevron, transition: "color 0.2s" }}>
                                                    {isOpen ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
                                                </span>
                                            </button>
                                            <div style={{ height: 1, margin: "2px 16px 5px", background: `linear-gradient(90deg, ${t.sectionLine}, transparent)` }} />
                                        </>
                                    )}

                                    <div className={!isOpen && expanded ? "hidden" : "block"}>
                                        {section.details.map((detail, idx) => {
                                            if (!detail.permissions) return null;
                                            if (detail.hasOwnProperty("subdetails")) {
                                                return (
                                                    <LinkItemDropdown
                                                        key={idx}
                                                        title={detail.title}
                                                        icon={detail.icon}
                                                        data={detail.subdetails}
                                                        access={detail.permissions}
                                                        sidebarOpen={expanded}
                                                    />
                                                );
                                            }
                                            return (
                                                <LinkItem
                                                    key={idx}
                                                    title={detail.title}
                                                    icon={detail.icon}
                                                    href={detail.href}
                                                    access={detail.permissions}
                                                    sidebarOpen={expanded}
                                                    onClick={isMobile ? closeMobile : undefined}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </nav>

                    {/* ── Footer ── */}
                    {expanded && (
                        <div style={{
                            flexShrink: 0, padding: "12px 16px",
                            borderTop: `1px solid ${t.border}`,
                            background: t.bgFooter,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            transition: "background 0.3s, border-color 0.3s",
                        }}>
                            <div style={{
                                width: 5, height: 5, borderRadius: "50%",
                                background: "#56B8C3", boxShadow: "0 0 7px rgba(86,184,195,0.6)",
                                animation: "sbPulse 2.5s ease-in-out infinite",
                            }} />
                            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: t.footerText, transition: "color 0.3s" }}>
                                Harumnya v2.0
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* DESKTOP */}
            <div className="hidden md:flex flex-col h-screen sticky top-0 overflow-hidden transition-all duration-300 ease-in-out"
                style={{ width: sidebarOpen ? "260px" : "80px" }}>
                <NavContent isMobile={false} />
            </div>

            {/* MOBILE Hamburger */}
            <button
                className="md:hidden fixed top-3.5 left-4 z-30 p-2 rounded-lg shadow-sm transition-all"
                style={{ background: t.hamburgerBg, border: `1px solid ${t.hamburgerBdr}`, color: t.hamburgerClr, boxShadow: "0 2px 10px rgba(86,184,195,0.15)" }}
                onClick={() => setMobileOpen(true)}
                aria-label="Buka menu"
            >
                <IconMenu2 size={20} />
            </button>

            {/* Backdrop */}
            <div
                className={`md:hidden fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                style={{ background: "rgba(13,43,48,0.45)" }}
                onClick={closeMobile}
            />

            {/* Mobile Drawer */}
            <div
                className={`md:hidden fixed inset-y-0 left-0 z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
                style={{ height: "100dvh", width: "280px" }}
            >
                <NavContent isMobile={true} />
            </div>
        </>
    );
}
