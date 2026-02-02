"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, HelpCircle } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
    const slackPath = "M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z";
    const githubPath = "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.416-4.041-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z";

    return (
        <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-40 transition-colors duration-200">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Brand/Logo Section */}
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <img
                        src="/logo.svg"
                        alt="Filecoin Autocap Logo"
                        className="w-8 h-8 md:w-9 md:h-9"
                    />
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 hidden sm:block">
                        Filecoin Autocap
                    </h1>
                </Link>

                {/* Navigation Section */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <nav className="flex items-center gap-2 mr-2">
                        <Link
                            href="/docs"
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900"
                        >
                            <BookOpen className="w-4 h-4" />
                            <span className="hidden md:inline">How it works</span>
                        </Link>
                        <a
                            href="https://github.com/CELtd/autocap-dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-900"
                            title="GitHub"
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                                <path d={githubPath} />
                            </svg>
                        </a>
                    </nav>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block" />

                    {/* Help & Slack Section */}
                    <div className="flex items-center gap-2">
                        <a
                            href="https://filecoinproject.slack.com/archives/C0AAFFY4UBT"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all shadow-sm"
                            title="Help slack channel"
                        >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                <path d={slackPath} />
                            </svg>
                            <span>Help</span>
                        </a>
                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block" />
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </header>
    );
}
