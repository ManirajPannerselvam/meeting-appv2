<script lang="ts">
  export let form;
  let loading = false;
</script>

<div class="container">
  <div class="card">
    <h2>Temple Operations Reporting System</h2>
    <h3>Sign In</h3>
    
    <form method="POST" action="?/login" on:submit={() => loading = true}>
      <div class="form-group">
        <label>Email</label>
        <input type="email" name="email" required />
      </div>

      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" required />
      </div>

      <button type="submit" disabled={loading} class="btn-primary">
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>

    {#if form?.error}
      <div class="error">{form.error}</div>
    {/if}

    <p class="link">Don't have account? <a href="/register">Sign Up</a></p>
  </div>
</div>

<style>
.container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
.card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 400px; width: 100%; }
h2 { margin: 0 0 8px 0; color: #667eea; font-size: 18px; text-align: center; }
h3 { margin: 0 0 24px 0; color: #1e293b; text-align: center; }
.form-group { margin-bottom: 16px; }
label { display: block; margin-bottom: 6px; color: #374151; font-weight: 500; font-size: 14px; }
input { width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
.btn-primary { width: 100%; padding: 14px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px; }
.error { background: #fee2e2; color: #dc2626; padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 14px; text-align: center; }
.link { text-align: center; margin-top: 16px; color: #64748b; font-size: 14px; }
.link a { color: #667eea; text-decoration: none; font-weight: 600; }
</style>