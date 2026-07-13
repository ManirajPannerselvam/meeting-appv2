<script lang="ts">
  let users = [
    {
      name: "Mani",
      email: "mani@company.com",
      role: "Admin"
    },
    {
      name: "Ravi",
      email: "ravi@company.com",
      role: "User"
    }
  ];

  let name = "";
  let email = "";
  let role = "User";

  function addUser() {
    users = [
      ...users,
      {
        name,
        email,
        role
      }
    ];

    name = "";
    email = "";
    role = "User";
  }
</script>

<h1>User Management</h1>

<div class="form">
  <input bind:value={name} placeholder="Name" />
  <input bind:value={email} placeholder="Email" />

  <select bind:value={role}>
    <option>Admin</option>
    <option>User</option>
  </select>

  <button on:click={addUser}>
    Add User
  </button>
</div>

<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Role</th>
    </tr>
  </thead>

  <tbody>
    {#each users as user}
      <tr>
        <td>{user.name}</td>
        <td>{user.email}</td>
        <td>{user.role}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
.form{
  display:flex;
  gap:10px;
  margin-bottom:20px;
}

input, select{
  padding:10px;
}

table{
  width:100%;
  border-collapse:collapse;
}

th, td{
  border:1px solid #ddd;
  padding:10px;
}
</style>