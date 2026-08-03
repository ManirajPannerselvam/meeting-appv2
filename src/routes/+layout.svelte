<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import "../app.css";

    let user: any = null;

    let openMenu = false;
    let mobileMenu = false;

    $: isChatPage = $page.url.pathname.startsWith("/chat");

    onMount(() => {
        user = JSON.parse(localStorage.getItem("user") || "null");
    });

    function toggleMenu() {
        openMenu = !openMenu;
    }

    function toggleMobile() {
        mobileMenu = !mobileMenu;
    }

    function goProfile() {
        openMenu = false;
        mobileMenu = false;
        goto("/profile");
    }

    function logout() {
        localStorage.removeItem("user");
        user = null;
        openMenu = false;
        mobileMenu = false;
        goto("/login");
    }
</script>

{#if !isChatPage}

<nav class="navbar">

    <div class="left">
        <a href="/dashboard" class="logo">
            📊 ERP System
        </a>
    </div>

    <button class="hamburger" on:click={toggleMobile}>
        ☰
    </button>

    <div class="center" class:show={mobileMenu}>

        <a href="/dashboard">Dashboard</a>

        <a href="/reports">Reports</a>

        <a href="/meetings">Meetings</a>

        <a href="/meeting-list">Meeting List</a>

        <a href="/chat">Chat</a>

    </div>

    <div class="right">

        {#if user}

            <div class="menu">

                <button class="user-btn" on:click={toggleMenu}>
                    👤 {user.username ?? "User"} ▾
                </button>

                {#if openMenu}

                    <div class="dropdown">

                        <button on:click={goProfile}>
                            👤 My Profile
                        </button>

                        <button class="logout" on:click={logout}>
                            🚪 Logout
                        </button>

                    </div>

                {/if}

            </div>

        {:else}

            <a href="/login" class="login-btn">
                Login
            </a>

        {/if}

    </div>

</nav>

{/if}

<main class:full-screen={isChatPage}>
    <slot />
</main>

<style>
:global(body) {
    margin: 0;
    font-family: "Segoe UI", sans-serif;
    background: #f5f7fb;
    overflow-x: hidden;
}

/* =========================
   NAVBAR
========================= */

.navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;

    background: #111827;
    color: white;

    padding: 12px 18px;
    min-height: 60px;
    position: sticky;
    top: 0;
    z-index: 999;
}

.left,
.right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.center {
    display: flex;
    align-items: center;
    gap: 12px;
}

.logo {
    color: #22c55e;
    text-decoration: none;
    font-size: 22px;
    font-weight: bold;
    white-space: nowrap;
}

.center a {
    color: white;
    text-decoration: none;
    padding: 8px 14px;
    border-radius: 8px;
    transition: .2s;
    white-space: nowrap;
}

.center a:hover {
    background: #1f2937;
}

.user-btn {
    background: #1f2937;
    color: white;
    border: none;
    padding: 10px 14px;
    border-radius: 8px;
    cursor: pointer;
}

.login-btn {
    background: #22c55e;
    color: white;
    text-decoration: none;
    padding: 10px 16px;
    border-radius: 8px;
}

.menu {
    position: relative;
}

.dropdown {
    position: absolute;
    right: 0;
    top: 48px;

    width: 190px;

    background: white;
    color: black;

    border-radius: 10px;
    overflow: hidden;

    box-shadow: 0 10px 25px rgba(0,0,0,.2);
    z-index: 1000;
}

.dropdown button {
    width: 100%;
    border: none;
    background: white;
    padding: 12px;
    text-align: left;
    cursor: pointer;
}

.dropdown button:hover {
    background: #f3f4f6;
}

.logout {
    color: #dc2626;
}

/* =========================
   PAGE
========================= */

main {
    padding: 20px;
    min-height: calc(100vh - 60px);
}

main.full-screen {
    padding: 0;
    min-height: 100vh;
}

/* =========================
   MOBILE MENU
========================= */

.hamburger {
    display: none;
    background: transparent;
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
}

/* =========================
   TABLET
========================= */

@media (max-width: 900px) {

    .navbar {
        flex-wrap: wrap;
        align-items: center;
    }

    .hamburger {
        display: block;
    }

    .center {
        display: none;
        flex-direction: column;
        width: 100%;
        margin-top: 15px;
        background: #111827;
    }

    .center.show {
        display: flex;
    }

    .center a {
        width: 100%;
        padding: 14px;
        border-radius: 0;
        border-bottom: 1px solid #374151;
    }

    .right {
        margin-left: auto;
    }
}

/* =========================
   MOBILE
========================= */

@media (max-width: 600px) {

    .navbar {
        padding: 10px 12px;
    }

    .logo {
        font-size: 18px;
    }

    .left {
        gap: 8px;
    }

    .right {
        gap: 8px;
    }

    .user-btn,
    .login-btn {
        padding: 8px 12px;
        font-size: 13px;
    }

    .dropdown {
        width: 170px;
        right: -10px;
    }

    main {
        padding: 12px;
    }
}
</style>