import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
    root: resolve(__dirname, 'src'),
    publicDir: resolve(__dirname, 'src', 'public'),
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
            manifest: {
                name: 'Story App',
                short_name: 'StoryApp',
                description: 'Aplikasi untuk berbagi cerita dengan orang lain',
                theme_color: '#ffffff',
                // icons: [
                //     {
                //         src: 'pwa-192x192.png',
                //         sizes: '192x192',
                //         type: 'image/png',
                //     },
                //     {
                //         src: 'pwa-512x512.png',
                //         sizes: '512x512',
                //         type: 'image/png',
                //     },
                //     {
                //         src: 'pwa-512x512.png',
                //         sizes: '512x512',
                //         type: 'image/png',
                //         purpose: 'any maskable',
                //     },
                // ],
            },
        }),
    ],
});
