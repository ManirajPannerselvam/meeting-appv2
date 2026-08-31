<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  $: id = $page.params.id;
</script>
<div style="padding:20px"><h1>Minutes #{id}</h1><button on:click={()=>goto(`/meetings/${id}`)}>Back to Meeting</button></div>