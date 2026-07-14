<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import 'emoji-picker-element';

    export let show = false;

    const dispatch = createEventDispatcher();
    let pickerElement: any;
    let containerElement: HTMLElement;

    onMount(() => {
        if (pickerElement) {
            // Handle emoji selection
            pickerElement.addEventListener('emoji-click', (event: any) => {
                dispatch('select', {
                    emoji: event.detail.unicode,
                    name: event.detail.emoji.name
                });
            });

            // Set theme based on system
            pickerElement.theme = window.matchMedia('(prefers-color-scheme: dark)').matches? 'dark' : 'light';

            // Set search placeholder
            pickerElement.searchPlaceholder = 'Search emoji...';
        }

        // Close on click outside
        function handleClickOutside(e: MouseEvent) {
            if (show && containerElement &&!containerElement.contains(e.target as Node)) {
                dispatch('close');
            }
        }

        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    });
</script>

{#if show}
<div class="emoji-wrapper" bind:this={containerElement} on:click|stopPropagation>
    <emoji-picker bind:this={pickerElement}></emoji-picker>
</div>
{/if}

<style>
.emoji-wrapper {
    position: absolute;
    bottom: 70px;
    left: 12px;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-radius: 8px;
    overflow: hidden;
}

emoji-picker {
    --num-columns: 8;
    --emoji-size: 1.5rem;
    --background: white;
    --border-color: #e5e7eb;
    --indicator-color: #3b82f6;
    --input-border-color: #e5e7eb;
    --input-font-color: #111b21;
    --input-placeholder-color: #667781;
    height: 400px;
    width: 320px;
}

@media (max-width: 767px) {
    .emoji-wrapper {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
    }

    emoji-picker {
        width: 100%;
        height: 350px;
        border-radius: 12px 12px 0 0;
    }
}
</style>