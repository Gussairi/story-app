import { defineConfig } from 'vite';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    root: resolve(__dirname, 'src'),
    publicDir: resolve(__dirname, 'src', 'public'),
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src', 'index.html'),
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    plugins: [
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'scripts',
            filename: 'sw.js',
            registerType: 'autoUpdate',
            injectRegister: false,
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
                globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js']
            },
            manifest: {
                name: 'Story App - Berbagi Cerita',
                short_name: 'StoryApp',
                description: 'Aplikasi untuk berbagi cerita dengan orang lain. Posting cerita dengan foto dan lokasi, baca cerita dari pengguna lain.',
                theme_color: '#6366f1',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait-primary',
                start_url: '/',
                scope: '/',
                categories: ['social', 'lifestyle', 'entertainment'],
                lang: 'id-ID',
                dir: 'ltr',
                icons: [
                    {
                        src: 'pwa-64x64.png',
                        sizes: '64x64',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'maskable-icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    },
                    {
                        src: 'apple-touch-icon-180x180.png',
                        sizes: '180x180',
                        type: 'image/png',
                        purpose: 'any'
                    }
                ],
                screenshots: [
                    {
                        src: '/images/home-page.jpg',
                        sizes: '1220x2712',
                        type: 'image/png',
                        form_factor: 'narrow',
                        label: 'Halaman Beranda'
                    },
                    {
                        src: '/images/add-story.jpg',
                        sizes: '1220x2712',
                        type: 'image/png',
                        form_factor: 'narrow',
                        label: 'Tambah Cerita Baru'
                    },
                    {
                        src: '/images/detail-story.jpg',
                        sizes: '1220x2712',
                        type: 'image/png',
                        form_factor: 'narrow',
                        label: 'Detail Cerita'
                    },
                    {
                        src: '/images/home-page-wide.png',
                        sizes: '2561x1427',
                        type: 'image/png',
                        form_factor: 'wide',
                        label: 'Halaman Beranda'
                    },
                    {
                        src: '/images/add-story-wide.png',
                        sizes: '2561x1427',
                        type: 'image/png',
                        form_factor: 'wide',
                        label: 'Tambah Cerita Baru'
                    },
                    {
                        src: '/images/detail-story-wide.png',
                        sizes: '2561x1427',
                        type: 'image/png',
                        form_factor: 'wide',
                        label: 'Detail Cerita'
                    },
                ],
                shortcuts: [
                    {
                        name: 'Tambah Cerita',
                        short_name: 'Tambah',
                        description: 'Buat cerita baru dengan cepat',
                        url: '/#/add-story',
                        icons: [
                            {
                                src: 'pwa-192x192.png',
                                sizes: '192x192',
                                type: 'image/png'
                            }
                        ]
                    },
                    {
                        name: 'Lihat Semua Cerita',
                        short_name: 'Cerita',
                        description: 'Lihat semua cerita yang tersedia',
                        url: '/#/',
                        icons: [
                            {
                                src: 'pwa-192x192.png',
                                sizes: '192x192',
                                type: 'image/png'
                            }
                        ]
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        // Cache API JSON responses only (stories list, detail, etc)
                        // EXCLUDE image paths
                        urlPattern: ({ url }) => {
                            return url.origin === 'https://story-api.dicoding.dev' &&
                                   !url.pathname.startsWith('/images/') &&
                                   !url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
                        },
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'story-api-json-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 12 // 12 hours
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            },
                            plugins: [
                                {
                                    // Extra filter: hanya cache JSON
                                    cacheWillUpdate: async ({ response }) => {
                                        const contentType = response.headers.get('content-type');
                                        if (contentType && contentType.includes('application/json')) {
                                            return response;
                                        }
                                        return null;
                                    }
                                }
                            ]
                        }
                    },
                    {
                        // NetworkOnly untuk foto dari story-api.dicoding.dev
                        urlPattern: ({ url }) => {
                            return url.origin === 'https://story-api.dicoding.dev' &&
                                    (url.pathname.startsWith('/images/') ||
                                    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i));
                        },
                        handler: 'NetworkOnly'
                    },
                    {
                        // Cache CDN assets (libraries, fonts)
                        urlPattern: /^https:\/\/.*\.cloudflare\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'cloudflare-cdn-cache',
                            expiration: {
                                maxEntries: 30,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                            }
                        }
                    }
                ]
            },
            devOptions: {
                enabled: true,
                type: 'module'
            }
        }),
    ],
});