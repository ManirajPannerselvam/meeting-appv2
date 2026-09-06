<script lang="ts">
  import { onMount } from 'svelte';
  onMount(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.replace('/login');
  });
</script>

<div style="display:flex;justify-content:center;margin-top:100px">
  Logging out...
</div>