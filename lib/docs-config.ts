export interface DocPage {
  title: string;
  href: string;
  items?: DocPage[];
}

export const docsConfig: DocPage[] = [
  {
    title: 'Welcome',
    href: '/docs',
  },
  {
    title: 'What is AutoCap?',
    href: '/docs/what-is-autocap',
  },
  {
    title: 'How Does AutoCap Work?',
    href: '/docs/how-it-works',
  },
  {
    title: '1. Registration',
    href: '/docs/registration',
    items: [
      {
        title: 'What Counts as On-Chain Activity',
        href: '/docs/registration/on-chain-activity',
      },
    ],
  },
  {
    title: '2. Contribution',
    href: '/docs/contribution',
    items: [
      {
        title: 'Examples of Eligible Activity',
        href: '/docs/contribution/examples',
      },
    ],
  },
  {
    title: '3. Allocation and Distribution',
    href: '/docs/allocation',
  },
  {
    title: 'Monitoring and Transparency',
    href: '/docs/monitoring',
  },
  {
    title: 'Who is AutoCap For?',
    href: '/docs/who-is-it-for',
  },
  {
    title: 'Why FIL Burns?',
    href: '/docs/why-fil-burns',
  },
  {
    title: 'Registration Fee',
    href: '/docs/registration-fee',
  },
  {
    title: 'Usage in Practice',
    href: '/docs/usage',
    items: [
      {
        title: 'Before the Round Starts',
        href: '/docs/usage/before',
      },
      {
        title: 'When the Round Opens',
        href: '/docs/usage/registration-process',
      },
      {
        title: 'During the Round',
        href: '/docs/usage/during',
      },
      {
        title: 'After the Round Closes',
        href: '/docs/usage/after',
      },
    ],
  },
];
