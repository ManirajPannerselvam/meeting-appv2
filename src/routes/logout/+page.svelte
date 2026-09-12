<script lang="ts">
  import { onMount } from 'svelte';
  onMount(() => {
    try {
      // Don't wait for anything
      navigator.sendBeacon('/logout');
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    location.replace('/login');
  });
</script>
<div style="padding:100px;text-align:center">Logging out...</div>