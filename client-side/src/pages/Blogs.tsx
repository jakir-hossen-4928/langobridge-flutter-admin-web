import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, Loader2, Eye, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { blogCategories } from '@/lib/blogCategories';
import { uploadImageToImgbb } from '@/lib/imgbb';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVirtualizer } from '@tanstack/react-virtual';

interface BlogItem {
  id: number;
  title: string;
  slug: string;
  content: string;
  thumbnail_url: string | null;
  category: string | null;
  tags: string[] | null;
  published_at: string;
  view_count: number;
}

export default function Blogs() {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BlogItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    thumbnail_url: '',
    category: '',
    tags: ''
  });

  useEffect(() => {
    fetchBlogs();
  }, []);

  async function fetchBlogs() {
    setLoading(true);
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let to = PAGE_SIZE - 1;

    try {
      while (true) {
        const { data, error } = await supabase
          .from('blogs')
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
      setBlogs(allData);
    } catch (error: any) {
      toast({ title: 'Error fetching blogs', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function formatCategory(cat: string) {
    return cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImageToImgbb(file);
      setFormData(prev => ({ ...prev, thumbnail_url: url }));
      toast({ title: 'Image uploaded successfully' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Upload failed', description: 'Could not upload image to ImgBB', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      title: formData.title,
      slug: formData.slug || generateSlug(formData.title),
      content: formData.content,
      thumbnail_url: formData.thumbnail_url || null,
      category: formData.category || null,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null
    };

    if (editingItem) {
      const { error } = await supabase
        .from('blogs')
        .update(payload)
        .eq('id', editingItem.id);

      if (error) {
        toast({ title: 'Error updating', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Updated successfully!' });
        fetchBlogs();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('blogs')
        .insert([payload]);

      if (error) {
        toast({ title: 'Error adding', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Published successfully!' });
        fetchBlogs();
        resetForm();
      }
    }
    setSubmitting(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    setDeletingId(id);
    const { error } = await supabase
      .from('blogs')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted successfully!' });
      fetchBlogs();
    }
    setDeletingId(null);
  }

  function handleEdit(item: BlogItem) {
    setEditingItem(item);
    setFormData({
      title: item.title,
      slug: item.slug,
      content: item.content,
      thumbnail_url: item.thumbnail_url || '',
      category: item.category || '',
      tags: item.tags?.join(', ') || ''
    });
    setIsDialogOpen(true);
  }

  function resetForm() {
    setFormData({
      title: '',
      slug: '',
      content: '',
      thumbnail_url: '',
      category: '',
      tags: ''
    });
    setEditingItem(null);
    setIsDialogOpen(false);
  }

  const filteredBlogs = blogs.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Virtualization logic
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1024) setColumns(3);
      else if (width >= 768) setColumns(2);
      else setColumns(1);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const rowCount = Math.ceil(filteredBlogs.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // Estimated height of a blog card
    overscan: 3,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Blog Posts</h1>
          <p className="text-muted-foreground">Manage educational blog content</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90">
              <Plus className="w-4 h-4 mr-2" /> New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto w-[98vw]">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Post' : 'Create New Post'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="How to Master Korean Particles"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {blogCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                              {formatCategory(cat)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Slug</Label>
                      <Input
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="Auto-generated"
                        className="bg-muted/50"
                      />
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label>Thumbnail Image</Label>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 border rounded-lg bg-muted/10">
                      {formData.thumbnail_url ? (
                        <div className="relative w-24 h-24 shrink-0 rounded-md overflow-hidden border">
                          <img src={formData.thumbnail_url} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 shrink-0 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="space-y-2 flex-1 w-full">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                        {isUploading && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="korean, grammar, beginner"
                    />
                  </div>
                </div>

                {/* Content Editor with Preview */}
                <div className="flex flex-col h-full">
                  <Label className="mb-2">Content * (Markdown)</Label>
                  <Tabs defaultValue="write" className="w-full h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="write">Write</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    <TabsContent value="write" className="flex-1 mt-2">
                      <Textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Write your blog content here... Supports Markdown."
                        className="min-h-[400px] font-mono text-sm h-full"
                        required
                      />
                    </TabsContent>
                    <TabsContent value="preview" className="flex-1 mt-2">
                      <div className="border rounded-md p-4 min-h-[400px] h-full bg-muted/10 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
                        {formData.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.content}</ReactMarkdown>
                        ) : (
                          <div className="text-muted-foreground flex items-center justify-center h-full">
                            Nothing to preview
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm} disabled={submitting || isUploading}>Cancel</Button>
                <Button type="submit" className="bg-accent" disabled={submitting || isUploading}>
                  {(submitting || isUploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingItem ? 'Update' : 'Publish')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search blog posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid Layout */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : filteredBlogs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No blog posts found. Create your first post!</p>
          </CardContent>
        </Card>
      ) : (
        <div
          ref={parentRef}
          className="h-[calc(100vh-250px)] overflow-auto bg-background/50 rounded-xl border p-4"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.index}
                className="grid gap-6 mb-6"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: columns }).map((_, colIndex) => {
                  const itemIndex = virtualRow.index * columns + colIndex;
                  const item = filteredBlogs[itemIndex];

                  if (!item) return <div key={colIndex} />;

                  return (
                    <Card key={item.id} className="group border-0 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden bg-card">
                      <div className="relative h-48 w-full overflow-hidden bg-muted/20">
                        {item.thumbnail_url ? (
                          <img
                            src={item.thumbnail_url}
                            alt={item.title}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <ImageIcon className="w-12 h-12" />
                          </div>
                        )}
                        {item.category && (
                          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-foreground shadow-sm">
                            {formatCategory(item.category)}
                          </div>
                        )}
                      </div>
                      <CardContent className="flex-1 p-5 flex flex-col">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-foreground line-clamp-2 leading-tight mb-2 group-hover:text-accent transition-colors">
                            {item.title}
                          </h3>
                        </div>

                        <div className="pt-4 border-t mt-auto flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span>{new Date(item.published_at).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" /> {item.view_count}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-accent" onClick={() => handleEdit(item)} disabled={deletingId !== null}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive text-destructive/70" onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}>
                              {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
