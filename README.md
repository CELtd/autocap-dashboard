# Filecoin Autocap

A real-time monitoring dashboard for the Filecoin Autocap system. This application tracks round status, participant registrations, DataCap allocations, and FIL burning events using on-chain data and Goldsky.

##  What is Filecoin Autocap?

Filecoin Autocap is an experimental system for transparently distributing **DataCap** to Filecoin Storage Providers based on their network contribution—specifically, the amount of FIL burned via **Filecoin Onchain Cloud's Filecoin Pay Contracts**.

**Key Mechanics:**
- **Participation**: Open to all providers; register directly via the dashboard UI with a nominal registration fee.
- **Fair Allocation**: DataCap is distributed proportionally based on the ratio of FIL burned by each participant during the round duration.
- **Iterative Design**: Initial rounds track total FIL burned by participant addresses. Future versions will refine this to only count payments directly linked to sealed sectors.

## �🚀 Features

- **Real-time Round Monitoring**: View current, past, and upcoming rounds with live status updates.
- **Direct Round Registration**: Participants can register for active rounds directly through the UI by connecting their Filecoin wallet.
- **Smart Data Visualization**:
  - Live countdown timers for round start/end.
  - Total FIL burned tracking with smart unit formatting (automatically scales from nFIL to FIL).
  - Allocation tracking for participants.
- **Participant Explorer**: Detailed table of registered participants, their DataCap Actor IDs (f0xxx), and burn stats.
- **Dark Mode Support**: Seamless dark/light mode switching with system preference detection.
- **Responsive Design**: Fully responsive UI built with Tailwind CSS.

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest) (React Query)
- **Blockchain Interaction**: [viem](https://viem.sh/) & [wagmi](https://wagmi.sh/)
- **Indexer**: [Goldsky](https://goldsky.com/) (GraphQL)
- **Runtime**: Node.js / Bun

## ⚙️ Configuration

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd autocap-dashboard-v0
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:

   ```bash
   # Contract Configuration (Required)
   NEXT_PUBLIC_AUTOCAP_ADDRESS=0x...          # Address of the Filecoin Autocap contract

   # RPC Configuration (Optional - defaults to Glif)
   NEXT_PUBLIC_RPC_URL=https://api.calibration.node.glif.io/rpc/v1

   # Subgraph Configuration (Optional)
   NEXT_PUBLIC_SUBGRAPH_URL=https://api.goldsky.com/...       # Goldsky Subgraph URL

   # Dashboard Settings (Optional)
   NEXT_PUBLIC_REFRESH_INTERVAL=30000         # Data refresh rate in ms (default: 30s)
   NEXT_PUBLIC_PARTICIPANTS_PAGE_SIZE=100
   ```

## 🏃‍♂️ Running Locally

Start the development server:

```bash
bun run dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🏗️ Build for Production

```bash
bun run build
bun start
```

## 📦 Project Structure

```
├── app/                  # Next.js App Router pages and layouts
├── components/           # React components
│   ├── dashboard/        # Dashboard-specific widgets (RoundInfo, Tables)
│   ├── providers/        # Context providers (Theme, Query)
│   └── ui/               # Generic UI components
├── hooks/                # Custom React hooks
│   ├── useAutoCap.ts     # Contract interaction hooks
│   ├── useDashboard.ts   # Main aggregation hook
│   └── useSubgraphBurn.ts # The Graph integration
├── lib/                  # Utilities and configuration
│   ├── contracts/        # ABI and client setup
│   └── utils/            # Formatting and calculation helpers
└── types/                # TypeScript definitions
```

## 🤝 Contributing

Contributions are welcome! Please verify that any changes to formatting logic or data fetching are tested against edge cases (e.g., extremely small FIL values or empty rounds).
