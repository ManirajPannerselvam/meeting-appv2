<script lang="ts">

export let report:any;

const icons:Record<string,string>={

Machine:"🏭",

Shift:"👤",

InputQty:"📥",

OutputQty:"📤",

Yield:"📈",

Remarks:"📝"

};

</script>

<div class="card">

    <div class="header">

        <div>

            <h3>

                📊 {report.template_name}

            </h3>

            <small>

                {report.department}

            </small>

        </div>

    </div>

    <div class="body">

        {#each Object.entries(report.values) as [k,v]}

        <div class="row">

            <div class="left">

                {icons[k] ?? "📌"}

                {k}

            </div>

            <div class="right">

                {v}

            </div>

        </div>

        {/each}

    </div>

    <div class="footer">

        <span>

            👨 {report.sender}

        </span>

        <span>

            🕒 {report.time}

        </span>

    </div>

</div>

<style>

.card{

background:white;

border-radius:16px;

box-shadow:0 8px 24px rgba(0,0,0,.08);

border:1px solid #e5e7eb;

overflow:hidden;

max-width:500px;

}

.header{

padding:18px;

background:#2563eb;

color:white;

}

.header h3{

margin:0;

}

.body{

padding:18px;

display:flex;

flex-direction:column;

gap:10px;

}

.row{

display:flex;

justify-content:space-between;

padding:10px;

background:#f8fafc;

border-radius:8px;

}

.left{

font-weight:600;

display:flex;

gap:8px;

align-items:center;

}

.right{

font-weight:bold;

color:#111827;

}

.footer{

display:flex;

justify-content:space-between;

padding:14px 18px;

border-top:1px solid #eee;

background:#fafafa;

font-size:13px;

}

</style>