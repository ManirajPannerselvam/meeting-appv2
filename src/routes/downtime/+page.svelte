<script>

  let machine = "";
  let reason = "";
  let duration = 0;
  let shift = "A";

  async function save() {
  const res = await fetch("/api/downtime", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      machine,
      reason,
      duration,
      shift
    })
  });

  if (res.ok) {
    alert("Saved");

    machine = "";
    reason = "";
    duration = 0;
    shift = "A";
  }
}

</script>

<h2>⚠ Downtime Entry</h2>

<input placeholder="Machine" bind:value={machine} />
<input placeholder="Reason" bind:value={reason} />
<input type="number" placeholder="Minutes" bind:value={duration} />

<button on:click={save}>Save</button>