<script lang="ts">
  export let title = '';
  export let subtitle = '';
  export let username = '';
  export let avatar = '';
  export let navigation: any = [];
  export let active = '';
</script>

<div class="app-shell">
  <main>
    <slot />
  </main>
</div>

<style>
  .app-shell{ display:flex; flex-direction:column; min-height:100vh; background:#f8fafc; }
  main{ flex:1; padding:0; }
</style>