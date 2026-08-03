<nav class="sidebar">

  <h2>📋 MMS</h2>

  <a href="/">🏠 Home</a>
  <a href="/dashboard">📊 Dashboard</a>
  <a href="/meetings">📅 Meetings</a>
  <a href="/action-tracker">✅ Action Tracker</a>
  <a href="/attendance">👥 Attendance</a>
  <a href="/analytics">📈 Analytics</a>
  <a href="/reports">📑 Reports</a>
  <a href="/attachments">📎 Attachments</a>

</nav>

<style>
.sidebar{
    position:fixed;
    left:0;
    top:0;
    width:260px;
    max-width:85vw;
    height:100dvh;
    background:#1e3a8a;
    padding:20px 16px;
    overflow-y:auto;
    box-sizing:border-box;
    box-shadow:2px 0 12px rgba(0,0,0,.2);
    z-index:1000;
}

.sidebar h2{
    margin:0 0 20px;
    color:white;
    text-align:center;
    font-size:22px;
}

.sidebar a{
    display:block;
    color:white;
    text-decoration:none;
    padding:12px 14px;
    margin:6px 0;
    border-radius:8px;
    transition:.2s;
    font-size:15px;
}

.sidebar a:hover{
    background:#2563eb;
}

.sidebar a.active{
    background:#3b82f6;
    font-weight:600;
}

/* Tablet */

@media (max-width:900px){

    .sidebar{
        width:220px;
        padding:16px;
    }

}

/* Mobile */

@media (max-width:600px){

    .sidebar{
        width:80vw;
        padding:16px 12px;
    }

    .sidebar h2{
        font-size:20px;
    }

    .sidebar a{
        padding:14px;
        font-size:16px;
    }

}
</style>