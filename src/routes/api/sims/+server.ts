import { json } from "@sveltejs/kit";
import { getSIMs, saveSIM } from "$lib/server/database";


export async function GET() {

    const sims = await getSIMs();

    return json(sims);

}


export async function POST({ request }) {

    const body = await request.json();

    const sim = await saveSIM(body);

    return json(sim);

}