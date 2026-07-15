<script lang="ts">
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  let showOtpPopup = false;
  let email = '';
  let otp = '';
  let step: 'email' | 'otp' = 'email';
  let loading = false;
  let error = '';
  let countdown = 0;

  function openOtpPopup() {
    showOtpPopup = true;
    step = 'email';
    error = '';
    otp = '';
  }

  function closeOtpPopup() {
    showOtpPopup = false;
    step = 'email';
    error = '';
  }

  async function sendOtp() {
    if (!email.trim()) {
      error = 'Enter email';
      return;
    }

    loading = true;
    error = '';

    // Check if user exists in DB first
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!userData) {
      loading = false;
      error = 'User not found. Please sign up first.';
      return;
    }

    // Send OTP
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email
    });

    loading = false;

    if (otpError) {
      error = otpError.message;
      return;
    }

    step = 'otp';
    startCountdown();
  }

  async function verifyOtp() {
    if (otp.length !== 6) {
      error = 'Enter 6-digit OTP';
      return;
    }

    loading = true;
    error = '';

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'email'
    });

    if (verifyError) {
      loading = false;
      error = verifyError.message;
      return;
    }

    // Update is_verified in DB
    if (data.user) {
      await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', data.user.id);
    }

    loading = false;
    closeOtpPopup();
    goto('/dashboard');
  }

  function startCountdown() {
    countdown = 60;
    const timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) clearInterval(timer);
    }, 1000);
  }

  async function resendOtp() {
    if (countdown > 0) return;
    await sendOtp();
  }
</script>

<div class="container">
  <div class="card">
    <h2>Sign In</h2>
    <p class="subtitle">Click below to sign in with OTP</p>

    <button on:click={openOtpPopup} class="btn-signin">
      🔐 Sign In with OTP
    </button>

    <p class="link">Don't have account? <a href="/signup">Sign Up</a></p>
  </div>
</div>

<!-- OTP Popup -->
{#if showOtpPopup}
  <div class="overlay" on:click={closeOtpPopup}>
    <div class="popup" on:click|stopPropagation>
      <button class="close" on:click={closeOtpPopup}>✕</button>

      {#if step === 'email'}
        <h2>Enter Email</h2>
        <p class="subtitle">We'll send you a verification code</p>

        <div class="form-group">
          <input 
            type="email" 
            placeholder="your@email.com" 
            bind:value={email}
            disabled={loading}
            on:keydown={(e) => e.key === 'Enter' && sendOtp()}
          />
        </div>

        <button on:click={sendOtp} disabled={loading} class="btn-primary">
          {loading ? 'Sending...' : 'Send OTP'}
        </button>

      {:else if step === 'otp'}
        <h2>Verify OTP</h2>
        <p class="subtitle">Code sent to {email}</p>

        <div class="form-group">
          <input 
            type="text" 
            placeholder="000000" 
            bind:value={otp}
            maxlength="6"
            disabled={loading}
            on:keydown={(e) => e.key === 'Enter' && verifyOtp()}
            class="otp-input"
          />
        </div>

        <button on:click={verifyOtp} disabled={loading} class="btn-primary">
          {loading ? 'Verifying...' : 'Verify & Sign In'}
        </button>

        <button on:click={resendOtp} disabled={countdown > 0} class="btn-link">
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
        </button>

        <button on:click={() => step = 'email'} class="btn-link">
          Change Email
        </button>
      {/if}

      {#if error}
        <div class="error">{error}</div>
      {/if}
    </div>
  </div>
{/if}

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
    text-align: center;
}
h2 { margin: 0 0 8px 0; color: #1e293b; }
.subtitle { color: #64748b; margin: 0 0 24px 0; font-size: 14px; }
.btn-signin {
    width: 100%; padding: 16px; background: #2563eb; color: white; border: none;
    border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;
}
.overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6); display: flex; align-items: center;
    justify-content: center; z-index: 9999;
}
.popup {
    background: white; padding: 32px; border-radius: 16px; max-width: 400px;
    width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;
}
.close {
    position: absolute; top: 16px; right: 16px; background: none;
    border: none; font-size: 24px; cursor: pointer; color: #64748b;
}
.form-group { margin-bottom: 20px; }
input {
    width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px;
    font-size: 16px; box-sizing: border-box;
}
input:focus { outline: none; border-color: #2563eb; }
.otp-input {
    text-align: center; font-size: 24px; letter-spacing: 8px; font-weight: 600;
}
.btn-primary {
    width: 100%; padding: 14px; background: #2563eb; color: white; border: none;
    border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 12px;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-link {
    background: none; border: none; color: #2563eb; cursor: pointer;
    font-size: 14px; padding: 8px; width: 100%;
}
.btn-link:disabled { color: #94a3b8; cursor: not-allowed; }
.error {
    background: #fee2e2; color: #dc2626; padding: 12px; border-radius: 8px;
    margin-top: 16px; font-size: 14px; text-align: center;
}
.link { margin-top: 16px; color: #64748b; font-size: 14px; }
.link a { color: #667eea; text-decoration: none; font-weight: 600; }
</style>