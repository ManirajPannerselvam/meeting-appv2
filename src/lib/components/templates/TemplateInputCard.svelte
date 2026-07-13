<script lang="ts">

    export let template:any;

    let qty="";
    let ok="";
    let ng="";
    let remarks="";

</script>

<div class="card">

<h3>

{template.name}

</h3>

<div class="grid">

<input
bind:value={qty}
placeholder="Production Qty"
/>

<input
bind:value={ok}
placeholder="OK Qty"
/>

<input
bind:value={ng}
placeholder="NG Qty"
/>

<input
bind:value={remarks}
placeholder="Remarks"
/>

</div>

</div>

<style>

.card{

background:white;
padding:15px;
margin-bottom:15px;
border-radius:10px;

box-shadow:0 2px 6px rgba(0,0,0,.08);

}

.grid{

display:grid;

grid-template-columns:1fr 1fr;

gap:12px;

margin-top:15px;

}

.grid input{

padding:10px;

border:1px solid #ccc;

border-radius:8px;

}

</style>