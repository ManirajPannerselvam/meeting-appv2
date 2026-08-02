// Uses adapter-vercel on Vercel
// Uses adapter-node for local builds / desktop backend runtime

import adapterVercel from '@sveltejs/adapter-vercel';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isVercel = process.env.VERCEL === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        adapter: isVercel
            ? adapterVercel()
            : adapterNode(),

        prerender: {
            entries: []
        }
    }
};

export default config;