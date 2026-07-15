import { prisma } from '$lib/db.server'
import { fail, json } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
  saveTemplate: async ({ request }) => {
    console.log("3. SERVER ACTION CALLED")
    const data = await request.formData()
    console.log("4. DATA:", Object.fromEntries(data))

    try {
      const result = await prisma.templates.create({
        data: {
          name: data.get('name') as string,
          department: data.get('department') as string || null,
          chart: null,
          chart_x: data.get('chart_x') as string || null,
          chart_y: data.get('chart_y') as string || null,
          description: data.get('description') as string || null,
          created_by: data.get('created_by') as string || null, 
          fields: JSON.parse(data.get('fields') as string || '[]'),
        }
      })
      console.log("5. DB SUCCESS")
      return json({ success: true, data: result })
    } catch (e: any) {
      console.error("6. DB ERROR:", e)
      return fail(500, { error: e.message })
    }
  }
}