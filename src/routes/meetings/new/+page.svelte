<script lang="ts">
  import { goto } from '$app/navigation';
  import { addMeeting } from '$lib/stores/meetings';

  let title = "";
  let date = "";
  let type = "";
  let agenda = "";

  async function saveMeeting() {
    try {
      const payload = {
        title,
        agenda,
        meeting_date: date,
        meeting_type: type,
        location: null
      };
      const ok = await addMeeting(payload);
      if (ok) goto('/meetings');
      else alert('Failed to save meeting');
    } catch (e) {
      console.error('saveMeeting failed', e);
      alert('Failed to save meeting');
    }
  }
</script>

<h2>Create Meeting</h2>

<input placeholder="Title" bind:value={title} />
<input type="date" bind:value={date} />
<input placeholder="Type" bind:value={type} />
<textarea placeholder="Agenda" bind:value={agenda}></textarea>

<button on:click={saveMeeting}>
  Save Meeting
</button>