<script lang="ts">
    import { onMount } from "svelte";

    export let report: any;

    let installed = true;
    let loading = false;

    // Convert fields array OR values object to display array
    $: displayRows = report?.fields?.length 
        ? report.fields.map((f: any) => ({ 
            label: f.label || f.name, 
            value: f.value 
        }))
        : report?.values 
        ? Object.entries(report.values).map(([key, value]) => ({ 
            label: key.replace(/_/g, ' '), 
            value 
        }))
        : [];

    /* -----------------------------
       AUTH
    ------------------------------*/
    function token(): string {
        return localStorage.getItem("token") || "";
    }

    function authHeader() {
        const t = token();
        if (!t) return {};
        return {
            Authorization: `Bearer ${t}`
        };
    }

    /* -----------------------------
       CURRENT USER
    ------------------------------*/
    function getUserMobile(): string {
        const user = localStorage.getItem("user");
        if (user) {
            try {
                return JSON.parse(user).mobile || "";
            } catch {}
        }
        return "";
    }

    /* -----------------------------
       CHECK INSTALL
    ------------------------------*/
    async function checkInstalled() {
        if (!report?.template_id) return;
        
        const mobile = getUserMobile();
        if (!mobile) return;
        
        try {
            const r = await fetch(
                `/api/templates/check?mobile=${mobile}&templateId=${report.template_id}`,
                { headers: authHeader() }
            );
            const d = await r.json();
            installed = d.installed || false;
        } catch (err) {
            console.error("Check installed error:", err);
            installed = false;
        }
    }

    /* -----------------------------
       INSTALL
    ------------------------------*/
    async function installTemplate() {
        if (!report?.template_id) return;
        
        const mobile = getUserMobile();
        if (!mobile) {
            alert("User mobile not found");
            return;
        }
        
        loading = true;
        try {
            await fetch("/api/templates/install", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeader()
                },
                body: JSON.stringify({
                    mobile: mobile,
                    templateId: report.template_id
                })
            });
            installed = true;
        } catch (err) {
            console.error("Install error:", err);
            alert("Failed to install template");
        } finally {
            loading = false;
        }
    }

    onMount(checkInstalled);
</script>

<div class="template-card">
    <div class="header">
        <div class="icon">
            📊
        </div>
        <div class="info">
            <h3>{report?.template_name || "Template"}</h3>
            <small>{report?.category || report?.department || ""}</small>
        </div>
    </div>

    {#if !installed}
        <button
            class="install"
            on:click={installTemplate}
            disabled={loading}
        >
            {loading ? "Installing..." : "📥 Install Template"}
        </button>
    {/if}

    <div class="body">
        {#if displayRows.length > 0}
            {#each displayRows as row}
                <div class="row">
                    <span>{row.label}</span>
                    <b>{row.value}</b>
                </div>
            {/each}
        {:else}
            <div class="empty">No data available</div>
        {/if}
    </div>

    <div class="footer">
        {report?.sender || "Unknown"} • {report?.created_at 
            ? new Date(report.created_at).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'}) 
            : ""}
    </div>
</div>

<style>
.template-card {
    background: white;
    border-radius: 16px;
    width: 340px;
    padding: 18px;
    border-left: 5px solid #25D366;
    box-shadow: 0 5px 18px rgba(0, 0, 0, .12);
}

.header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 15px;
}

.icon {
    width: 45px;
    height: 45px;
    background: #25D366;
    color: white;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 22px;
    flex-shrink: 0;
}

.info {
    flex: 1;
}

.info h3 {
    margin: 0;
    font-size: 16px;
}

.info small {
    color: #666;
}

.install {
    width: 100%;
    margin-bottom: 15px;
    padding: 12px;
    background: #25D366;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
}

.install:hover:not(:disabled) {
    background: #1faa57;
}

.install:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.body {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #f0f0f0;
}

.row:last-child {
    border-bottom: none;
}

.row span {
    color: #666;
    font-size: 14px;
}

.row b {
    color: #333;
    font-size: 14px;
    text-align: right;
}

.empty {
    text-align: center;
    color: #999;
    padding: 20px 0;
}

.footer {
    margin-top: 15px;
    font-size: 12px;
    color: #888;
    text-align: right;
}
</style>