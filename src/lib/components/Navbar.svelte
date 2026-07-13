<script>
  import { goto } from "$app/navigation";

  async function logout() {
    const token = localStorage.getItem("token");

    await fetch("/api/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    localStorage.removeItem("token");
    sessionStorage.clear();

    goto("/login");
  }
</script>

<nav class="navbar">
  <div class="left">
    <a href="/dashboard">🏠 Dashboard</a>
    <a href="/meetings">📅 Meetings</a>
    <a href="/meeting-list">📋 List</a>
  </div>

  <div class="right">
    <button class="logout" on:click={logout}>
      🚪 Logout
    </button>
  </div>
</nav>

<style>
  .navbar {
    display: flex;
    justify-content: space-between;
    padding: 12px 20px;
    background: #111;
    color: white;
  }

  .left a {
    margin-right: 15px;
    color: white;
    text-decoration: none;
  }

  .left a:hover {
    color: #00c2ff;
  }

  .logout {
    background: red;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    color: white;
    cursor: pointer;
  }

  .logout:hover {
    background: darkred;
  }
</style>