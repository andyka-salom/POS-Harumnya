import defaultTheme from "tailwindcss/defaultTheme";
import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php",
        "./storage/framework/views/*.php",
        "./resources/views/**/*.blade.php",
        "./resources/js/**/*.jsx",
    ],
    darkMode: "class",
    theme: {
        extend: {
            fontFamily: {
                sans: [
                    "Inter",
                    "Plus Jakarta Sans",
                    ...defaultTheme.fontFamily.sans,
                ],
                mono: [
                    "JetBrains Mono",
                    "Fira Code",
                    ...defaultTheme.fontFamily.mono,
                ],
            },
            colors: {
                // Primary - Deep Teal (sidebar background, main dark color)
                primary: {
                    50: "#e6f4f6",
                    100: "#c0e3e9",
                    200: "#8dcad5",
                    300: "#52afc0",
                    400: "#2b98ae",
                    500: "#0e8299",
                    600: "#0a6e82",
                    700: "#075a6b",
                    800: "#054656",
                    900: "#0d2d3a",  // main sidebar dark bg
                    950: "#071a22",
                },
                // Accent - Bright Cyan/Teal (active states, highlights, badges)
                accent: {
                    50: "#e0faf8",
                    100: "#b3f3ee",
                    200: "#7deae3",
                    300: "#3dddd6",
                    400: "#16d0c9",  // bright active highlight
                    500: "#0ab8b0",
                    600: "#089b94",
                    700: "#067d77",
                    800: "#04605b",
                    900: "#024441",
                    950: "#012928",
                },
                // Sidebar - Dark Navy Teal shades for sidebar layers
                sidebar: {
                    bg: "#0d2d3a",        // main sidebar background
                    surface: "#0f3545",   // slightly lighter surface
                    hover: "#134050",     // hover state
                    active: "#1a5265",    // active/selected item bg
                    border: "#1b4d5e",    // subtle borders
                    muted: "#4d8a9a",     // muted text
                    text: "#b8d8e0",      // default sidebar text
                    heading: "#6bb8c8",   // section headings
                },
                // Success - Emerald
                success: {
                    50: "#ecfdf5",
                    100: "#d1fae5",
                    200: "#a7f3d0",
                    300: "#6ee7b7",
                    400: "#34d399",
                    500: "#10b981",
                    600: "#059669",
                    700: "#047857",
                    800: "#065f46",
                    900: "#064e3b",
                    950: "#022c22",
                },
                // Warning - Amber
                warning: {
                    50: "#fffbeb",
                    100: "#fef3c7",
                    200: "#fde68a",
                    300: "#fcd34d",
                    400: "#fbbf24",
                    500: "#f59e0b",
                    600: "#d97706",
                    700: "#b45309",
                    800: "#92400e",
                    900: "#78350f",
                    950: "#451a03",
                },
                // Danger - Rose
                danger: {
                    50: "#fff1f2",
                    100: "#ffe4e6",
                    200: "#fecdd3",
                    300: "#fda4af",
                    400: "#fb7185",
                    500: "#f43f5e",
                    600: "#e11d48",
                    700: "#be123c",
                    800: "#9f1239",
                    900: "#881337",
                    950: "#4c0519",
                },
            },
            spacing: {
                18: "4.5rem",
                88: "22rem",
                100: "25rem",
                112: "28rem",
                128: "32rem",
            },
            minHeight: {
                touch: "2.75rem",
                "touch-lg": "3rem",
            },
            minWidth: {
                touch: "2.75rem",
                "touch-lg": "3rem",
            },
            borderRadius: {
                "4xl": "2rem",
            },
            boxShadow: {
                glow: "0 0 20px rgba(14, 130, 153, 0.35)",
                "glow-lg": "0 0 40px rgba(14, 130, 153, 0.45)",
                "glow-accent": "0 0 20px rgba(22, 208, 201, 0.4)",
                "inner-lg": "inset 0 4px 6px -1px rgb(0 0 0 / 0.1)",
                sidebar: "4px 0 24px rgba(7, 26, 34, 0.6)",
            },
            animation: {
                "slide-in": "slideIn 0.2s ease-out",
                "slide-up": "slideUp 0.2s ease-out",
                "fade-in": "fadeIn 0.15s ease-out",
                "pulse-subtle":
                    "pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "bounce-subtle":
                    "bounceSubtle 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                "cart-add": "cartAdd 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            },
            keyframes: {
                slideIn: {
                    "0%": { transform: "translateX(100%)", opacity: "0" },
                    "100%": { transform: "translateX(0)", opacity: "1" },
                },
                slideUp: {
                    "0%": { transform: "translateY(10px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                pulseSubtle: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.7" },
                },
                bounceSubtle: {
                    "0%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.05)" },
                    "100%": { transform: "scale(1)" },
                },
                cartAdd: {
                    "0%": { transform: "scale(0.8)", opacity: "0" },
                    "50%": { transform: "scale(1.1)" },
                    "100%": { transform: "scale(1)", opacity: "1" },
                },
            },
            backdropBlur: {
                xs: "2px",
            },
            transitionDuration: {
                250: "250ms",
            },
        },
    },
    plugins: [forms],
};
