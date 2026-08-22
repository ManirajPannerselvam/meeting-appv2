<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { supabase } from "$lib/supabase/client";

interface User {
    user_id: string;
    employee_no: string;
    full_name: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    role: string;
    avatar?: string;
    status: "Active" | "Inactive" | "Locked";
    permissions?: string[];
    last_login?: string;
    created_at?: string;
}

interface UserActivity {
    id: string;
    action: string;
    user_name: string;
    created_at: string;
    module: string;
}

// ===== STATE =====
let loading = true;
let users: User[] = [];
let filteredUsers: User[] = [];
let activityLogs: UserActivity[] = [];

let search = "";
let selectedDepartment = "All";
let selectedRole = "All";
let selectedStatus = "All";

let currentPage = 1;
let pageSize = 10;
let totalPages = 1;

let selectedUsers: string[] = [];
let selectAll = false;

let sortField = "full_name";
let sortDirection: "asc" | "desc" = "asc";

let importing = false;
let exporting = false;
let importProgress = 0;

// Dialog
let showUserDialog = false;
let showDeleteDialog = false;
let editMode = false;
let currentUser: User = createEmptyUser();
let deleteUserRecord: User | null = null;
let assignedPermissions: string[] = [];

// ===== CONSTANTS =====
const departments = ["All","Production","Quality","Maintenance","Engineering","Planning","Warehouse","HR","Admin"];
const roles = ["All","Administrator","Manager","Supervisor","Engineer","Operator","Viewer"];
const statuses = ["All","Active","Inactive","Locked"];
const permissionsList = ["Dashboard","Production","Meetings","Reports","Templates","Users","Settings","Admin"];

function createEmptyUser(): User {
    return {
        user_id: "", employee_no: "", full_name: "", email: "", phone: "",
        department: "Production", designation: "", role: "Operator",
        avatar: "", status: "Active", permissions: []
    };
}

// ===== DERIVED =====
$: totalUsers = users.length;
$: activeUsers = users.filter(u => u.status === "Active").length;
$: inactiveUsers = users.filter(u => u.status === "Inactive").length;
$: lockedUsers = users.filter(u => u.status === "Locked").length;
$: adminUsers = users.filter(u => u.role === "Administrator").length;
$: productionUsers = users.filter(u => u.department === "Production").length;
$: qualityUsers = users.filter(u => u.department === "Quality").length;
$: engineeringUsers = users.filter(u => u.department === "Engineering").length;
$: maintenanceUsers = users.filter(u => u.department === "Maintenance").length;

$: recentUsers = [...users]
   .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
   .slice(0, 5);

$: applyFilters();

// ===== LIFECYCLE =====
onMount(() => {
    loadUsers();
    loadActivityLogs();
});

// ===== DATA LOAD =====
async function loadUsers() {
    loading = true;
    try {
        const { data, error } = await supabase.from("users").select("*").order("full_name");
        if (error) throw error;
        users = (data?? []) as User[];
        applyFilters();
    } catch (err) { console.error(err); }
    finally { loading = false; }
}

async function loadActivityLogs() {
    try {
        const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        activityLogs = data?? [];
    } catch (err) { console.error(err); }
}

// ===== FILTER + SORT =====
function applyFilters() {
    filteredUsers = users.filter(user => {
        const keyword = search.toLowerCase();
        const matchSearch = user.full_name.toLowerCase().includes(keyword) || user.email.toLowerCase().includes(keyword) || user.employee_no.toLowerCase().includes(keyword);
        const matchDepartment = selectedDepartment === "All" || user.department === selectedDepartment;
        const matchRole = selectedRole === "All" || user.role === selectedRole;
        const matchStatus = selectedStatus === "All" || user.status === selectedStatus;
        return matchSearch && matchDepartment && matchRole && matchStatus;
    });

    sortByField(sortField, false);

    totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
}

function sortBy(field: string) {
    if (sortField === field) sortDirection = sortDirection === "asc"? "desc" : "asc";
    else { sortField = field; sortDirection = "asc"; }
    sortByField(field, true);
}

function sortByField(field: string, update: boolean) {
    filteredUsers.sort((a: any, b: any) => {
        let x = a[field]?? ""; let y = b[field]?? "";
        if (typeof x === "string") { x = x.toLowerCase(); y = y.toLowerCase(); }
        const result = x > y? 1 : x < y? -1 : 0;
        return sortDirection === "asc"? result : -result;
    });
    if(update) currentPage = 1;
}

// ===== BULK =====
function toggleSelectAll() {
    selectedUsers = selectAll? filteredUsers.map(u => u.user_id) : [];
}
function toggleUser(id: string) {
    selectedUsers = selectedUsers.includes(id)? selectedUsers.filter(x => x!== id) : [...selectedUsers, id];
    selectAll = selectedUsers.length === filteredUsers.length;
}

async function bulkUpdate(status: "Active" | "Inactive" | "Locked") {
    if (!selectedUsers.length) return;
    const { error } = await supabase.from("users").update({ status }).in("user_id", selectedUsers);
    if (error) alert(error.message); else { alert(`${selectedUsers.length} users updated`); selectedUsers = []; selectAll = false; loadUsers(); }
}

async function bulkDelete() {
    if (!selectedUsers.length) return;
    if (!confirm(`Delete ${selectedUsers.length} users?`)) return;
    const { error } = await supabase.from("users").delete().in("user_id", selectedUsers);
    if (error) alert(error.message); else { alert("Users deleted."); selectedUsers = []; selectAll = false; loadUsers(); }
}

// ===== CRUD =====
function createUser() { editMode = false; currentUser = createEmptyUser(); assignedPermissions = []; showUserDialog = true; }
function editUser(user: User) { editMode = true; currentUser = structuredClone(user); assignedPermissions = user.permissions?? []; showUserDialog = true; }

function validateUser() {
    if (!currentUser.employee_no.trim()) return alert("Employee Number is required"), false;
    if (!currentUser.full_name.trim()) return alert("Employee Name is required"), false;
    if (!currentUser.email.trim()) return alert("Email is required"), false;
    return true;
}

async function saveUser() {
    if (!validateUser()) return;
    try {
        const payload = {...currentUser, permissions: assignedPermissions };
        if (editMode) {
            const { error } = await supabase.from("users").update(payload).eq("user_id", currentUser.user_id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from("users").insert(payload);
            if (error) throw error;
        }
        showUserDialog = false; await loadUsers();
    } catch (err: any) { alert(err.message); }
}

async function updateStatus(user: User, status: "Active" | "Inactive" | "Locked") {
    const { error } = await supabase.from("users").update({ status }).eq("user_id", user.user_id);
    if (error) alert(error.message); else loadUsers();
}
async function resetPassword(user: User) {
    if (!confirm(`Reset password for ${user.full_name}?`)) return;
    const { error } = await supabase.rpc("reset_user_password", { p_user_id: user.user_id });
    if (error) alert(error.message); else alert("Password reset successfully.");
}
function confirmDelete(user: User) { deleteUserRecord = user; showDeleteDialog = true; }
async function deleteUser() {
    if (!deleteUserRecord) return;
    const { error } = await supabase.from("users").delete().eq("user_id", deleteUserRecord.user_id);
    if (error) alert(error.message); else { showDeleteDialog = false; deleteUserRecord = null; loadUsers(); }
}

// ===== AVATAR =====
async function uploadAvatar(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    const filename = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(filename, file, { upsert: true });
    if (error) return alert(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(filename);
    currentUser.avatar = data.publicUrl;
}

// ===== IMPORT / EXPORT =====
async function importUsers(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    importing = true; importProgress = 0;
    try {
        const text = await file.text();
        const rows = text.split("\n").filter(x => x.trim());
        const users = rows.slice(1).map(row => {
            const cols = row.split(",");
            return { employee_no: cols[0], full_name: cols[1], email: cols[2], phone: cols[3], department: cols[4], designation: cols[5], role: cols[6], status: cols[7] || "Active" };
        });
        importProgress = 60;
        const { error } = await supabase.from("users").insert(users);
        if (error) throw error;
        importProgress = 100; alert("Users Imported Successfully"); await loadUsers();
    } catch (err: any) { alert(err.message); }
    finally { importing = false; importProgress = 0; }
}

async function exportUsers() {
    exporting = true;
    try {
        const header = ["Employee No","Name","Email","Phone","Department","Designation","Role","Status"];
        const csv = [header.join(","),...filteredUsers.map(u => [u.employee_no,u.full_name,u.email,u.phone,u.department,u.designation,u.role,u.status].join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = "users.csv"; a.click(); URL.revokeObjectURL(url);
    } finally { exporting = false; }
}

function downloadTemplate() {
    const csv = `Employee No,Name,Email,Phone,Department,Designation,Role,Status\nEMP001,John Doe,john@test.com,9876543210,Production,Operator,Operator,Active`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "User_Import_Template.csv"; a.click(); URL.revokeObjectURL(url);
}

// ===== PERMISSIONS =====
function togglePermission(permission: string) {
    assignedPermissions = assignedPermissions.includes(permission)? assignedPermissions.filter(p => p!== permission) : [...assignedPermissions, permission];
}
</script>

<div class="page">
    <!-- HEADER -->
    <div class="header">
        <div>
            <h1>👥 User Management</h1>
            <p>Enterprise User Administration</p>
        </div>
        <div class="header-actions">
            <button class="green" on:click={createUser}>➕ Add User</button>
            <label class="blue upload-btn">
                📥 Import <input type="file" accept=".csv" hidden on:change={importUsers}/>
            </label>
            <button class="orange" on:click={exportUsers} disabled={exporting}>📤 Export</button>
            <button class="secondary" on:click={downloadTemplate}>Template</button>
        </div>
    </div>
    {#if importing}<div class="progress-box"><div class="progress-fill" style="width:{importProgress}%"/></div>{/if}

    <!-- KPI -->
    <div class="analytics">
        <div class="card blue"><h2>{totalUsers}</h2><p>Total Users</p></div>
        <div class="card green"><h2>{activeUsers}</h2><p>Active</p></div>
        <div class="card orange"><h2>{inactiveUsers}</h2><p>Inactive</p></div>
        <div class="card red"><h2>{lockedUsers}</h2><p>Locked</p></div>
    </div>

    <!-- DEPT STATS -->
    <div class="department-grid">
        <div><b>Production</b><span>{productionUsers}</span></div>
        <div><b>Quality</b><span>{qualityUsers}</span></div>
        <div><b>Engineering</b><span>{engineeringUsers}</span></div>
        <div><b>Maintenance</b><span>{maintenanceUsers}</span></div>
    </div>

    <!-- FILTERS -->
    <div class="toolbar">
        <input placeholder="Search employee..." bind:value={search}/>
        <select bind:value={selectedDepartment}>{#each departments as item}<option>{item}</option>{/each}</select>
        <select bind:value={selectedRole}>{#each roles as item}<option>{item}</option>{/each}</select>
        <select bind:value={selectedStatus}>{#each statuses as item}<option>{item}</option>{/each}</select>
    </div>

    <!-- BULK TOOLBAR -->
    {#if selectedUsers.length > 0}
    <div class="bulk-toolbar">
        <span>Selected <b>{selectedUsers.length}</b> Users</span>
        <div>
            <button class="green" on:click={() => bulkUpdate("Active")}>Activate</button>
            <button class="orange" on:click={() => bulkUpdate("Inactive")}>Deactivate</button>
            <button class="red" on:click={bulkDelete}>Delete</button>
        </div>
    </div>
    {/if}

    <!-- TABLE -->
    <div class="table-card">
        {#if loading}
            <div class="skeleton">{#each Array(8) as _}<div class="row"></div>{/each}</div>
        {:else if filteredUsers.length === 0}
            <div class="empty-state"><h2>👤</h2><h3>No Users Found</h3><button class="green" on:click={createUser}>Create User</button></div>
        {:else}
        <table>
            <thead>
                <tr>
                    <th><input type="checkbox" bind:checked={selectAll} on:change={toggleSelectAll}/></th>
                    <th on:click={() => sortBy("full_name")}>Employee</th>
                    <th on:click={() => sortBy("department")}>Department</th>
                    <th on:click={() => sortBy("role")}>Role</th>
                    <th on:click={() => sortBy("status")}>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
            {#each filteredUsers.slice((currentPage-1)*pageSize, currentPage*pageSize) as user}
                <tr>
                    <td><input type="checkbox" checked={selectedUsers.includes(user.user_id)} on:change={() => toggleUser(user.user_id)}/></td>
                    <td>
                        <div class="user-cell">
                            {#if user.avatar}<img src={user.avatar} alt={user.full_name} class="avatar"/>
                            {:else}<div class="avatar placeholder">{user.full_name.charAt(0)}</div>{/if}
                            <div><b>{user.full_name}</b><div class="muted">{user.employee_no}</div><div class="muted">{user.email}</div></div>
                        </div>
                    </td>
                    <td>{user.department}</td>
                    <td>{user.role}</td>
                    <td><span class="status" class:active={user.status==="Active"} class:inactive={user.status==="Inactive"} class:locked={user.status==="Locked"}>{user.status}</span></td>
                    <td>{user.last_login? new Date(user.last_login).toLocaleString() : "-"}</td>
                    <td>
                        <div class="actions">
                            <button class="small blue" on:click={() => editUser(user)}>Edit</button>
                            <button class="small orange" on:click={() => resetPassword(user)}>Reset</button>
                            {#if user.status==="Locked"}<button class="small green" on:click={() => updateStatus(user, "Active")}>Unlock</button>
                            {:else}<button class="small red" on:click={() => updateStatus(user, "Locked")}>Lock</button>{/if}
                            {#if user.status==="Inactive"}<button class="small green" on:click={() => updateStatus(user, "Active")}>Activate</button>{/if}
                            {#if user.status==="Active"}<button class="small orange" on:click={() => updateStatus(user, "Inactive")}>Deactivate</button>{/if}
                            <button class="small red" on:click={() => confirmDelete(user)}>Delete</button>
                        </div>
                    </td>
                </tr>
            {/each}
            </tbody>
        </table>
        {/if}
    </div>

    <!-- PAGINATION -->
    <div class="pagination">
        <button disabled={currentPage===1} on:click={()=>currentPage--}>◀ Previous</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button disabled={currentPage===totalPages} on:click={()=>currentPage++}>Next ▶</button>
    </div>

    <!-- RECENT USERS -->
    <div class="recent-users">
        <h2>Recently Added Users</h2>
        {#each recentUsers as user}
        <div class="recent-row"><div><b>{user.full_name}</b><br><small>{user.department}</small></div><div>{user.role}</div></div>
        {/each}
    </div>

    <!-- ACTIVITY LOG -->
    <div class="activity-panel">
        <h2>Recent User Activity</h2>
        <table>
            <thead><tr><th>User</th><th>Module</th><th>Action</th><th>Date</th></tr></thead>
            <tbody>{#each activityLogs as log}<tr><td>{log.user_name}</td><td>{log.module}</td><td>{log.action}</td><td>{new Date(log.created_at).toLocaleString()}</td></tr>{/each}</tbody>
        </table>
    </div>
</div>

<!-- USER DIALOG -->
{#if showUserDialog}
<div class="overlay">
    <div class="dialog">
        <h2>{editMode? "Edit User" : "Add User"}</h2>
        <div class="avatar-upload">
            {#if currentUser.avatar}<img src={currentUser.avatar} class="preview" alt="avatar"/>
            {:else}<div class="preview empty">👤</div>{/if}
            <input type="file" accept="image/*" on:change={uploadAvatar}/>
        </div>
        <div class="form">
            <input placeholder="Employee Number" bind:value={currentUser.employee_no}/>
            <input placeholder="Employee Name" bind:value={currentUser.full_name}/>
            <input placeholder="Email" bind:value={currentUser.email}/>
            <input placeholder="Phone" bind:value={currentUser.phone}/>
            <select bind:value={currentUser.department}>{#each departments.slice(1) as dept}<option value={dept}>{dept}</option>{/each}</select>
            <input placeholder="Designation" bind:value={currentUser.designation}/>
            <select bind:value={currentUser.role}>{#each roles.slice(1) as role}<option value={role}>{role}</option>{/each}</select>
            <select bind:value={currentUser.status}><option>Active</option><option>Inactive</option><option>Locked</option></select>
        </div>
        <div class="permission-box">
            <h3>Permissions</h3>
            <div class="permission-grid">{#each permissionsList as permission}
                <label><input type="checkbox" checked={assignedPermissions.includes(permission)} on:change={() => togglePermission(permission)}/>{permission}</label>
            {/each}</div>
        </div>
        <div class="dialog-actions">
            <button class="green" on:click={saveUser}>💾 Save</button>
            <button class="red" on:click={() => showUserDialog = false}>Cancel</button>
        </div>
    </div>
</div>
{/if}

<!-- DELETE DIALOG -->
{#if showDeleteDialog}
<div class="overlay">
    <div class="dialog small">
        <h2>Delete User</h2>
        <p>Are you sure to delete <b>{deleteUserRecord?.full_name}</b>?</p>
        <div class="dialog-actions">
            <button class="red" on:click={deleteUser}>Delete</button>
            <button on:click={() => showDeleteDialog = false}>Cancel</button>
        </div>
    </div>
</div>
{/if}

<style>
.page{padding:20px;max-width:1400px;margin:auto}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.header-actions{display:flex;gap:10px;flex-wrap:wrap}
.upload-btn{position:relative;cursor:pointer;padding:8px 14px;border-radius:8px;color:white;background:#2563eb}
.analytics,.department-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:20px}
.card{background:white;padding:20px;border-radius:12px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,.08)}
.card.blue{border-top:4px solid #3b82f6}.card.green{border-top:4px solid #10b981}.card.orange{border-top:4px solid #f59e0b}.card.red{border-top:4px solid #ef4444}
.department-grid div{background:white;padding:18px;border-radius:10px;display:flex;justify-content:space-between;box-shadow:0 3px 10px rgba(0,0,0,.08)}
.toolbar{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}
.toolbar input,.toolbar select{padding:10px;border:1px solid #d1d5db;border-radius:8px}
.bulk-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:10px}
.bulk-toolbar div{display:flex;gap:10px}
.table-card{background:white;border-radius:12px;overflow-x:auto;box-shadow:0 3px 10px rgba(0,0,0,.08)}
table{width:100%;border-collapse:collapse}
thead th{cursor:pointer;user-select:none;padding:12px;text-align:left;background:#f8fafc}
thead th:hover{background:#eef2ff}
td{padding:12px;border-bottom:1px solid #eee}
.user-cell{display:flex;align-items:center;gap:12px}
.avatar{width:40px;height:40px;border-radius:50%;object-fit:cover}
.avatar.placeholder{width:40px;height:40px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-weight:bold}
.status{padding:4px 10px;border-radius:20px;font-size:12px}
.status.active{background:#dcfce7;color:#166534}
.status.inactive{background:#ffedd5;color:#9a3412}
.status.locked{background:#fee2e2;color:#991b1b}
.actions{display:flex;gap:6px;flex-wrap:wrap}
button{padding:8px 14px;border:none;border-radius:8px;cursor:pointer}
button.green{background:#10b981;color:white}button.blue{background:#3b82f6;color:white}
button.orange{background:#f59e0b;color:white}button.red{background:#ef4444;color:white}
button.secondary{background:#e2e8f0}button.small{padding:5px 10px;font-size:12px}
.pagination{display:flex;justify-content:center;align-items:center;gap:12px;margin:20px 0}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;justify-content:center;align-items:center;z-index:1000}
.dialog{background:white;padding:24px;border-radius:12px;width:650px;max-width:95%}
.dialog.small{width:400px}
.form{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px}
.form input,.form select{padding:10px;border:1px solid #d1d5db;border-radius:8px}
.dialog-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:20px}
.avatar-upload{display:flex;align-items:center;gap:16px;margin-bottom:20px}
.preview{width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0}
.preview.empty{display:flex;justify-content:center;align-items:center;background:#f1f5f9;font-size:30px}
.activity-panel,.recent-users{margin-top:30px;background:white;padding:20px;border-radius:12px;box-shadow:0 3px 10px rgba(0,0,0,.08)}
.recent-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee}
.permission-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:15px 0}
.permission-grid label{display:flex;align-items:center;gap:8px}
.progress-box{height:6px;background:#e2e8f0;border-radius:10px;margin-bottom:15px;overflow:hidden}
.progress-fill{height:100%;background:#10b981;transition:width.3s}
.empty-state{padding:60px;text-align:center;color:#64748b}
.empty-state h2{font-size:70px;margin-bottom:10px}
.skeleton.row{height:55px;background:#f1f5f9;border-radius:8px;margin-bottom:10px;animation:pulse 1.2s infinite}
@keyframes pulse{0%{opacity:.5}50%{opacity:1}100%{opacity:.5}}
.muted{font-size:12px;color:#64748b}
@media(max-width:1000px){.analytics,.department-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.analytics,.department-grid,.form{grid-template-columns:1fr}}
</style>