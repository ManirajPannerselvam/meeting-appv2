<script>
  import { goto } from "$app/navigation";

  let name = "";
  let mobile = "";
  let password = "";

  function register() {
    const user = {
      name,
      mobile,
      role: "user"
    };

    localStorage.setItem("user", JSON.stringify(user));
    goto("/login");
  }
</script>

<div class="auth-container">
  <div class="card">
    <h1>📝 Register</h1>
    <p class="sub">Create new account</p>

    <input bind:value={name} placeholder="Full Name" />
    <input bind:value={mobile} placeholder="Mobile Number" />
    <input bind:value={password} type="password" placeholder="Password" />

    <button class="btn-register" on:click={register}>
      Create Account
    </button>

    <p class="link">
      Already have account? <a href="/login">Login</a>
    </p>
  </div>
</div>

<style>
.auth-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #0f172a, #1e293b);
}

.card {
  width: 340px;
  padding: 25px;
  border-radius: 14px;
  background: #111827;
  color: white;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  text-align: center;
}

h1 {
  margin-bottom: 5px;
}

.sub {
  font-size: 12px;
  opacity: 0.7;
  margin-bottom: 15px;
}

input {
  width: 100%;
  padding: 10px;
  margin: 6px 0;
  border-radius: 8px;
  border: none;
  outline: none;
}

button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-weight: bold;
}

.btn-register {
  background: #22c55e;
}

.btn-register:hover {
  background: #16a34a;
}

.link {
  margin-top: 10px;
  font-size: 13px;
}

a {
  color: #60a5fa;
}
</style>