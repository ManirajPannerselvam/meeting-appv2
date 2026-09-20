<script>
  import { supabase } from '$lib/supabase/client';
  let email = 'maniraj992@gmail.com';
  let log = '';

  async function testSend() {
    log = 'Sending...';
    console.log('Sending to', email);
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: { shouldCreateUser: true }
    });
    console.log('RESULT:', data, error);
    if (error) log = 'ERROR: ' + error.message;
    else log = 'SUCCESS! Check email, spam, and Supabase Logs now.';
  }
</script>

<div style="padding:20px">
  <h2>OTP Test</h2>
  <input type="email" bind:value={email} style="border:1px solid black; padding:8px; width:300px" />
  <button on:click={testSend} style="background:black; color:white; padding:8px 16px; margin-left:10px">Send OTP</button>
  <pre style="margin-top:20px; background:#eee; padding:10px">{log}</pre>
</div>