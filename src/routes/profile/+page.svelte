<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  type UserProfile = { mobile?: string; name?: string; role?: string } | null;
  let user: UserProfile = null;

  onMount(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) user = JSON.parse(stored);
      else user = null;
    } catch (e) { user = null; }
  });

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    goto("/login");
  }

  function goLogin() {
    goto("/login");
  }

  function goRegister() {
    goto("/register");
  }
</script>

{#if user}
  <div class="card">
    <h1>👤 Profile</h1>

    <div class="info">
      <p><b>Mobile:</b> {user.mobile}</p>
      <p><b>Name:</b> {user.name ?? "Not set"}</p>
      <p><b>Role:</b> {user.role ?? "User"}</p>
    </div>

    <div class="actions">
      <button class="logout" on:click={logout}>🚪 Logout</button>
    </div>
  </div>
{:else}
  <div class="card">
    <h1>👤 Profile</h1>

    <p class="msg">You are not logged in</p>

    <div class="actions">
      <button class="login" on:click={goLogin}>🔐 Login</button>
      <button class="register" on:click={goRegister}>📝 Register</button>
    </div>
  </div>
{/if}

<style>
  .card {
    max-width: 420px;
    margin: 40px auto;
    padding: 20px;
    border-radius: 12px;
    background: #111;
    color: white;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  }

  h1 {
    margin-bottom: 15px;
  }

  .info p {
    margin: 8px 0;
    font-size: 14px;
  }

  .msg {
    color: #aaa;
    margin-bottom: 15px;
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }

  .logout {
    background: red;
    color: white;
  }

  .login {
    background: #00aaff;
    color: white;
  }

  .register {
    background: green;
    color: white;
  }

  button:hover {
    opacity: 0.85;
  }
</style>