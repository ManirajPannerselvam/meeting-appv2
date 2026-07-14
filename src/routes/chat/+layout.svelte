<script lang="ts">
    import { page } from '$app/stores';
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';

    let innerWidth = 0;
    $: isDesktop = browser && innerWidth >= 768;
    $: selectedChat = $page.params.id; // /chat/[id]

    // Mobile: show sidebar only when no chat selected
    // Desktop: always show both
    $: showSidebar = isDesktop ||!selectedChat;
    $: showChat = isDesktop || selectedChat;

    onMount(() => {
        if (browser) {
            innerWidth = window.innerWidth;
        }
    });
</script>

<svelte:window bind:innerWidth />

<div class="chat-layout" class:desktop={isDesktop}>

    <!-- SIDEBAR: Chat list -->
    {#if showSidebar}
        <aside class="sidebar">
            <slot name="sidebar" />
        </aside>
    {/if}

    <!-- MAIN: Chat window -->
    {#if showChat}
        <main class="chat-main">
            {#if selectedChat}
                <slot />
            {:else if isDesktop}
                <!-- Desktop empty state -->
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h2>Select a Group or Contact</h2>
                    <p>Start chatting with your team</p>
                </div>
            {/if}
        </main>
    {/if}

</div>

<style>
   .chat-layout {
        display: grid;
        height: 100vh;
        width: 100vw;
        background: #f0f2f5;
        overflow: hidden;
    }

    /* MOBILE: 1 column, full screen */
   .chat-layout {
        grid-template-columns: 1fr;
    }

    /* DESKTOP: 2 columns, WhatsApp Web style */
   .chat-layout.desktop {
        grid-template-columns: 420px 1fr;
    }

   .sidebar {
        background: white;
        border-right: 1px solid #e5e7eb;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 100vh;
    }

   .chat-main {
        background: #efeae2;
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
    }

   .empty-state {
        margin: auto;
        text-align: center;
        color: #667781;
        padding: 40px;
    }

   .empty-icon {
        font-size: 80px;
        margin-bottom: 20px;
        opacity: 0.3;
    }

   .empty-state h2 {
        font-size: 32px;
        font-weight: 300;
        margin: 0 0 12px 0;
        color: #41525d;
    }

   .empty-state p {
        font-size: 14px;
        margin: 0;
        color: #667781;
    }

    /* Mobile specific: hide sidebar when chat open */
    @media (max-width: 767px) {
       .sidebar {
            border-right: none;
        }

        /* Back button area for mobile */
       .chat-main {
            position: relative;
        }
    }
</style>