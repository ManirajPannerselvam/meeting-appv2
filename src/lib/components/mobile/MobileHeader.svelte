<script lang="ts">
    import { page } from "$app/state";

    let title = "Meeting App";

    $: {
        const p = $page.url.pathname;

        if (p === "/") title = "Dashboard";
        else if (p.startsWith("/chat")) title = "Chat";
        else if (p.startsWith("/meetings")) title = "Meetings";
        else if (p.startsWith("/reports")) title = "Reports";
        else if (p.startsWith("/templates")) title = "Templates";
        else title = "Meeting App";
    }

    function goBack() {
        history.back();
    }
</script>

<header class="mobile-header">

    <button class="back" on:click={goBack}>
        ←
    </button>

    <h2>{title}</h2>

    <button class="menu">
        ☰
    </button>

</header>

<style>

.mobile-header{

    position:sticky;

    top:0;

    z-index:9998;

    height:60px;

    background:white;

    display:none;

    align-items:center;

    justify-content:space-between;

    padding:0 15px;

    border-bottom:1px solid #e5e7eb;

    box-shadow:0 2px 6px rgba(0,0,0,.08);

}

.mobile-header h2{

    font-size:20px;

    font-weight:700;

    color:#1e293b;

}

.back,
.menu{

    width:40px;

    height:40px;

    border:none;

    background:none;

    font-size:22px;

    cursor:pointer;

}

@media(max-width:768px){

    .mobile-header{

        display:flex;

    }

}

</style>