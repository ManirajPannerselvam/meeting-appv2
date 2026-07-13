<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  onMount(() => {
    localStorage.removeItem("token");
    sessionStorage.clear();

    goto("/login");
  });
</script>

<h3>Logging out...</h3>