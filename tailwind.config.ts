import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          soft: "var(--primary-soft)",
          "soft-foreground": "var(--primary-soft-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          soft: "var(--success-soft)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          soft: "var(--warning-soft)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "var(--font-noto-sans-jp)",
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(20 20 27 / 0.04), 0 1px 3px 0 rgb(20 20 27 / 0.05)",
        elevated:
          "0 4px 12px -2px rgb(124 92 250 / 0.08), 0 2px 6px -1px rgb(20 20 27 / 0.04)",
      },
    },
  },
  plugins: [
    animate,
    plugin(({ addVariant }) => {
      // base-ui sets boolean data-attributes (e.g. data-checked="").
      // The default Tailwind `data:` config requires a value match,
      // so register attribute-presence variants explicitly.
      addVariant("data-checked", "&[data-checked]");
      addVariant("data-unchecked", "&[data-unchecked]");
      addVariant("data-disabled", "&[data-disabled]");
      addVariant("data-open", "&[data-open]");
      addVariant("data-closed", "&[data-closed]");
      addVariant("data-placeholder", "&[data-placeholder]");
      addVariant("data-popup-open", "&[data-popup-open]");
      addVariant("data-ending-style", "&[data-ending-style]");
      addVariant("data-starting-style", "&[data-starting-style]");
      addVariant("data-inset", "&[data-inset]");
      addVariant("data-horizontal", '&[data-orientation="horizontal"]');
      addVariant("data-vertical", '&[data-orientation="vertical"]');
    }),
  ],
} satisfies Config;
