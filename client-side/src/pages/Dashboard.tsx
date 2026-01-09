import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileText, Library, TrendingUp, Clock, PlusCircle, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [counts, setCounts] = useState({
    vocabulary: 0,
    resources: 0,
    blogs: 0,
    incomplete: 0,
    loading: true
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoadingActivity(true);
      // Fetch core counts in parallel
      const [vocabCount, resourceCount, blogCount, recentVocab, recentBlogs, recentResources] = await Promise.all([
        supabase.from('vocabulary').select('*', { count: 'exact', head: true }),
        supabase.from('resources').select('*', { count: 'exact', head: true }),
        supabase.from('blogs').select('*', { count: 'exact', head: true }),
        supabase.from('vocabulary').select('korean_word, bangla_meaning, id').order('id', { ascending: false }).limit(3),
        supabase.from('blogs').select('title, category, published_at, id').order('id', { ascending: false }).limit(3),
        supabase.from('resources').select('title, category, created_at, id').order('id', { ascending: false }).limit(3)
      ]);

      // Fetch ALL vocabulary items in chunks to calculate incomplete count accurately
      const PAGE_SIZE = 1000;
      let allVocabData: any[] = [];
      let from = 0;
      let to = PAGE_SIZE - 1;

      while (true) {
        const { data, error } = await supabase
          .from('vocabulary')
          .select('explanation, examples, part_of_speech, verb_forms')
          .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allVocabData.push(...data);
        if (data.length < PAGE_SIZE) break;

        from += PAGE_SIZE;
        to += PAGE_SIZE;
      }

      // Calculate incomplete items
      const incompleteCount = allVocabData.filter(v => {
        const noExpl = !v.explanation || v.explanation.length < 50;
        const noEx = !v.examples || (Array.isArray(v.examples) && v.examples.length === 0);
        const noVerb = v.part_of_speech === 'verb' && !v.verb_forms;
        return noExpl || noEx || noVerb;
      }).length;

      setCounts({
        vocabulary: vocabCount.count || 0,
        resources: resourceCount.count || 0,
        blogs: blogCount.count || 0,
        incomplete: incompleteCount,
        loading: false
      });

      // Combine and sort activity
      const combined = [
        ...(recentVocab.data || []).map(v => ({ ...v, type: 'vocabulary', date: new Date().toISOString() })),
        ...(recentBlogs.data || []).map(b => ({ ...b, type: 'blog', date: b.published_at || new Date().toISOString() })),
        ...(recentResources.data || []).map(r => ({ ...r, type: 'resource', date: r.created_at || new Date().toISOString() }))
      ].sort((a, b) => b.id - a.id).slice(0, 10);

      setRecentActivity(combined);
      setLoadingActivity(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setCounts(prev => ({ ...prev, loading: false }));
      setLoadingActivity(false);
    }
  }

  const stats = [
    { label: 'Total Vocabulary', value: counts.vocabulary.toLocaleString(), icon: BookOpen, color: 'bg-primary' },
    { label: 'Missing Fields', value: counts.incomplete.toLocaleString(), icon: AlertCircle, color: 'bg-destructive' },
    { label: 'Resources', value: counts.resources.toLocaleString(), icon: Library, color: 'bg-secondary' },
    { label: 'Blog Posts', value: counts.blogs.toLocaleString(), icon: FileText, color: 'bg-accent' },
  ];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          স্বাগতম! 환영합니다!
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome to Langobridge - Your Korean-Bangla Learning Bridge
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  {counts.loading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickActionButton
              label="Add Vocabulary"
              description="Add new Korean-Bangla words"
              href="/vocabulary"
            />
            <QuickActionButton
              label="Upload Resource"
              description="Upload PDFs and study materials"
              href="/resources"
            />
            <QuickActionButton
              label="Create Blog Post"
              description="Write educational content"
              href="/blogs"
            />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        item.type === 'vocabulary' ? "bg-primary" :
                          item.type === 'blog' ? "bg-accent" : "bg-secondary"
                      )} />
                      <div>
                        {item.type === 'vocabulary' ? (
                          <>
                            <p className="font-bold font-korean">{item.korean_word}</p>
                            <p className="text-xs text-muted-foreground font-bangla">{item.bangla_meaning}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold">{item.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{item.type} • {item.category?.replace('_', ' ')}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No recent activity. Start by adding vocabulary or resources!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickActionButton({ label, description, href }: { label: string; description: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <span className="text-primary font-bold">+</span>
      </div>
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}
