import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Vocabulary } from '@/types/vocabulary';

export function useVocabularies() {
    return useQuery({
        queryKey: ['vocabularies'],
        queryFn: async () => {
            const PAGE_SIZE = 1000;
            let allData: any[] = [];
            let from = 0;
            let to = PAGE_SIZE - 1;

            while (true) {
                const { data, error } = await supabase
                    .from('vocabulary')
                    .select('*')
                    .order('id', { ascending: false })
                    .range(from, to);

                if (error) throw error;
                if (!data || data.length === 0) break;

                allData.push(...data);
                if (data.length < PAGE_SIZE) break;

                from += PAGE_SIZE;
                to += PAGE_SIZE;
            }

            return allData.map(item => ({
                ...item,
                id: String(item.id)
            })) as Vocabulary[];
        }
    });
}

export function useVocabularyMutations() {
    const queryClient = useQueryClient();

    const updateVocabulary = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Vocabulary> }) => {
            const { data: updated, error } = await supabase
                .from('vocabulary')
                .update(data)
                .eq('id', parseInt(id))
                .select()
                .single();

            if (error) throw error;
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vocabularies'] });
        }
    });

    return { updateVocabulary };
}
