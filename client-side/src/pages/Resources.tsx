import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Trash2, Loader2, FileText, Download, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadImageToImgbb } from '@/lib/imgbb';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ResourceItem {
  id: number;
  title: string;
  category: string | null;
  description: string | null;
  tags: string[] | null;
  file_path: string;
  thumbnail_path: string | null;
  file_size: number | null;
  created_at: string;
}

export default function Resources() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    file_path: '',
    thumbnail_path: ''
  });

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    setLoading(true);
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let to = PAGE_SIZE - 1;

    try {
      while (true) {
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allData.push(...data);
        if (data.length < PAGE_SIZE) break;

        from += PAGE_SIZE;
        to += PAGE_SIZE;
      }
      setResources(allData);
    } catch (error: any) {
      toast({ title: 'Error fetching resources', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImageToImgbb(file);
      setFormData(prev => ({ ...prev, thumbnail_path: url }));
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
      category: null,
      description: formData.description || null,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null,
      file_path: formData.file_path,
      thumbnail_path: formData.thumbnail_path || null,
      file_size: null
    };

    if (editingItem) {
      const { error } = await supabase
        .from('resources')
        .update(payload)
        .eq('id', editingItem.id);

      if (error) {
        toast({ title: 'Error updating', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Updated successfully!' });
        fetchResources();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('resources')
        .insert([payload]);

      if (error) {
        toast({ title: 'Error adding', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Added successfully!' });
        fetchResources();
        resetForm();
      }
    }
    setSubmitting(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    setDeletingId(id);
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted successfully!' });
      fetchResources();
    }
    setDeletingId(null);
  }

  function handleEdit(item: ResourceItem) {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      tags: item.tags?.join(', ') || '',
      file_path: item.file_path,
      thumbnail_path: item.thumbnail_path || ''
    });
    setIsDialogOpen(true);
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      tags: '',
      file_path: '',
      thumbnail_path: ''
    });
    setEditingItem(null);
    setIsDialogOpen(false);
  }

  const filteredResources = resources.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const rowCount = Math.ceil(filteredResources.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated height of a resource card
    overscan: 3,
  });

  function getDownloadUrl(path: string) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `https://vysfbzcurkswmwgptbfj.supabase.co/storage/v1/object/public/resources/${path}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resources</h1>
          <p className="text-muted-foreground">Manage downloadable materials and links</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-secondary hover:bg-secondary/90">
              <Plus className="w-4 h-4 mr-2" /> Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl w-[95vw]">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="EPS Topic Self-Study Book"
                  required
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of the resource..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Download URL *</Label>
                <Input
                  value={formData.file_path}
                  onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
                  placeholder="https://drive.google.com/file/d/..."
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the direct link to the resource (Google Drive, PDF link, etc.)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Thumbnail Image</Label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 border rounded-lg bg-muted/10">
                  {formData.thumbnail_path ? (
                    <div className="relative w-24 h-24 shrink-0 rounded-md overflow-hidden border">
                      <img src={formData.thumbnail_path} alt="Preview" className="w-full h-full object-cover" />
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
                      disabled={isUploading || submitting}
                    />
                    {isUploading && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> Uploading to ImgBB...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="eps, korean, beginner"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" className="bg-secondary" disabled={submitting || isUploading}>
                  {(submitting || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingItem ? 'Update' : 'Add Resource'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-secondary" />
        </div>
      ) : filteredResources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No resources found. Add your first resource!</p>
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
                  const item = filteredResources[itemIndex];

                  if (!item) return <div key={colIndex} />;

                  return (
                    <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow group bg-card">
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="shrink-0">
                            {item.thumbnail_path ? (
                              <div className="w-16 h-16 rounded-lg overflow-hidden border bg-muted">
                                <img
                                  src={item.thumbnail_path}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-secondary/10 flex items-center justify-center">
                                <FileText className="w-8 h-8 text-secondary" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <h3 className="font-semibold text-foreground truncate text-lg group-hover:text-secondary transition-colors">
                              {item.title}
                            </h3>

                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            )}

                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.map(tag => (
                                  <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-5 justify-end pt-4 border-t border-dashed">
                          <Button size="sm" variant="outline" className="ml-auto" asChild>
                            <a href={getDownloadUrl(item.file_path)} target="_blank" rel="noopener noreferrer">
                              <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                            </a>
                          </Button>
                          <div className="flex items-center border-l pl-2 ml-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-blue-500" onClick={() => handleEdit(item)} disabled={deletingId !== null}>
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
