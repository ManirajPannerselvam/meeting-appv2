<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let chat: any; // Can be group or contact
    export let selected: boolean = false;

    const dispatch = createEventDispatcher();

    // 2. 9-grid icon: Image 1 style
    function getGridItems(name: string, members?: any[]) {
        if (members && members.length > 1) {
            // For groups: show member initials
            return members.slice(0, 9).map(m => (m.name?.[0] || '?').toUpperCase());
        }
        // For contacts: split name into chars, max 9
        return name.replace(/\s/g, '').split('').slice(0, 9).map(c => c.toUpperCase());
    }

    // Generate consistent colors for grid
    function getColor(index: number, total: number) {
        const hue = (index * 360) / Math.max(total, 1);
        return `hsl(${hue}, 65%, 55%)`;
    }

    // 5. Long press for edit/delete/image
    let pressTimer: any;
    let isLongPress = false;

    function handleMouseDown() {
        isLongPress = false;
        pressTimer = setTimeout(() => {
            isLongPress = true;
            dispatch('longpress', chat);
        }, 600);
    }

    function handleMouseUp() {
        clearTimeout(pressTimer);
    }

    function handleClick() {
        if (!isLongPress) {
            dispatch('select', chat);
        }
        isLongPress = false;
    }

    // Format time like Image 1: "yesterday", "7:02 AM", etc
    function formatTime(timestamp: string | number) {
        if (!timestamp) return 'yesterday';

        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } else if (days === 1) {
            return 'yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
    }

    // Format unread count like Image 1: 43, 99+
    function formatUnread(count: number | string) {
        if (!count) return null;
        const num = typeof count === 'string'? parseInt(count) : count;
        if (num > 99) return '99+';
        return num.toString();
    }

    $: gridItems = getGridItems(chat.name || chat.group_name || '?', chat.members);
    $: unreadDisplay = formatUnread(chat.unread);
    $: timeDisplay = formatTime(chat.time || chat.last_message_time || chat.updated_at);
</script>

<div
    class="chat-row"
    class:selected
    on:click={handleClick}
    on:mousedown={handleMouseDown}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseUp}
    on:touchstart={handleMouseDown}
    on:touchend={handleMouseUp}
    role="button"
    tabindex="0"
    on:keydown={(e) => e.key === 'Enter' && handleClick()}
>
    <div class="avatar-wrap">
        <!-- 2. 9-GRID ICON like Image 1 -->
        <div class="avatar-grid" class:single={gridItems.length === 1}>
            {#if gridItems.length === 1}
                <!-- Single letter for 1-person chat -->
                <div
                    class="mini single-letter"
                    style="background: {getColor(0, 1)}"
                >
                    {gridItems[0]}
                </div>
            {:else}
                <!-- 9-grid for groups -->
                {#each gridItems as initial, i}
                    <div
                        class="mini"
                        style="background: {getColor(i, gridItems.length)}"
                    >
                        {initial}
                    </div>
                {/each}
                <!-- Fill empty cells if less than 9 -->
                {#each Array(9 - gridItems.length) as _, i}
                    <div class="mini empty" style="background: #e5e7eb"></div>
                {/each}
            {/if}
        </div>

        <!-- Unread badge top-right -->
        {#if unreadDisplay}
            <div class="badge">{unreadDisplay}</div>
        {/if}
    </div>

    <div class="content">
        <div class="name">{chat.name || chat.group_name || 'Unknown'}</div>
        <div class="msg">
            {#if chat.is_typing}
                <span class="typing">typing...</span>
            {:else if chat.lastMsg || chat.last_message}
                {chat.lastMsg || chat.last_message}
            {:else if chat.mobile}
                {chat.mobile}
            {:else}
                Group Chat
            {/if}
        </div>
    </div>

    <div class="time">{timeDisplay}</div>
</div>

<style>
.chat-row {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    gap: 12px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background-color 0.1s;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.chat-row:active {
    background: #f5f5f5;
}

.chat-row.selected {
    background: #e5f3ff;
}

.avatar-wrap {
    position: relative;
    flex-shrink: 0;
}

/* 2. 9-GRID ICON like Image 1 */
.avatar-grid {
    width: 48px;
    height: 48px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 1px;
    border-radius: 8px;
    overflow: hidden;
    background: #e5e7eb;
}

/* Single letter avatar for contacts */
.avatar-grid.single {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
}

.mini {
    color: white;
    font-size: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
}

.mini.single-letter {
    font-size: 20px;
}

.mini.empty {
    background: #e5e7eb!important;
}

/* Unread badge top-right */
.badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #ef4444;
    color: white;
    border-radius: 12px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 600;
    min-width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.content {
    flex: 1;
    min-width: 0;
}

.name {
    font-size: 16px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #111b21;
    margin-bottom: 2px;
}

.msg {
    font-size: 14px;
    color: #667781;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.msg.typing {
    color: #25d366;
    font-style: italic;
}

.time {
    font-size: 12px;
    color: #667781;
    flex-shrink: 0;
    align-self: flex-start;
    margin-top: 2px;
}
</style>