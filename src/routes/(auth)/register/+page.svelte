<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  async function handleSignup() {
    loading = true;
    error = '';
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `http://localhost:1420`
      }
    });
    if (err) error = err.message;
    else goto('/login?msg=Check email to confirm');
    loading = false;
  }
</script>

<div class="auth-page">
  
  <div class="card">
    <h2>Create Account</h2>
    {#if error}<div class="error">{error}</div>{/if}
    
    <form on:submit|preventDefault={handleSignup}>
      <label>Email</label>
      <input type="email" bind:value={email} required />
      
      <label>Password</label>
      <input type="password" bind:value={password} required minlength="6" />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Account'}
      </button>
    </form>
    
    <p>Already have an account? <a href="/login">Login</a></p>
  </div>
</div>

<style>
.auth-page { max-width: 400px; margin: 50px auto; text-align: center; }
.card { background: white; padding: 24px; border-radius: 12px; text-align: left; }
input { width: 100%; padding: 10px; margin: 8px 0 16px; border: 1px solid #ccc; border-radius: 6px; }
button { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 600; }
.error { background: #fee2e2; color: #dc2626; padding: 10px; border-radius: 6px; margin-bottom: 12px; }
</style>