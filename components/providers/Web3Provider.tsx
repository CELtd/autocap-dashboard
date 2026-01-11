"use client";

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import { useTheme } from 'next-themes';
import '@rainbow-me/rainbowkit/styles.css';

export function Web3Provider({ children }: { children: React.ReactNode }) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <WagmiProvider config={config}>
            <RainbowKitProvider
                theme={mounted && resolvedTheme === 'dark' ? darkTheme() : lightTheme()}
            >
                {children}
            </RainbowKitProvider>
        </WagmiProvider>
    );
}
