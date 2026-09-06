import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const THEMES = ['light','dark','whatsapp','telegram','instagram','discord','snapchat','slack','messenger','twitter','minimal','imessage'] as const;
export type Theme = typeof THEMES[number];

function createTheme(){
  const { subscribe, set } = writable<Theme>('whatsapp');

  return {
    subscribe,
    init: () => {
      if(!browser) return;
      const saved = localStorage.getItem('app-theme') as Theme;
      const theme = saved && THEMES.includes(saved) ? saved : 'whatsapp';
      document.documentElement.setAttribute('data-theme', theme);
      set(theme);
    },
    setTheme: (t: Theme) => {
      if(!browser) return;
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('app-theme', t);
      set(t);
    },
    getAll: () => THEMES
  }
}
export const themeStore = createTheme();