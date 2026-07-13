import { writable } from "svelte/store";

import {

getProduction,

addProduction,

deleteProduction

} from "$lib/services/productionDatabase";

export const production=writable<any[]>([]);

export async function refreshProduction(){

const data=await getProduction();

production.set(data);

}

export async function saveProduction(data:any){

await addProduction(data);

await refreshProduction();

}

export async function removeProduction(id:number){

await deleteProduction(id);

await refreshProduction();

}