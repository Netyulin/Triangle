/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 极客风格配色 - 深蓝基调 + 亮蓝强调
        base: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        background: '#f8fafc',
        foreground: '#0f172a',
        surface: '#ffffff',
        "surface-foreground": '#0f172a',
        card: '#ffffff',
        "card-foreground": '#0f172a',
        popover: '#ffffff',
        "popover-foreground": '#0f172a',
        primary: {
          DEFAULT: '#0b1220',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f1f5f9',
          foreground: '#334155',
        },
        muted: {
          DEFAULT: '#f1f5f9',
          foreground: '#64748b',
        },
        accent: {
          DEFAULT: '#0ea5e9',
          hover: '#0284c7',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#ffffff',
        },
        danger: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#0ea5e9',
        "chart-1": 'hsl(222.2 84% 4.9%)',
        "chart-2": 'hsl(210 40% 98%)',
        "chart-3": 'hsl(215.4 16.3% 46.9%)',
        "chart-4": 'hsl(216 12.2% 83.9%)',
        "chart-5": 'hsl(210 40% 98%)',
        sidebar: 'hsl(0 0% 98%)',
        "sidebar-foreground": 'hsl(222.2 84% 4.9%)',
        "sidebar-primary": 'hsl(222.2 47.4% 11.2%)',
        "sidebar-primary-foreground": 'hsl(0 0% 98%)',
        "sidebar-accent": 'hsl(220 14.3% 95.9%)',
        "sidebar-accent-foreground": 'hsl(222.2 47.4% 11.2%)',
        "sidebar-border": 'hsl(220 13% 91%)',
        "sidebar-ring": 'hsl(217.2 91.2% 59.8%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)',
        'hover': '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -2px rgba(15, 23, 42, 0.1)',
        'elevated': '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.1)',
      },
      borderRadius: {
        lg: '0.875rem',
        md: '0.625rem',
        sm: '0.375rem',
      },
      spacing: {
        '18': '4.5rem',
      },
      backgroundImage: {
        'grid': "linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '24px 24px',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
