/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                border: "rgb(var(--border))",
                input: "rgb(var(--input))",
                ring: "rgb(var(--ring))",
                background: "rgb(var(--background))",
                foreground: "rgb(var(--foreground))",
                primary: {
                    DEFAULT: "rgb(var(--primary))",
                    foreground: "rgb(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "rgb(var(--secondary))",
                    foreground: "rgb(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "rgb(var(--destructive))",
                    foreground: "rgb(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "rgb(var(--muted))",
                    foreground: "rgb(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "rgb(var(--accent))",
                    foreground: "rgb(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "rgb(var(--popover))",
                    foreground: "rgb(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "rgb(var(--card))",
                    foreground: "rgb(var(--card-foreground))",
                },
                maritime: {
                    900: '#0f172a',
                    800: '#1e3a8a',
                    700: '#1d4ed8',
                    600: '#2563eb',
                    500: '#3b82f6',
                    400: '#60a5fa',
                    300: '#93c5fd',
                    200: '#bfdbfe',
                    100: '#dbeafe',
                    50: '#eff6ff',
                }
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            backgroundImage: {
                'maritime-gradient': 'linear-gradient(to right bottom, #1e3a8a, #3b82f6)',
                'maritime-dark': 'linear-gradient(to right bottom, #0f172a, #1e3a8a)',
            }
        },
    },
    plugins: [require("tailwindcss-animate")],
}
