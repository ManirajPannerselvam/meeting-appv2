<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let title = "";
    export let subtitle = "";
    export let typing = false;
    export let avatar = "";
    export let isGroup = false;
    export let memberCount = 0;

    // Changed: removed 'export' so it's internal, not a required prop
    let online = false;

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