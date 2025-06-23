@@ .. @@
 /** @type {import('tailwindcss').Config} */
 export default {
   content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
   theme: {
     extend: {
       fontFamily: {
         'inter': ['Inter', 'sans-serif'],
       },
       colors: {
         primary: {
           50: '#f0fdf4',
           100: '#dcfce7',
           200: '#bbf7d0',
           300: '#86efac',
           400: '#4ade80',
           500: '#22c55e',
           600: '#16a34a',
           700: '#15803d',
           800: '#166534',
           900: '#14532d',
         },
         trading: {
           green: '#22c55e',
           'green-dark': '#16a34a',
           'green-light': '#4ade80',
           red: '#ef4444',
           'red-dark': '#dc2626',
           orange: '#f59e0b',
           gray: '#1f2937',
           'gray-light': '#374151',
           'gray-dark': '#111827',
           'gray-darker': '#0f172a',
         },
         dark: {
           50: '#f8fafc',
           100: '#f1f5f9',
           200: '#e2e8f0',
           300: '#cbd5e1',
           400: '#94a3b8',
           500: '#64748b',
           600: '#475569',
           700: '#334155',
           800: '#1e293b',
           900: '#0f172a',
         }
       },
       animation: {
         'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
         'bounce-slow': 'bounce 2s infinite',
       },
       screens: {
         'xs': '475px',
       },
+      boxShadow: {
+        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
+        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
+      },
+      backgroundImage: {
+        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
+      }
     },
   },
   plugins: [],
 };