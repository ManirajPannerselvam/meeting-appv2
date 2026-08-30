<script lang="ts">
  export let selectedTheme = "emerald";
  export let onSelect: (id:string)=>void = ()=>{};

  type Theme = {
    id: string;
    name: string;
    desc: string;
    primary: string;
    secondary: string;
    card: string;
    timeColors: { label: string; time: string; color: string }[];
  };

  export const themes: Theme[] = [
    { id:"emerald", name:"Emerald Pro", desc:"Production / Day shift", primary:"#10b981", secondary:"#065f46", card:"#ecfdf5",
      timeColors:[
        { label:"Morning", time:"06-12", color:"#10b981" },
        { label:"Afternoon", time:"12-18", color:"#f59e0b" },
        { label:"Night", time:"18-06", color:"#1e293b" },
      ]},
    { id:"ocean", name:"Ocean Blue", desc:"Quality / Audit", primary:"#0ea5e9", secondary:"#0c4a6e", card:"#e0f2fe",
      timeColors:[
        { label:"Morning", time:"06-12", color:"#0ea5e9" },
        { label:"Afternoon", time:"12-18", color:"#6366f1" },
        { label:"Night", time:"18-06", color:"#0f172a" },
      ]},
    { id:"sunset", name:"Sunset Amber", desc:"Evening report", primary:"#f59e0b", secondary:"#78350f", card:"#fffbeb",
      timeColors:[
        { label:"Morning", time:"06-12", color:"#fbbf24" },
        { label:"Afternoon", time:"12-18", color:"#f59e0b" },
        { label:"Night", time:"18-06", color:"#92400e" },
      ]},
    { id:"slate", name:"Slate Corporate", desc:"Official / Finance", primary:"#334155", secondary:"#0f172a", card:"#f1f5f9",
      timeColors:[
        { label:"Morning", time:"06-12", color:"#475569" },
        { label:"Afternoon", time:"12-18", color:"#334155" },
        { label:"Night", time:"18-06", color:"#0f172a" },
      ]},
    { id:"royal", name:"Royal Purple", desc:"Management / Review", primary:"#8b5cf6", secondary:"#4c1d95", card:"#ede9fe",
      timeColors:[
        { label:"Morning", time:"06-12", color:"#a78bfa" },
        { label:"Afternoon", time:"12-18", color:"#8b5cf6" },
        { label:"Night", time:"18-06", color:"#4c1d95" },
      ]},
    { id:"ruby", name:"Ruby Red", desc:"Urgent / Breakdown", primary:"#ef4444", secondary:"#7f1d1d", card:"#fef2f2",
      timeColors:[
        { label:"Morning", time:"06-12", color:"#f87171" },
        { label:"Afternoon", time:"12-18", color:"#ef4444" },
        { label:"Night", time:"18-06", color:"#991b1b" },
      ]},
    { id:"teal", name:"Teal Medical", desc:"Safety / Hygiene", primary:"#14b8a6", secondary:"#134e4a", card:"#ccfbf1",
      timeColors:[
        { label:"Morning", time:"06-12", color:"#2dd4bf" },
        { label:"Afternoon", time:"12-18", color:"#14b8a6" },
        { label:"Night", time:"18-06", color:"#0f766e" },
      ]},
    { id:"indigo", name:"Indigo Night", desc:"Night shift special", primary:"#6366f1", secondary:"#312e81", card:"#e0e7ff",
      timeColors:[
        { label:"Morning", time:"06-12", color:"#818cf8" },
        { label:"Afternoon", time:"12-18", color:"#6366f1" },
        { label:"Night", time:"18-06", color:"#1e1b4b" },
      ]},
    { id:"forest", name:"Forest Dark", desc:"Maintenance", primary:"#16a34a", secondary:"#052e16", card:"#dcfce7",
      timeColors:[
        { label:"Morning", time:"06-12", color:"#4ade80" },
        { label:"Afternoon", time:"12-18", color:"#16a34a" },
        { label:"Night", time:"18-06", color:"#14532d" },
      ]},
    { id:"charcoal", name:"Charcoal Elite", desc:"Executive summary", primary:"#111827", secondary:"#000000", card:"#ffffff",
      timeColors:[
        { label:"Morning", time:"06-12", color:"#6b7280" },
        { label:"Afternoon", time:"12-18", color:"#111827" },
        { label:"Night", time:"18-06", color:"#000000" },
      ]},
  ];

  function getMessageColor(themeId:string, sendTime: Date = new Date()){
    const t = themes.find(x=>x.id===themeId);
    if(!t) return themes[0].primary;
    const h = sendTime.getHours();
    if(h>=6 && h<12) return t.timeColors[0].color;
    if(h>=12 && h<18) return t.timeColors[1].color;
    return t.timeColors[2].color;
  }
</script>

<div class="theme-grid">
  {#each themes as th}
    <button class="theme-card" class:active={selectedTheme===th.id} on:click={()=>{ selectedTheme=th.id; onSelect(th.id); }}>
      <div class="theme-top" style="background:{th.card}; border-top:4px solid {th.primary}">
        <div class="dot" style="background:{th.primary}"></div>
        <b>{th.name}</b>
        <small>{th.desc}</small>
      </div>
      <div class="color-row">
        <span class="box" style="background:{th.primary}" title="Primary {th.primary}"></span>
        <span class="box" style="background:{th.secondary}" title="Secondary {th.secondary}"></span>
        <span class="box" style="background:{th.card}; border:1px solid #e5e7eb" title="Card {th.card}"></span>
      </div>
      <!-- MESSAGE TIME COLOR -->
      <div class="time-colors">
        <p class="time-title">Message sending time color</p>
        <div class="time-boxes">
          {#each th.timeColors as tc}
            <div class="time-item">
              <span class="time-box" style="background:{tc.color}"></span>
              <div>
                <b>{tc.label}</b>
                <small>{tc.time} → {tc.color}</small>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </button>
  {/each}
</div>

<div class="legend">
  <b>Logic:</b> Chat message bubble & template card border changes by send time.
  <code>06-12 = Morning color</code> <code>12-18 = Afternoon color</code> <code>18-06 = Night color</code>
</div>

<style>
.theme-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:12px; padding:10px; }
.theme-card{ text-align:left; background:white; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; cursor:pointer; transition:all.15s; padding:0; }
.theme-card.active{ border-color:#111827; box-shadow:0 8px 24px rgba(0,0,0,.12); transform:translateY(-2px); }
.theme-card:hover{ box-shadow:0 4px 16px rgba(0,0,0,.08); }
.theme-top{ padding:14px 12px; display:flex; flex-direction:column; gap:4px; position:relative; }
.theme-top.dot{ width:10px; height:10px; border-radius:50%; position:absolute; right:10px; top:10px; }
.theme-top b{ font-size:13px; color:#111827; }
.theme-top small{ font-size:11px; color:#64748b; }
.color-row{ display:flex; gap:6px; padding:8px 12px; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; }
.box{ width:20px; height:20px; border-radius:6px; display:inline-block; }
.time-colors{ padding:10px 12px; background:#f8fafc; }
.time-title{ margin:0 0 6px; font-size:10px; font-weight:800; text-transform:uppercase; color:#475569; letter-spacing:.5px; }
.time-boxes{ display:flex; flex-direction:column; gap:6px; }
.time-item{ display:flex; align-items:center; gap:8px; }
.time-box{ width:28px; height:14px; border-radius:4px; border:1px solid rgba(0,0,0,.08); flex-shrink:0; }
.time-item b{ font-size:11px; display:block; line-height:1; color:#334155; }
.time-item small{ font-size:10px; color:#64748b; }
.legend{ margin:10px; background:#111827; color:white; padding:10px 12px; border-radius:10px; font-size:11px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.legend code{ background:#1f2937; padding:3px 6px; border-radius:4px; font-size:10px; }
</style>