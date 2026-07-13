<script lang="ts">
  import { goto } from "$app/navigation";
  import { browser } from '$app/environment';

  let mobile = "";
  let otp = "";
  let step = 1;
  let error = "";
  let loading = false;

  const API_BASE = '';

  async function sendOtp() {
    error = "";
    if (!mobile || mobile.length !== 10) {
      error = "Enter valid 10 digit mobile";
      return;
    }

    loading = true;
    try {
      const res = await fetch(`${API_BASE}/api/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile })
      });

      const data = await res.json();
      console.log("Send OTP:", data);

      if (res.ok && data.success) {
        step = 2;
        alert(`OTP: ${data.otp}`); // Testing மட்டும்
      } else {
        error = data.error || "Failed to send OTP";
      }
    } catch (err) {
      console.error(err);
      error = "Network error";
    } finally {
      loading = false;
    }
  }

  async function verifyOtp() {
  error = "";
  if (!otp || otp.length !== 6) {
    error = "Enter 6 digit OTP";
    return;
  }

  loading = true;
  try {
    const res = await fetch(`${API_BASE}/api/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, otp })
    });

    const data = await res.json();
    console.log("Verify OTP:", data);

    if (data.success && data.token) {
      // ✅ verify-otp ஏற்கனவே token + user கொடுக்குது
      // Login API call பண்ண வேண்டாம்
      
      // Decode JWT to get userId
      const payload = JSON.parse(atob(data.token.split('.')[1]));
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", payload.userId); // JWT ல இருந்து
      localStorage.setItem("userRole", payload.role || 'user'); // ✅ Role
      localStorage.setItem("mobile", data.user.mobile);
      localStorage.setItem("userName", data.user.name);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect based on role
      if (payload.role === 'admin') {
        goto("/admin");
      } else {
        goto("/");
      }
    } else {
      error = data.message || "Invalid OTP";
    }
  } catch (err: any) {
    console.error(err);
    error = err.message || "Network error";
  } finally {
    loading = false;
  }
}
  function changeNumber() {
    step = 1;
    otp = "";
    error = "";
  }
</script>

<div class="container">
  <div class="login-card">
    <h2>📱 Login with Mobile</h2>
    <p class="subtitle">Enter your mobile number to continue</p>
    
    {#if step === 1}
      <div class="form-group">
        <label>Mobile Number</label>
        <input 
          type="tel" 
          placeholder="10 digit mobile" 
          bind:value={mobile} 
          maxlength="10"
          disabled={loading}
        />
      </div>
      <button on:click={sendOtp} disabled={loading} class="btn-primary">
        {loading ? 'Sending...' : 'Send OTP'}
      </button>
    {/if}

    {#if step === 2}
      <div class="form-group">
        <p class="info">OTP sent to <strong>{mobile}</strong></p>
        <label>Enter OTP</label>
        <input 
          type="tel" 
          placeholder="6 digit OTP" 
          bind:value={otp} 
          maxlength="6"
          disabled={loading}
        />
      </div>
      <button on:click={verifyOtp} disabled={loading} class="btn-primary">
        {loading ? 'Verifying...' : 'Verify & Login'}
      </button>
      <button on:click={changeNumber} class="btn-secondary" disabled={loading}>
        Change Number
      </button>
    {/if}

    {#if error}
      <div class="error">{error}</div>
    {/if}
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

.login-card {
    background: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    max-width: 400px;
    width: 100%;
}

h2 {
    margin: 0 0 8px 0;
    color: #1e293b;
    font-size: 28px;
}

.subtitle {
    color: #64748b;
    margin: 0 0 24px 0;
    font-size: 14px;
}

.form-group {
    margin-bottom: 20px;
}

label {
    display: block;
    margin-bottom: 8px;
    color: #374151;
    font-weight: 500;
    font-size: 14px;
}

input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 16px;
    box-sizing: border-box;
    transition: border 0.2s;
}

input:focus {
    outline: none;
    border-color: #667eea;
}

input:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
}

.info {
    background: #dbeafe;
    color: #1e40af;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
}

.btn-primary {
    width: 100%;
    padding: 14px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    margin-bottom: 12px;
}

.btn-primary:hover:not(:disabled) {
    background: #5568d3;
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-secondary {
    width: 100%;
    padding: 12px;
    background: white;
    color: #667eea;
    border: 2px solid #667eea;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
    background: #f3f4f6;
}

.error {
    background: #fee2e2;
    color: #dc2626;
    padding: 12px;
    border-radius: 8px;
    margin-top: 16px;
    font-size: 14px;
    text-align: center;
}
</style>