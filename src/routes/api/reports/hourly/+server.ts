import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

export async function GET(){

const reports:any[]=db.prepare(

`SELECT values_json FROM template_reports`

).all();

const hours:any={};

for(const r of reports){

const v=JSON.parse(r.values_json);

const hour=v.hour;

if(!hour) continue;

if(!hours[hour]){

hours[hour]=0;

}

hours[hour]+=Number(v.actual||0);

}

return json(

Object.keys(hours)

.sort()

.map(h=>({

hour:h,

actual:hours[h]

}))

);

}