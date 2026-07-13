import { json } from "@sveltejs/kit";
import db from "$lib/server/db";

export async function GET(){

const reports:any[]=db.prepare(

`

SELECT values_json

FROM template_reports

`

).all();

let target=0;

let actual=0;

let reject=0;

for(const r of reports){

const v=JSON.parse(r.values_json);

target+=Number(v.target||0);

actual+=Number(v.actual||0);

reject+=Number(v.reject||0);

}

const achievement=

target==0

?0

:(actual/target*100).toFixed(1);

return json({

target,

actual,

reject,

achievement

});

}