<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let title = "";
    export let subtitle = "";
    export let online = false;
    export let typing = false;
    export let avatar = "";
    export let isGroup = false;
    export let memberCount = 0;

    const dispatch = createEventDispatcher();

    function back() {
        dispatch("back");
    }

    function voiceCall() {
        dispatch("voice");
    }

    function videoCall() {
        dispatch("video");
    }

    function search() {
        dispatch("search");
    }

    function menu() {
        dispatch("menu");
    }

    function initials(name: string) {
        if (!name) return "?";
        return name
          .split(" ")
          .map(x => x[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();
    }

    $: statusText = typing
       ? 'typing...'
        : isGroup
           ? `${memberCount} ${memberCount === 1? 'member' : 'members'}`
            : online
               ? 'online'
                : subtitle || 'offline';
</script>

<header class="chat-header">
    <div class="left">
        <button class="back" on:click={back} aria-label="Back">
            ←
        </button>

        {#if avatar}
            <img src={avatar} alt="" class="avatar" />
        {:else}
            <div class="avatar initials" class:group={isGroup}>
                {initials(title)}
            </div>
        {/if}

        <div class="user">
            <div class="name">{title}</div>
            <div class="status" class:online-status={online &&!typing &&!isGroup} class:typing>
                {statusText}
            </div>
        </div>
    </div>

    <div class="right">
        <button class="icon" on:click={voiceCall} title="Voice Call">📞</button>
        <button class="icon" on:click={videoCall} title="Video Call">🎥</button>
        <button class="icon" on:click={search} title="Search">🔍</button>
        <button class="icon" on:click={menu} title="Menu">⋮</button>
    </div>
</header>

<style>
  .chat-header {
        height: 60px;
        background: #f0f2f5;
        border-bottom: 1px solid #d1d7db;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 16px;
        flex-shrink: 0;
    }

  .left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
    }

  .back {
        display: none;
        border: none;
        background: none;
        font-size: 22px;
        cursor: pointer;
        padding: 8px;
        margin-left: -8px;
    }

  .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }

  .initials {
        display: flex;
        justify-content: center;
        align-items: center;
        background: #00a884;
        color: white;
        font-weight: 600;
        font-size: 15px;
    }

  .initials.group {
        background: #667781;
    }

  .user {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

  .name {
        font-weight: 500;
        font-size: 16px;
        color: #111b21;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

  .status {
        font-size: 13px;
        color: #667781;
    }

  .typing {
        color: #00a884;
        font-style: italic;
    }

  .online-status {
        color: #00a884;
    }

  .right {
        display: flex;
        gap: 4px;
    }

  .icon {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
    }

  .icon:hover {
        background: #e9edef;
    }

  .icon:active {
        background: #d1d7db;
    }

    @media (max-width: 768px) {
      .chat-header {
            padding: 0 12px;
        }

      .back {
            display: block;
        }

      .name {
            font-size: 15px;
        }

      .status {
            font-size: 12px;
        }

      .icon {
            width: 36px;
            height: 36px;
        }
    }
</style>