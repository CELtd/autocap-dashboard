
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { filecoinCalibration } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'Filecoin Autocap',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [filecoinCalibration],
    ssr: true,
});
