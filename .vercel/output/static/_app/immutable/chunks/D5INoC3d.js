const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./DJt1u_Mn.js","./DlQNAQKj.js","./9j4Ql2Nz.js"])))=>i.map(i=>d[i]);
import{w as _}from"./C_oJtr07.js";import{_ as m}from"./Ct5FWWRu.js";import{s as f}from"./BRvy-Df5.js";function p(){return!!window.__TAURI__}let n=null;async function u(){if(n)return n;if(typeof window>"u"||!p())return null;try{const{default:e}=await m(async()=>{const{default:i}=await import("./DJt1u_Mn.js");return{default:i}},__vite__mapDeps([0,1]),import.meta.url);let t="sqlite:meeting.db";try{const{appDataDir:i}=await m(async()=>{const{appDataDir:E}=await import("./9j4Ql2Nz.js");return{appDataDir:E}},__vite__mapDeps([2,1]),import.meta.url);t=`sqlite:${await i()}meeting.db`}catch{console.warn("[DB] Using default database path")}n=await e.load(t),await n.execute("PRAGMA foreign_keys = ON"),await n.execute(`
            CREATE TABLE IF NOT EXISTS meetings(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                meeting_type TEXT,
                meeting_date TEXT,
                start_time TEXT,
                end_time TEXT,
                location TEXT,
                organizer TEXT,
                agenda TEXT,
                status TEXT DEFAULT 'Scheduled',
                priority TEXT DEFAULT 'Medium',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `),await n.execute(`
            CREATE TABLE IF NOT EXISTS templates(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                department TEXT,
                chart TEXT,
                chart_x TEXT,
                chart_y TEXT,
                fields TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `),await n.execute(`
            CREATE TABLE IF NOT EXISTS meeting_actions(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER,
                meeting_title TEXT,
                description TEXT NOT NULL,
                owner TEXT,
                due_date TEXT,
                status TEXT DEFAULT 'Open',
                priority TEXT DEFAULT 'Medium',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(meeting_id)
                    REFERENCES meetings(id)
                    ON DELETE CASCADE
            )
        `),await n.execute(`
            CREATE TABLE IF NOT EXISTS machine_downtime(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_name TEXT NOT NULL,
                reason TEXT,
                category TEXT,
                start_time TEXT,
                end_time TEXT,
                duration_minutes INTEGER,
                report_date TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);const a=n.execute.bind(n);return n.execute=async(i,o)=>{const E=await a(i,o),s=i.toLowerCase();return s.includes("meetings")&&/(insert|update|delete)/i.test(s)&&window.dispatchEvent(new CustomEvent("meetings:updated")),s.includes("templates")&&/(insert|update|delete)/i.test(s)&&window.dispatchEvent(new CustomEvent("templates:updated")),s.includes("meeting_actions")&&/(insert|update|delete)/i.test(s)&&window.dispatchEvent(new CustomEvent("actions:updated")),s.includes("machine_downtime")&&/(insert|update|delete)/i.test(s)&&window.dispatchEvent(new CustomEvent("downtime:updated")),E},n}catch(e){throw console.error("[DB] Init failed:",e),e}}async function w(){const e=await u();if(!e)return[];try{return await e.select("SELECT * FROM meetings ORDER BY meeting_date DESC, start_time DESC")}catch(t){return console.error("[DB] getMeetings failed:",t),[]}}async function T(e){const t=await u();if(!t)return null;try{return(await t.select("SELECT * FROM meetings WHERE id=?",[e]))[0]||null}catch(a){return console.error("[DB] getMeeting failed:",a),null}}async function d(e){const t=await u();if(!t)return!1;try{return e.id?await t.execute("UPDATE meetings SET title=?, meeting_type=?, meeting_date=?, start_time=?, end_time=?, location=?, organizer=?, agenda=?, status=?, priority=? WHERE id=?",[e.title,e.meeting_type,e.meeting_date,e.start_time,e.end_time,e.location,e.organizer,e.agenda,e.status||"Scheduled",e.priority||"Medium",e.id]):await t.execute("INSERT INTO meetings (title, meeting_type, meeting_date, start_time, end_time, location, organizer, agenda, status, priority) VALUES (?,?,?,?,?,?)",[e.title,e.meeting_type,e.meeting_date,e.start_time,e.end_time,e.location,e.organizer,e.agenda,e.status||"Scheduled",e.priority||"Medium"]),window.dispatchEvent(new CustomEvent("meetings:updated")),!0}catch(a){return console.error("[DB] saveMeeting failed:",a),!1}}async function R(e){const t=await u();if(!t)return!1;try{return await t.execute("DELETE FROM meetings WHERE id=?",[e]),window.dispatchEvent(new CustomEvent("meetings:updated")),!0}catch(a){return console.error("[DB] deleteMeeting failed:",a),!1}}const l=_([]),g=_(!1),c=f;async function r(){g.set(!0);try{const{data:e,error:t}=await c.from("meetings").select("*").order("meeting_date",{ascending:!1}).order("id",{ascending:!1});if(!t&&e&&e.length>0)return l.set(e),e.forEach(i=>d(i).catch(()=>{})),e;const a=await w();return l.set(a||[]),a||[]}catch(e){console.error("refreshMeetings",e);const t=await w().catch(()=>[]);return l.set(t||[]),t||[]}finally{g.set(!1)}}async function N(e){try{const{data:t,error:a}=await c.from("meetings").insert(e).select().single();if(a)throw a;return await d(t),await r(),t}catch(t){console.warn("supabase insert failed, local fallback",t);const a=await d(e);return await r(),a}}async function A(e,t){const a=Number(e);try{const{data:i,error:o}=await c.from("meetings").update({...t,updated_at:new Date().toISOString()}).eq("id",a).select().single();if(o)throw o;return await d(i),await r(),i}catch(i){console.warn("supabase update failed, local fallback",i);const o={id:a,...t,updated_at:new Date().toISOString()},E=await d(o);return await r(),E}}async function h(e){const t=Number(e);try{await c.from("meetings").delete().eq("id",t)}catch{}return await R(t),await r(),!0}async function X(e){const t=Number(e);try{let{data:a}=await c.from("meetings").select("*").eq("id",t).maybeSingle();if(a)return a;const{data:i}=await c.from("meetings").select("*").eq("id",e).maybeSingle();return i||await T(t)||await T(e)}catch{return await T(t)||await T(e)}}window.addEventListener("meetings:updated",()=>r()),window.addEventListener("focus",()=>r()),window.addEventListener("storage",e=>{e.key==="meetings_updated"&&r()}),r();export{N as a,h as b,X as g,l as m,r,A as u};
