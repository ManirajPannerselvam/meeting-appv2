<script lang="ts">
    import { page } from "$app/stores";

    const menus = [
        {
            title: "Dashboard",
            href: "/admin"
        },
        {
            title: "Users",
            href: "/admin/users"
        },
        {
            title: "Roles",
            href: "/admin/roles"
        },
        {
            title: "Permissions",
            href: "/admin/permissions"
        },
        {
            title: "Audit Logs",
            href: "/admin/audit"
        },
        {
            title: "System Logs",
            href: "/admin/logs"
        },
        {
            title: "System",
            href: "/admin/system"
        },
        {
            title: "Backups",
            href: "/admin/backups"
        },
        {
            title: "Integrations",
            href: "/admin/integrations"
        }
    ];
</script>

<div class="admin-layout">

    <aside class="sidebar">

        <h2>🛠 Admin</h2>

        {#each menus as menu}

            <a
                href={menu.href}
                class:active={$page.url.pathname === menu.href}
            >
                {menu.title}
            </a>

        {/each}

    </aside>

    <main class="content">

        <slot />

    </main>

</div>

<style>

.admin-layout{

    display:grid;

    grid-template-columns:260px 1fr;

    min-height:100vh;

}

.sidebar{

    background:#1e293b;

    color:white;

    padding:20px;

    display:flex;

    flex-direction:column;

    gap:8px;

}

.sidebar h2{

    margin-bottom:20px;

}

.sidebar a{

    color:white;

    text-decoration:none;

    padding:12px;

    border-radius:8px;

    transition:.2s;

}

.sidebar a:hover{

    background:#334155;

}

.sidebar a.active{

    background:#2563eb;

}

.content{

    padding:24px;

    background:#f8fafc;

}

@media(max-width:900px){

.admin-layout{

grid-template-columns:1fr;

}

.sidebar{

flex-direction:row;

overflow:auto;

}

}

</style>