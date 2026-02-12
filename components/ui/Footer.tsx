"use client";

import React from "react";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 transition-colors duration-200">
            <div className="max-w-5xl mx-auto px-4 py-4">
                <div className="flex justify-center items-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        © {new Date().getFullYear()}{" "}
                        <a
                            href="https://cryptoeconlab.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium inline-flex items-center gap-1.5"
                        >
                            <Image
                                src="/cel-logo-big.svg"
                                alt=""
                                width={20}
                                height={20}
                                className="h-4 w-auto"
                            />
                            CryptoEconLab
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
