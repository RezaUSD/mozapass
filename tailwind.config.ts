import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        shell: '#1E1E24',
        canvas: '#F7F7FA',
        surface: '#FFFFFF',
        'dark-anchor': '#232329',
        'dark-elevated': '#2C2C36',
        'card-yellow': '#FFE37E',
        'card-lavender': '#DEC9FF',
        'card-sky': '#C6EAFF',
        'accent-coral': '#F05A36',
        'accent-coral-hover': '#D94B29',
        'accent-lime': '#D2F865',
        'accent-lime-hover': '#C4EE50',
        'pastel-lavender': '#DEC9FF',
        'pastel-peach': '#FFE37E',
        'pastel-mint': '#E6F9D5',
        'pastel-rose': '#FDE2E4',
        'ink-primary': '#181824',
        'ink-secondary': '#6E6E82',
        'ink-muted': '#9E9EB0',
        'border-subtle': '#E4E4EC',
        'semantic-success': '#16A34A',
        'semantic-warning': '#D97706',
        'semantic-danger': '#DC2626',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        bento: '20px',
        sidebar: '24px',
        shell: '28px',
      },
      boxShadow: {
        bento: '0 4px 20px -2px rgba(24, 24, 36, 0.05)',
        tactile: '0 2px 0 0 rgba(24, 24, 36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
