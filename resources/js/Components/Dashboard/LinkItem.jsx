import React from "react";
import { Link, usePage } from "@inertiajs/react";

export default function LinkItem({ href, icon, access, title, sidebarOpen, exact = false, ...props }) {
    const { url } = usePage();
    const { auth } = usePage().props;

    // Normalize href: Ziggy route() kadang return full URL, Inertia url selalu relative path
    const normHref = (() => {
        try {
            const u = new URL(href);
            return u.pathname + (u.search || "");
        } catch {
            return href;
        }
    })();

    // Exact match: hanya cocok jika URL persis sama (tanpa startsWith)
    // Dipakai otomatis jika normHref tidak mengandung segmen unik (misal /dashboard)
    // atau jika prop `exact` di-pass secara eksplisit.
    //
    // Aturan: jika path hanya 1 level dari root (/dashboard, /profile, dll)
    // → paksa exact match agar tidak false-positive ke child routes
    const segments = normHref.replace(/^\//, "").split("/").filter(Boolean);
    const forceExact = exact || segments.length <= 1;

    const isActive = forceExact
        ? url === normHref
        : url === normHref ||
          url.startsWith(normHref + "/") ||
          url.startsWith(normHref + "?");

    const canAccess = auth.super === true || access === true;
    if (!canAccess) return null;

    /* ── EXPANDED ── */
    if (sidebarOpen) {
        return (
            <Link
                href={href}
                data-active={String(isActive)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    margin: "2px 8px",
                    padding: "7px 10px",
                    borderRadius: 11,
                    textDecoration: "none",
                    fontSize: 13.5,
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: isActive ? "-0.1px" : "0px",
                    color: isActive ? "#0D6B77" : "#5A8A90",
                    background: isActive ? "rgba(86,184,195,0.13)" : "transparent",
                    borderLeft: `3px solid ${isActive ? "#56B8C3" : "transparent"}`,
                    transition: "background 0.2s, color 0.2s, border-color 0.2s",
                }}
                onMouseEnter={e => {
                    if (!isActive) {
                        e.currentTarget.style.background = "rgba(86,184,195,0.07)";
                        e.currentTarget.style.color = "#3A9DAA";
                    }
                }}
                onMouseLeave={e => {
                    if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#5A8A90";
                    }
                }}
                {...props}
            >
                <span style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: isActive
                        ? "linear-gradient(135deg, #56B8C3 0%, #3A9DAA 100%)"
                        : "transparent",
                    boxShadow: isActive ? "0 3px 10px rgba(86,184,195,0.35)" : "none",
                    color: isActive ? "#FFFFFF" : "#82CDD6",
                    transition: "background 0.2s, box-shadow 0.2s, color 0.2s",
                }}>
                    {icon}
                </span>

                <span style={{
                    flex: 1, minWidth: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                    {title}
                </span>

                {isActive && (
                    <span style={{
                        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                        background: "#56B8C3",
                        boxShadow: "0 0 6px rgba(86,184,195,0.8)",
                        animation: "liDot 2.5s ease-in-out infinite",
                    }} />
                )}

                <style>{`
                    @keyframes liDot {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50%       { opacity: 0.4; transform: scale(0.6); }
                    }
                `}</style>
            </Link>
        );
    }

    /* ── COLLAPSED ── */
    return (
        <Link
            href={href}
            title={title}
            data-active={String(isActive)}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "3px 8px",
                padding: "9px 0",
                borderRadius: 11,
                textDecoration: "none",
                color: isActive ? "#FFFFFF" : "#82CDD6",
                background: isActive
                    ? "linear-gradient(135deg, #56B8C3 0%, #3A9DAA 100%)"
                    : "transparent",
                boxShadow: isActive ? "0 3px 12px rgba(86,184,195,0.4)" : "none",
                borderLeft: `3px solid ${isActive ? "#56B8C3" : "transparent"}`,
                transition: "background 0.2s, box-shadow 0.2s, color 0.2s",
            }}
            onMouseEnter={e => {
                if (!isActive) {
                    e.currentTarget.style.background = "rgba(86,184,195,0.1)";
                    e.currentTarget.style.color = "#56B8C3";
                }
            }}
            onMouseLeave={e => {
                if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#82CDD6";
                }
            }}
            {...props}
        >
            {icon}
        </Link>
    );
}
