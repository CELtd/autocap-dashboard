# Project Agent Guide (AGENTS.md)

Welcome! This guide is designed to help AI agents and developers understand the project structure, development workflow, and core logic of the Filecoin Autocap Dashboard.

## 🚀 Quick Start with Bun

This project uses [Bun](https://bun.sh/) as its primary runtime and package manager.

1.  **Install Dependencies**:
    ```bash
    bun install
    ```

2.  **Environment Setup**:
    Copy `.env.example` to `.env.local` (if available) or ensure the following variables are set:
    - `NEXT_PUBLIC_AUTOCAP_ADDRESS`: Address of the Filecoin Autocap contract.
    - `NEXT_PUBLIC_RPC_URL`: Filecoin RPC URL (e.g., Glif Calibration).
    - `NEXT_PUBLIC_SUBGRAPH_URL`: Goldsky Subgraph URL for burn data.

3.  **Run Development Server**:
    ```bash
    bun dev
    ```

4.  **Build for Production**:
    ```bash
    bun run build
    ```

## 📂 Project Structure

```text
├── app/                  # Next.js 14 App Router
│   ├── layout.tsx        # Root layout with providers (Theme, Wagmi, Query)
│   ├── page.tsx          # Main Dashboard entry point
│   └── globals.css       # Global styles and Tailwind imports
├── components/           # React Components
│   ├── dashboard/        # Dashboard-specific features (RoundInfo, Participant Table, etc.)
│   ├── providers/        # Context providers (WagmiConfig, RainbowKit, QueryClient)
│   └── ui/               # Reusable UI primitives (Buttons, Cards, Modals)
├── hooks/                # Custom React Hooks (Business Logic)
│   ├── useAutoCap.ts     # Direct contract reads/writes (using wagmi)
│   ├── useDashboard.ts   # Core hook aggregating round and participant data
│   ├── useParticipants.ts# Handles participant list and registration logic
│   └── useSubgraphBurn.ts # Fetches burn data from Goldsky Subgraph
├── lib/                  # Utilities and Configuration
│   ├── contracts/        # ABIs and contract-related constants
│   ├── subgraph/         # GraphQL queries and types for Goldsky
│   ├── utils/            # Formatting (FIL, Address), math, and common helpers
│   ├── constants.ts      # Global app constants (Chain IDs, intervals)
│   └── wagmi.ts          # Wagmi and RainbowKit configuration
├── public/               # Static assets (logos, icons)
├── types/                # Shared TypeScript interfaces
└── .env                  # Environment variables (do not commit secrets)
```

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Runtime/PM**: [Bun](https://bun.sh/)
- **Blockchain Interface**: [viem](https://viem.sh/) & [wagmi](https://wagmi.sh/)
- **Wallet Connection**: [RainbowKit](https://www.rainbowkit.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest) (React Query)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Data Indexing**: [Goldsky](https://goldsky.com/) (GraphQL)

## 💡 Architecture & Logic Patterns

### 1. Data Fetching Strategy
We use **TanStack Query** for all data fetching.
- Chain data is fetched via `wagmi` hooks (e.g., `useReadContract`).
- Indexer data is fetched from Goldsky using `graphql-request`.
- Data is aggregated in high-level hooks like `useDashboard` to provide a clean API to components.

### 2. Contract Interactions
Contract writes (like `register`) are handled in `hooks/useAutoCap.ts` and triggered by UI components in `components/dashboard/`.

### 3. Styling & Theming
- Primary styling is done via **Tailwind CSS**.
- **next-themes** is used for Dark/Light mode support.
- Custom components follow a consistent design language using Tailwind utility classes.

## 🤝 Contribution Guidelines for Agents

- **Type Safety**: Ensure all new components and hooks are strictly typed.
- **Modularity**: Keep components small and focused. UI-only components should go in `components/ui/`.
- **Logic Placement**: Prefer placing complex logic in custom hooks (`hooks/`) rather than directly in components.
- **Environment Consistency**: Always check for the presence of required environment variables before attempting blockchain operations.
