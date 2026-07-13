<script>
  let showCore = false;

  function toggleCore() {
    showCore = !showCore;
  }
</script>

<div class="page">
  <!-- HEADER -->
  <header class="header">
    <h2>Actions Panel</h2>
    <p>Mobile friendly UI</p>
  </header>

  <!-- BUTTON -->
  <button class="group-btn" on:click={toggleCore}>
    {showCore ? 'Hide Core' : 'Show Core'}
  </button>

  <!-- CONTENT -->
  {#if showCore}
    <div class="card">
      <h3>Core Section</h3>
      <p>This section is visible on toggle.</p>
    </div>
  {/if}
</div>

<style>
  /* PAGE WRAPPER */
  .page {
    max-width: 600px;
    margin: 0 auto;
    padding: 16px;
    font-family: system-ui, Arial;
  }

  /* HEADER */
  .header {
    text-align: center;
    margin-bottom: 20px;
  }

  .header h2 {
    margin: 0;
    font-size: 20px;
  }

  .header p {
    margin: 4px 0 0;
    color: #666;
    font-size: 14px;
  }

  /* BUTTON */
  .group-btn {
    width: 100%;
    padding: 14px;
    font-size: 16px;
    border: none;
    border-radius: 10px;
    background: #2563eb;
    color: white;
    cursor: pointer;
    transition: 0.2s;
  }

  .group-btn:hover {
    background: #1e4fd6;
  }

  .group-btn:active {
    transform: scale(0.98);
  }

  /* CARD */
  .card {
    margin-top: 16px;
    padding: 16px;
    border-radius: 12px;
    background: #f8f9fa;
    border: 1px solid #e5e7eb;
  }

  /* 📱 MOBILE OPTIMIZATION */
  @media (max-width: 600px) {
    .page {
      padding: 12px;
    }

    .group-btn {
      font-size: 15px;
      padding: 12px;
    }

    .card {
      font-size: 14px;
    }
  }
</style>