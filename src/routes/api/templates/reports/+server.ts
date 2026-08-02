import { json } from '@sveltejs/kit';
import { supabaseTemplates } from '$lib/supabase';


export async function GET({ url, request }) {
    try {
        const date = url.searchParams.get('date');

        if (!date) {
            return json(
                { error: 'date param required' },
                { status: 400 }
            );
        }


        // Get user JWT
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return json(
                { error: 'No auth' },
                { status: 401 }
            );
        }


        if (!supabaseTemplates) {
            return json(
                { error: 'Supabase templates client not configured' },
                { status: 500 }
            );
        }


        const { data, error } = await supabaseTemplates
            .from('template_reports')
            .select('*')
            .gte(
                'created_at',
                `${date}T00:00:00Z`
            )
            .lte(
                'created_at',
                `${date}T23:59:59Z`
            )
            .order(
                'created_at',
                {
                    ascending: false
                }
            );


        if (error) {
            console.error(
                'Supabase error:',
                error
            );

            return json(
                {
                    error: error.message
                },
                {
                    status: 500
                }
            );
        }


        return json(data ?? []);


    } catch (e: any) {

        console.error(
            'Route error:',
            e
        );

        return json(
            {
                error: e.message
            },
            {
                status: 500
            }
        );
    }
}