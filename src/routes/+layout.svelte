<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let user = null;
  let openMenu = false;

  onMount(() => {
    user = JSON.parse(localStorage.getItem("user"));
  });

  function toggleMenu() {
    openMenu = !openMenu;
  }

  function goProfile() {
    openMenu = false;
    goto("/profile");
  }

  function logout() {
    localStorage.removeItem("user");
    user = null;
    openMenu = false;
    goto("/login");
  }
</script>

<!-- ================= HEADER ================= -->
<nav class="navbar">
  <div class="left">
    <a href="/dashboard" class="logo">📊 ERP System</a>
  </div>
<a href="/reports">
    📈 Reports
</a>

  <div class="center">
    <a href="/meetings">📅 Meetings</a>
    <a href="/meeting-list">📋 List</a>
    <a href="/chat">💬 Chat</a>
  </div>

  <div class="right">
    {#if user}
      <!-- PROFILE DROPDOWN -->
      <div class="menu">
        <button class="user-btn" on:click={toggleMenu}>
          👤 {user.username ?? "User"} ▾
        </button>

        {#if openMenu}
          <div class="dropdown">
            <button on:click={goProfile}>👤 My Profile</button>
            <button class="logout" on:click={logout}>🚪 Logout</button>
          </div>
        {/if}
      </div>
    {:else}
      <a href="/login" class="login-btn">Login</a>
    {/if}
  </div>
</nav>

<!-- PAGE CONTENT -->
<main>
  <slot />
</main>

<!-- ================= STYLE ================= -->
<style>
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 18px;
    background: #111;
    color: white;
  }

  .logo {
    color: #00d4ff;
    font-weight: bold;
    text-decoration: none;
  }

  .center a {
    margin: 0 10px;
    color: white;
    text-decoration: none;
  }

  .center a:hover {
    color: #00d4ff;
  }

  .user-btn {
    background: #222;
    color: white;
    border: 1px solid #333;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
  }

  .menu {
    position: relative;
    display: inline-block;
  }

  .dropdown {
    position: absolute;
    right: 0;
    top: 40px;
    background: white;
    color: black;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    width: 150px;
    overflow: hidden;
  }

  .dropdown button {
    width: 100%;
    padding: 10px;
    border: none;
    background: white;
    cursor: pointer;
    text-align: left;
  }

  .dropdown button:hover {
    background: #f2f2f2;
  }

  .logout {
    color: red;
  }

  main {
    padding: 20px;
  }

  .login-btn {
    color: white;
    background: #00d4ff;
    padding: 6px 12px;
    border-radius: 6px;
    text-decoration: none;
  }
</style>