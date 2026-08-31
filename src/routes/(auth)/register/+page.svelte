<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  let fullName = '';
  let phone = '';
  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  async function handleSignup() {
    loading = true;
    error = '';
    
    if(!fullName.trim()){
      error = 'Please enter full name';
      loading = false;
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          name: fullName.trim(),
          phone: phone.trim(),
          avatar_url: ''
        },
        emailRedirectTo: `http://localhost:1420/auth/callback`
      }
    });
    
    if (err) {
      error = err.message;
      loading = false;
      return;
    }

    // Save to profiles table - so setting + chat gets it instantly
    if (data.user) {
      try {
        await supabase.from('profiles').upsert({ 
          id: data.user.id,
          name: fullName.trim(),
          full_name: fullName.trim(),
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          avatar_url: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          avatar_url: '',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        // Link invite if email was invited before signup
        await supabase.from('contact_invites')
          .update({ 
            invited_user: data.user.id, 
            status: 'accepted' 
          })
          .eq('email', email.toLowerCase().trim())
          .is('invited_user', null);
      } catch (e) {
        console.log('profile/invite link failed', e);
      }
    }

    goto('/login?msg=Check email to confirm');
    loading = false;
  }
</script>

<div class="auth-page">
  <div class="card">
    <h2>Create Account</h2>
    {#if error}<div class="error">{error}</div>{/if}
    
    <form on:submit|preventDefault={handleSignup}>
      <label>Full Name *</label>
      <input type="text" bind:value={fullName} required placeholder="Your name" />
      
      <label>Email *</label>
      <input type="email" bind:value={email} required />
      
      <label>Phone</label>
      <input type="tel" bind:value={phone} placeholder="Optional - for profile" />
      
      <label>Password *</label>
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
.card { background: white; padding: 24px; border-radius: 12px; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
label{ font-size:13px; font-weight:600; color:#334155; display:block; margin-top:4px; }
input { width: 100%; padding: 10px; margin: 6px 0 14px; border: 1px solid #ccc; border-radius: 6px; box-sizing:border-box; }
button { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 600; cursor:pointer; }
button:disabled{ opacity:0.6; }
.error { background: #fee2e2; color: #dc2626; padding: 10px; border-radius: 6px; margin-bottom: 12px; }
p{ text-align:center; margin-top:16px; font-size:14px; }
</style>