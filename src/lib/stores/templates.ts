import { writable } from "svelte/store";

import {
    getTemplates,
    saveTemplate,
    deleteTemplate
} from "$lib/services/templateDatabase";

export const templates = writable<any[]>([]);

export async function refreshTemplates(){

    const data=await getTemplates();

    templates.set(data);

}

export async function addTemplate(template:any){

    await saveTemplate(template);

    await refreshTemplates();

}

export async function removeTemplate(id:number){

    await deleteTemplate(id);

    await refreshTemplates();

}