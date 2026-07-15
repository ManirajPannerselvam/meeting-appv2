<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  let name = '';
  let email = '';
  let phone = '';
  let password = '';
  let loading = false;
  let error = '';

  async function handleSignup() {
    if (!name || !email || !password) {
      error = 'Fill all required fields';
      return;
    }

    loading = true;
    error = '';

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      // 2. Save all data to users table
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          name,
          phone,
          is_verified: false
        });

      if (dbError) throw dbError;

      alert('Signup successful! Please sign in.');
      goto('/signin');

    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="container">
  <div class="card">
    <h2>Sign Up</h2>
    
    <div class="form-group">
      <label>Name *</label>
      <input type="text" bind:value={name} placeholder="John Doe" />
    </div>

    <div class="form-group">
      <label>Email *</label>
      <input type="email" bind:value={email} placeholder="john@email.com" />
    </div>

    <div class="form-group">
      <label>Phone</label>
      <input type="tel" bind:value={phone} placeholder="+91 9876543210" />
    </div>

    <div class="form-group">
      <label>Password *</label>
      <input type="password" bind:value={password} placeholder="Min 6 characters" />
    </div>

    <button on:click={handleSignup} disabled={loading} class="btn-primary">
      {loading ? 'Creating...' : 'Sign Up'}
    </button>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <p class="link">Already have account? <a href="/signin">Sign In</a></p>
  </div>
</div>

<style>
.container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
}
.card {
    background: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    max-width: 400px;
    width: 100%;
}
h2 { margin: 0 0 24px 0; color: #1e293b; }
.form-group { margin-bottom: 16px; }
label { display: block; margin-bottom: 6px; color: #374151; font-weight: 500; font-size: 14px; }
input {
    width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;
    font-size: 16px; box-sizing: border-box;
}
input:focus { outline: none; border-color: #667eea; }
.btn-primary {
    width: 100%; padding: 14px; background: #667eea; color: white; border: none;
    border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px;
}
.btn-primary:disabled { opacity: 0.6; }
.error {
    background: #fee2e2; color: #dc2626; padding: 12px; border-radius: 8px;
    margin-top: 16px; font-size: 14px; text-align: center;
}
.link { text-align: center; margin-top: 16px; color: #64748b; font-size: 14px; }
.link a { color: #667eea; text-decoration: none; font-weight: 600; }
</style>