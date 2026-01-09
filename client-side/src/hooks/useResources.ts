import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useResourcesSimple() {
    return useQuery({
        queryKey: ['resources-simple'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('resources')
                .select('id, title');

            if (error) throw error;
            return data || [];
        }
    });
}
