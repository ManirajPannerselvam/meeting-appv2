<script>
  import { onMount } from "svelte";

  let title = "";
  let description = "";
  let date = "";

  let meetings = [];
  let loading = false;

  async function loadMeetings() {
    const res = await fetch("/api/meetings");
    const data = await res.json();
    meetings = data.meetings || [];
  }

  /* 🔥 FIXED CREATE (WITH DEBUG) */
  async function createMeeting() {
    console.log("BUTTON CLICKED");

    const payload = {
      title,
      description,
      date,
      created_by: 1
    };

    console.log("SENDING:", payload);

    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("RESPONSE:", data);

    if (!res.ok) {
      alert(data.error || "Save failed");
      return;
    }

    title = "";
    description = "";
    date = "";

    await loadMeetings();
  }

  onMount(loadMeetings);
</script>