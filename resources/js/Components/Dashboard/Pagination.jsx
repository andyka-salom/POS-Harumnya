import React from 'react';
import { Link } from '@inertiajs/react';
import { IconChevronRight, IconChevronLeft } from '@tabler/icons-react';

export default function Pagination({ links }) {
    if (!links || links.length <= 3) return null;

    const baseButtonStyle = `
        inline-flex items-center justify-center
        min-w-[36px] h-9 px-3
        text-sm font-medium
        border border-gray-300
        rounded-lg
        transition-all duration-200
        dark:border-gray-700
    `;

    const navigationButtonStyle = `
        ${baseButtonStyle}
        bg-white text-gray-700
        hover:bg-gray-50 hover:border-gray-400
        disabled:opacity-50 disabled:cursor-not-allowed
        dark:bg-gray-900 dark:text-gray-300
        dark:hover:bg-gray-800 dark:hover:border-gray-600
    `;

    const pageButtonStyle = (isActive) => `
        ${baseButtonStyle}
        ${isActive
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700'
            : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
        }
    `;

    return (
        <nav className="mt-6 lg:mt-8" aria-label="Pagination Navigation">
            <ul className="flex items-center justify-end gap-1.5">
                {links.map((link, index) => {
                    if (!link.url) return null;

                    // Previous Button
                    if (link.label.includes('Previous')) {
                        return (
                            <li key={`prev-${index}`}>
                                <Link
                                    href={link.url}
                                    className={navigationButtonStyle}
                                    aria-label="Previous page"
                                >
                                    <IconChevronLeft size={18} strokeWidth={2} />
                                    <span className="ml-1 hidden sm:inline">Previous</span>
                                </Link>
                            </li>
                        );
                    }

                    // Next Button
                    if (link.label.includes('Next')) {
                        return (
                            <li key={`next-${index}`}>
                                <Link
                                    href={link.url}
                                    className={navigationButtonStyle}
                                    aria-label="Next page"
                                >
                                    <span className="mr-1 hidden sm:inline">Next</span>
                                    <IconChevronRight size={18} strokeWidth={2} />
                                </Link>
                            </li>
                        );
                    }

                    // Page Number Button
                    return (
                        <li key={`page-${index}`}>
                            <Link
                                href={link.url}
                                className={pageButtonStyle(link.active)}
                                aria-label={`Page ${link.label}`}
                                aria-current={link.active ? 'page' : undefined}
                            >
                                {link.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
