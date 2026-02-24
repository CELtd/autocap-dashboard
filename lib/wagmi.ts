
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { filecoin } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'Filecoin AutoCap',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [filecoin],
    ssr: true,
});
