<script lang="ts">
import { onMount } from "svelte";
import { supabase } from "$lib/supabase/client";

interface Role{
    role_id:string;
    role_name:string;
    description:string;
    permissions:string[];
    user_count:number;
    status:string;
    created_at:string;
}

interface UserOption {
    user_id: string;
    full_name: string;
    role: string;
}

// ===== STATE =====
let loading=true;
let roles:Role[]=[];
let filteredRoles:Role[]=[];
let search="";
let statusFilter="All";

let showRoleDialog=false;
let showDeleteDialog=false;
let editMode=false;
let selectedRole:Role|null=null;

let roleForm:Role={
    role_id:"", role_name:"", description:"", permissions:[],
    user_count:0, status:"Active", created_at:""
};

let availableUsers: UserOption[] = [];
let assignedUsers: string[] = [];
let auditLogs: any[] = [];

let importingRoles = false;
let exportingRoles = false;

const permissions=[
    "Dashboard","Production","Meetings","Actions","Reports",
    "Templates","Users","Roles","Settings","Administration"
];

// ===== DERIVED =====
$: filteredRoles=roles.filter(r=>{
    const okSearch= r.role_name.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    const okStatus= statusFilter==="All" || r.status===statusFilter;
    return okSearch && okStatus;
});

$: totalRoles=roles.length;
$: activeRoles=roles.filter(r=>r.status==="Active").length;
$: inactiveRoles=roles.filter(r=>r.status==="Inactive").length;
$: totalUsers=roles.reduce((sum,r)=>sum+(r.user_count||0),0);
$: systemRoles = roles.filter(r => ["Admin","Manager","Supervisor","Operator","Viewer"].includes(r.role_name)).length;
$: customRoles = roles.length - systemRoles;

// ===== LIFECYCLE =====
onMount(async ()=>{
    await Promise.all([loadRoles(), loadAvailableUsers(), loadAuditLogs()]);
});

// ===== DATA LOAD =====
async function loadRoles(){
    loading=true;
    try{
        const {data,error}=await supabase.from("roles").select("*").order("role_name");
        if(error) throw error;
        roles=data??[];
    } catch(err){ console.error(err); }
    finally{ loading=false; }
}

async function loadAvailableUsers() {
    const { data, error } = await supabase.from("users").select("user_id,full_name,role").order("full_name");
    if (!error) availableUsers = data?? [];
}

async function loadAuditLogs() {
    try {
        const { data, error } = await supabase.from("audit_logs").select("*").eq("module", "Roles").order("created_at", { ascending:false }).limit(15);
        if(!error) auditLogs = data?? [];
    } catch(err){ console.error(err); }
}

// ===== CRUD =====
function newRole(){
    editMode=false;
    roleForm={ role_id:"", role_name:"", description:"", permissions:[], user_count:0, status:"Active", created_at:"" };
    assignedUsers = [];
    showRoleDialog=true;
}

function editRole(role:Role){
    editMode=true;
    roleForm=structuredClone(role);
    assignedUsers = availableUsers.filter(u => u.role === role.role_name).map(u => u.user_id);
    showRoleDialog=true;
}

function validateRole():boolean{
    if(!roleForm.role_name.trim()){ alert("Role Name Required"); return false; }
    if(roleForm.permissions.length===0){ alert("Select at least one permission"); return false; }
    return true;
}

async function saveRole(){
    if(!validateRole()) return;
    try{
        if(editMode){
            const {error}=await supabase.from("roles").update({
                role_name:roleForm.role_name, description:roleForm.description,
                permissions:roleForm.permissions, status:roleForm.status
            }).eq("role_id",roleForm.role_id);
            if(error) throw error;
            await assignUsersToRole(); // update user role mapping
        } else {
            const {error}=await supabase.from("roles").insert({
                role_name:roleForm.role_name, description:roleForm.description,
                permissions:roleForm.permissions, status:roleForm.status, user_count:0
            });
            if(error) throw error;
        }
        showRoleDialog=false;
        await loadRoles();
    } catch(err:any){ alert(err.message); }
}

function confirmDelete(role:Role){
    selectedRole=role;
    showDeleteDialog=true;
}

async function deleteRole(){
    if(!selectedRole) return;
    try{
        const {error}=await supabase.from("roles").delete().eq("role_id",selectedRole.role_id);
        if(error) throw error;
        showDeleteDialog=false;
        await loadRoles();
    } catch(err:any){ alert(err.message); }
}

// ===== OTHER ACTIONS =====
function togglePermission(permission:string){
    roleForm.permissions = roleForm.permissions.includes(permission)
       ? roleForm.permissions.filter(p=>p!==permission)
        : [...roleForm.permissions, permission];
}

async function assignUsersToRole() {
    if (!roleForm.role_id || assignedUsers.length===0) return;
    try {
        const { error } = await supabase.from("users").update({ role: roleForm.role_name }).in("user_id", assignedUsers);
        if (error) throw error;
    } catch (err: any) { alert(err.message); }
}

async function duplicateRole(role: Role) {
    const copy = { role_name: `${role.role_name} Copy`, description: role.description, permissions: role.permissions, status: "Active", user_count:0 };
    const { error } = await supabase.from("roles").insert(copy);
    if (error) { alert(error.message); return; }
    loadRoles();
}

function exportPermissions(role: Role) {
    const text = [`Role : ${role.role_name}`, "",...role.permissions].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${role.role_name}-permissions.txt`; a.click(); URL.revokeObjectURL(url);
}

async function exportRoles(){
    exportingRoles = true;
    try{
        const csv = ["Role,Description,Users,Status",...roles.map(r => [r.role_name,`"${r.description}"`,r.user_count,r.status].join(","))].join("\n");
        const blob = new Blob([csv], { type:"text/csv" });
        const url = URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = "roles.csv"; a.click(); URL.revokeObjectURL(url);
    } finally{ exportingRoles = false; }
}

async function importRoles(event:Event){
    const file = (event.target as HTMLInputElement).files?.[0]; if(!file) return;
    importingRoles = true;
    try{
        const text = await file.text();
        const rows = text.split("\n").slice(1);
        const payload = rows.filter(r=>r.trim()).map(r=>{
            const c=r.split(",");
            return{ role_name:c[0], description:c[1], user_count:Number(c[2]), status:c[3], permissions:[] };
        });
        const {error}=await supabase.from("roles").insert(payload);
        if(error) throw error;
        await loadRoles();
    } catch(err:any){ alert(err.message); }
    finally{ importingRoles=false; }
}
</script>

<div class="page">
    <!-- HEADER -->
    <div class="page-header">
        <div>
            <h1>🔐 Role Management</h1>
            <p>Enterprise User Role Administration</p>
        </div>
        <div class="header-actions">
            <button class="green" on:click={newRole}>➕ New Role</button>
            <label class="blue upload">
                📥 Import <input hidden type="file" accept=".csv" on:change={importRoles}/>
            </label>
            <button class="orange" on:click={exportRoles} disabled={exportingRoles}>📤 Export</button>
        </div>
    </div>

    <!-- KPI -->
    <div class="analytics">
        <div class="card blue"><h2>{totalRoles}</h2><p>Total Roles</p></div>
        <div class="card green"><h2>{activeRoles}</h2><p>Active Roles</p></div>
        <div class="card orange"><h2>{inactiveRoles}</h2><p>Inactive Roles</p></div>
        <div class="card purple"><h2>{totalUsers}</h2><p>Assigned Users</p></div>
    </div>

    <!-- SYSTEM VS CUSTOM -->
    <div class="analytics">
        <div class="card blue"><h2>{systemRoles}</h2><p>System Roles</p></div>
        <div class="card green"><h2>{customRoles}</h2><p>Custom Roles</p></div>
        <div class="card orange"><h2>{totalUsers}</h2><p>Assigned Users</p></div>
        <div class="card purple"><h2>{permissions.length}</h2><p>Available Permissions</p></div>
    </div>

    <!-- TOOLBAR -->
    <div class="toolbar">
        <input placeholder="Search role..." bind:value={search}/>
        <select bind:value={statusFilter}>
            <option>All</option><option>Active</option><option>Inactive</option>
        </select>
    </div>

    <!-- TABLE -->
    <div class="table-card">
        {#if loading}
            <div class="skeleton">{#each Array(6) as _}<div class="row"></div>{/each}</div>
        {:else if filteredRoles.length===0}
            <div class="loading">No Roles Found</div>
        {:else}
        <table>
            <thead>
                <tr>
                    <th>Role</th><th>Description</th><th>Permissions</th>
                    <th>Users</th><th>Status</th><th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {#each filteredRoles as role}
                <tr>
                    <td><b>{role.role_name}</b></td>
                    <td>{role.description}</td>
                    <td>{role.permissions?.length || 0}</td>
                    <td>{role.user_count}</td>
                    <td><span class="status" class:active={role.status==="Active"} class:inactive={role.status==="Inactive"}>{role.status}</span></td>
                    <td>
                        <div class="actions">
                            <button class="small blue" on:click={() => editRole(role)}>Edit</button>
                            <button class="small green" on:click={() => duplicateRole(role)}>Copy</button>
                            <button class="small orange" on:click={() => exportPermissions(role)}>Export</button>
                            <button class="small red" on:click={() => confirmDelete(role)}>Delete</button>
                        </div>
                    </td>
                </tr>
                {/each}
            </tbody>
        </table>
        {/if}
    </div>

    <!-- AUDIT LOG -->
    <div class="audit-card">
        <h2>Recent Audit Logs</h2>
        <table>
            <thead><tr><th>User</th><th>Action</th><th>Date</th></tr></thead>
            <tbody>{#each auditLogs as log}
                <tr><td>{log.user_name}</td><td>{log.action}</td><td>{new Date(log.created_at).toLocaleString()}</td></tr>
            {/each}</tbody>
        </table>
    </div>
</div>

<!-- ROLE DIALOG -->
{#if showRoleDialog}
<div class="overlay">
    <div class="dialog">
        <div class="dialog-header">
            <h2>{editMode? "Edit Role" : "Create Role"}</h2>
            <button class="close" on:click={() => showRoleDialog = false}>✕</button>
        </div>

        <div class="form-grid">
            <div>
                <label>Role Name</label>
                <input bind:value={roleForm.role_name} placeholder="Production Manager"/>
            </div>
            <div>
                <label>Status</label>
                <select bind:value={roleForm.status}><option>Active</option><option>Inactive</option></select>
            </div>
        </div>

        <label>Description</label>
        <textarea rows="3" bind:value={roleForm.description} placeholder="Role Description"/>

        <h3>Permissions</h3>
        <div class="permission-grid">
            {#each permissions as permission}
            <label class="permission-item">
                <input type="checkbox" checked={roleForm.permissions.includes(permission)} on:change={() => togglePermission(permission)}/>
                <span>{permission}</span>
            </label>
            {/each}
        </div>

        {#if editMode}
        <h3>Assign Users</h3>
        <select multiple bind:value={assignedUsers} style="height:180px">
            {#each availableUsers as user}
            <option value={user.user_id}>{user.full_name} - {user.role}</option>
            {/each}
        </select>
        {/if}

        <div class="dialog-footer">
            <button class="secondary" on:click={() => showRoleDialog = false}>Cancel</button>
            <button class="green" on:click={saveRole}>💾 Save Role</button>
        </div>
    </div>
</div>
{/if}

<!-- DELETE DIALOG -->
{#if showDeleteDialog}
<div class="overlay">
    <div class="dialog small">
        <h2>Delete Role</h2>
        <p>Delete <b>{selectedRole?.role_name}</b>?</p>
        <div class="dialog-footer">
            <button class="secondary" on:click={() => showDeleteDialog = false}>Cancel</button>
            <button class="red" on:click={deleteRole}>Delete</button>
        </div>
    </div>
</div>
{/if}

<style>
.page{padding:24px;display:flex;flex-direction:column;gap:20px;max-width:1400px;margin:auto}
.page-header{display:flex;justify-content:space-between;align-items:center}
.header-actions{display:flex;gap:12px}
.analytics{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:20px}
.card{padding:22px;border-radius:14px;color:white}
.card h2{margin:0;font-size:34px}
.card p{margin:5px 0 0 0;opacity:.9}
.blue{background:#2563eb}.green{background:#16a34a}.orange{background:#ea580c}.purple{background:#7c3aed}
.toolbar{display:grid;grid-template-columns:2fr 220px;gap:16px}
.toolbar input,.toolbar select{padding:10px;border:1px solid #d1d5db;border-radius:8px}
.table-card{background:white;padding:20px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.08);overflow:auto}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:12px;background:#f8fafc}
td{padding:12px;border-bottom:1px solid #e5e7eb}
.status{padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600}
.active{background:#dcfce7;color:#15803d}
.inactive{background:#fee2e2;color:#dc2626}
.actions{display:flex;gap:6px;flex-wrap:wrap}
.small{padding:6px 12px;border:none;border-radius:6px;cursor:pointer;color:white}
button.green{background:#10b981}button.blue{background:#3b82f6}button.orange{background:#f59e0b}button.red{background:#ef4444}
.loading{padding:40px;text-align:center;color:#64748b}
.upload{display:flex;align-items:center;justify-content:center;padding:10px 18px;border-radius:8px;cursor:pointer;color:white;background:#2563eb}

/* Dialog */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;justify-content:center;align-items:center;z-index:999}
.dialog{background:white;width:900px;max-width:96%;padding:24px;border-radius:14px;max-height:90vh;overflow:auto}
.dialog.small{width:420px}
.dialog-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.close{background:none;border:none;font-size:22px;cursor:pointer}
.form-grid{display:grid;grid-template-columns:1fr 250px;gap:18px;margin-bottom:18px}
.form-grid input,.form-grid select,textarea{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px}
.permission-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:20px 0}
.permission-item{display:flex;align-items:center;gap:10px;padding:10px;background:#f8fafc;border-radius:8px}
.dialog-footer{display:flex;justify-content:flex-end;gap:14px;margin-top:24px}
.secondary{background:#64748b;color:white;padding:10px 18px;border:none;border-radius:8px;cursor:pointer}
select[multiple]{width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px}

/* Audit */
.audit-card{margin-top:30px;background:white;padding:20px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.08)}
.audit-card table{width:100%;border-collapse:collapse}
.audit-card td,.audit-card th{padding:12px;border-bottom:1px solid #e5e7eb;text-align:left}

/* Skeleton */
.skeleton.row{height:50px;background:#f1f5f9;border-radius:8px;margin-bottom:10px;animation:pulse 1.2s infinite}
@keyframes pulse{0%{opacity:.4}50%{opacity:1}100%{opacity:.4}}

@media(max-width:900px){.analytics{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr}.permission-grid{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}}
@media(max-width:600px){.analytics{grid-template-columns:1fr}}
</style>