import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Edit, Trash2, Loader2, X, PlusCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { themeVocabularies } from '@/lib/themeVocabularies';
import { partsOfSpeech } from '@/lib/partsOfSpeech';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VocabularyExample {
  korean: string;
  bangla: string;
}

interface VerbForms {
  present: string;
  past: string;
  future: string;
  polite: string;
}

interface VocabularyItem {
  id: number;
  korean_word: string;
  bangla_meaning: string;
  romanization: string | null;
  part_of_speech: string | null;
  explanation: string;
  examples: VocabularyExample[];
  themes: string[] | null;
  chapters: number[] | null;
  verb_forms: VerbForms | null;
}

export default function Vocabulary() {
  const navigate = useNavigate();
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  // Form State
  const [koreanWord, setKoreanWord] = useState('');
  const [banglaMeaning, setBanglaMeaning] = useState('');
  const [romanization, setRomanization] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [explanation, setExplanation] = useState('');
  const [examples, setExamples] = useState<VocabularyExample[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [chapters, setChapters] = useState('');
  const [verbForms, setVerbForms] = useState<VerbForms>({
    present: '',
    past: '',
    future: '',
    polite: ''
  });

  useEffect(() => {
    fetchVocabulary();
  }, []);

  async function fetchVocabulary() {
    setLoading(true);
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let to = PAGE_SIZE - 1;

    try {
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
      setVocabulary(allData);
    } catch (error: any) {
      toast({ title: 'Error fetching vocabulary', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  }

  function handleAddExample() {
    setExamples([...examples, { korean: '', bangla: '' }]);
  }

  function handleExampleChange(index: number, field: keyof VocabularyExample, value: string) {
    const newExamples = [...examples];
    newExamples[index] = { ...newExamples[index], [field]: value };
    setExamples(newExamples);
  }

  function handleRemoveExample(index: number) {
    setExamples(examples.filter((_, i) => i !== index));
  }

  function toggleTheme(theme: string) {
    setSelectedThemes(prev =>
      prev.includes(theme)
        ? prev.filter(t => t !== theme)
        : [...prev, theme]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      korean_word: koreanWord,
      bangla_meaning: banglaMeaning,
      romanization: romanization || null,
      part_of_speech: partOfSpeech || null,
      explanation: explanation,
      examples: examples.filter(ex => ex.korean.trim() !== ''), // Filter empty examples
      themes: selectedThemes.length > 0 ? selectedThemes : null,
      chapters: chapters ? chapters.split(',').map(c => {
        const parsed = parseInt(c.trim());
        return isNaN(parsed) ? null : parsed;
      }).filter(Boolean) : null,
      verb_forms: partOfSpeech === 'verb' ? verbForms : null
    };

    if (editingItem) {
      const { error } = await supabase
        .from('vocabulary')
        .update(payload)
        .eq('id', editingItem.id);

      if (error) {
        toast({ title: 'Error updating', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Updated successfully!' });
        fetchVocabulary();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('vocabulary')
        .insert([payload]);

      if (error) {
        toast({ title: 'Error adding', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Added successfully!' });
        fetchVocabulary();
        resetForm();
      }
    }
    setSubmitting(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this word?')) return;

    setDeletingId(id);
    const { error } = await supabase
      .from('vocabulary')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted successfully!' });
      fetchVocabulary();
    }
    setDeletingId(null);
  }

  function handleEdit(item: VocabularyItem) {
    setEditingItem(item);
    setKoreanWord(item.korean_word);
    setBanglaMeaning(item.bangla_meaning);
    setRomanization(item.romanization || '');
    setPartOfSpeech(item.part_of_speech || '');
    setExplanation(item.explanation);
    setExamples(Array.isArray(item.examples) ? item.examples : []);
    setSelectedThemes(item.themes || []);
    setChapters(item.chapters?.join(', ') || '');
    setVerbForms(item.verb_forms || {
      present: '',
      past: '',
      future: '',
      polite: ''
    });
    setIsDialogOpen(true);
  }

  function resetForm() {
    setKoreanWord('');
    setBanglaMeaning('');
    setRomanization('');
    setPartOfSpeech('');
    setExplanation('');
    setExamples([]);
    setSelectedThemes([]);
    setChapters('');
    setVerbForms({
      present: '',
      past: '',
      future: '',
      polite: ''
    });
    setEditingItem(null);
    setIsDialogOpen(false);
  }

  const filteredVocabulary = vocabulary.filter(item =>
    item.korean_word.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.bangla_meaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.romanization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Virtualization logic
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredVocabulary.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Row height
    overscan: 10,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vocabulary</h1>
          <p className="text-muted-foreground">Manage Korean-Bangla vocabulary database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/bulk-upload')}>
            <Upload className="w-4 h-4 mr-2" /> Bulk Import
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" /> Add Word
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Vocabulary' : 'Add New Vocabulary'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Basic Info */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Korean Word *</Label>
                        <Input
                          value={koreanWord}
                          onChange={(e) => setKoreanWord(e.target.value)}
                          placeholder="가다"
                          required
                          className="font-korean text-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bangla Meaning *</Label>
                        <Input
                          value={banglaMeaning}
                          onChange={(e) => setBanglaMeaning(e.target.value)}
                          placeholder="যাওয়া"
                          required
                          className="font-bangla text-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Romanization</Label>
                        <Input
                          value={romanization}
                          onChange={(e) => setRomanization(e.target.value)}
                          placeholder="gada"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Part of Speech</Label>
                        <Select value={partOfSpeech} onValueChange={setPartOfSpeech}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {partsOfSpeech.map(pos => (
                              <SelectItem key={pos.key} value={pos.key}>
                                {pos.korean} ({pos.key})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Explanation</Label>
                      <Textarea
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder="Usage notes or detailed meaning..."
                        rows={3}
                        className="font-bangla"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Chapters (comma-separated)</Label>
                      <Input
                        value={chapters}
                        onChange={(e) => setChapters(e.target.value)}
                        placeholder="1, 5"
                      />
                    </div>

                    {partOfSpeech === 'verb' && (
                      <div className="p-4 border rounded-xl bg-orange-50/50 dark:bg-orange-950/10 space-y-4">
                        <h4 className="font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                          <PlusCircle className="w-4 h-4" /> Verb Forms
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Present (아요/어요)</Label>
                            <Input
                              value={verbForms.present}
                              onChange={(e) => setVerbForms({ ...verbForms, present: e.target.value })}
                              placeholder="가요"
                              className="h-9 text-sm font-korean"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Past (았어요/었어요)</Label>
                            <Input
                              value={verbForms.past}
                              onChange={(e) => setVerbForms({ ...verbForms, past: e.target.value })}
                              placeholder="갔어요"
                              className="h-9 text-sm font-korean"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Future (ㄹ 거예요)</Label>
                            <Input
                              value={verbForms.future}
                              onChange={(e) => setVerbForms({ ...verbForms, future: e.target.value })}
                              placeholder="갈 거예요"
                              className="h-9 text-sm font-korean"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Formal Polite (습니다)</Label>
                            <Input
                              value={verbForms.polite}
                              onChange={(e) => setVerbForms({ ...verbForms, polite: e.target.value })}
                              placeholder="갑니다"
                              className="h-9 text-sm font-korean"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Examples & Themes */}
                  <div className="space-y-6">
                    {/* Theme Selection */}
                    <div className="space-y-2">
                      <Label>Themes</Label>
                      <Card className="border shadow-none">
                        <CardContent className="p-0">
                          <ScrollArea className="h-[200px] p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {themeVocabularies.map(theme => (
                                <div key={theme} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`theme-${theme}`}
                                    checked={selectedThemes.includes(theme)}
                                    onCheckedChange={() => toggleTheme(theme)}
                                  />
                                  <label
                                    htmlFor={`theme-${theme}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer capitalize"
                                  >
                                    {theme.replace('_', ' ')}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                      <div className="flex flex-wrap gap-1 min-h-[24px]">
                        {selectedThemes.map(theme => (
                          <Badge key={theme} variant="secondary" className="text-xs">
                            {theme.replace('_', ' ')}
                            <button
                              type="button"
                              onClick={() => toggleTheme(theme)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Examples */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Examples</Label>
                        <Button type="button" variant="outline" size="sm" onClick={handleAddExample}>
                          <PlusCircle className="w-4 h-4 mr-1" /> Add Example
                        </Button>
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {examples.map((ex, idx) => (
                          <div key={idx} className="flex gap-2 items-start bg-muted/20 p-2 rounded-md border">
                            <div className="grid gap-2 flex-1">
                              <Input
                                placeholder="Korean Example"
                                value={ex.korean}
                                onChange={(e) => handleExampleChange(idx, 'korean', e.target.value)}
                                className="h-8 text-sm font-korean"
                              />
                              <Input
                                placeholder="Bangla Translation"
                                value={ex.bangla}
                                onChange={(e) => handleExampleChange(idx, 'bangla', e.target.value)}
                                className="h-8 text-sm font-bangla"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 h-8 w-8 mt-1"
                              onClick={() => handleRemoveExample(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        {examples.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md">
                            No examples added yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>Cancel</Button>
                  <Button type="submit" className="bg-primary min-w-[100px]" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingItem ? 'Update' : 'Save Word')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* List */}
      <div className="flex items-center justify-between gap-4 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vocabulary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 shadow-sm"
          />
        </div>
        {!loading && (
          <div className="text-sm text-muted-foreground font-medium bg-muted/30 px-3 py-2 rounded-lg border border-border/50">
            {searchQuery ? (
              <p>Found <span className="text-primary font-bold">{filteredVocabulary.length}</span> results</p>
            ) : (
              <p>Total <span className="text-primary font-bold">{vocabulary.length}</span> items</p>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredVocabulary.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No vocabulary found. Start adding words!</p>
          </CardContent>
        </Card>
      ) : (
        <div
          ref={parentRef}
          className="h-[calc(100vh-250px)] overflow-auto rounded-xl border bg-card shadow-sm"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {/* Table Header */}
            <div className="sticky top-0 z-20 bg-muted/95 backdrop-blur-md border-b flex items-center px-4 h-12 font-bold text-[11px] uppercase tracking-wider text-muted-foreground shadow-sm">
              <div className="w-12 px-2 text-center">No.</div>
              <div className="flex-[1.5] px-4">Korean</div>
              <div className="flex-[1.5] px-4">Bangla</div>
              <div className="flex-1 px-4">Romanization</div>
              <div className="flex-1 px-4">Type</div>
              <div className="flex-1 px-4">Themes</div>
              <div className="w-28 px-4 text-right">Actions</div>
            </div>

            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = filteredVocabulary[virtualRow.index];
              if (!item) return null;
              const rowStart = virtualRow.start + 48; // Account for header

              return (
                <div
                  key={virtualRow.index}
                  className="group flex hover:bg-primary/[0.02] transition-colors border-b last:border-0 items-center px-4"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${rowStart}px)`,
                  }}
                >
                  <div className="w-12 px-2 text-center text-[10px] font-mono font-bold text-muted-foreground/60">{virtualRow.index + 1}</div>
                  <div className="flex-[1.5] px-4">
                    <div className="font-korean font-bold text-primary text-lg truncate" title={item.korean_word}>{item.korean_word}</div>
                  </div>
                  <div className="flex-[1.5] px-4">
                    <div className="font-bangla font-semibold text-foreground truncate" title={item.bangla_meaning}>{item.bangla_meaning}</div>
                  </div>
                  <div className="flex-1 px-4">
                    <div className="text-sm text-muted-foreground font-medium truncate" title={item.romanization || ''}>{item.romanization || '-'}</div>
                  </div>
                  <div className="flex-1 px-4">
                    {item.part_of_speech && (
                      <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 uppercase font-black tracking-tighter whitespace-nowrap">
                        {partsOfSpeech.find(p => p.key === item.part_of_speech)?.korean || item.part_of_speech}
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 px-4 flex flex-wrap gap-1">
                    {item.themes?.slice(0, 1).map(theme => (
                      <span key={theme} className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-bold capitalize border border-muted-foreground/10 whitespace-nowrap shadow-sm">
                        {theme.replace('_', ' ')}
                      </span>
                    ))}
                    {item.themes && item.themes.length > 1 && (
                      <Badge variant="secondary" className="text-[9px] px-1 h-4 rounded-full font-black">+{item.themes.length - 1}</Badge>
                    )}
                  </div>
                  <div className="w-28 px-4 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all duration-200" onClick={() => handleEdit(item)} disabled={deletingId !== null}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200" onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}>
                      {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin text-destructive" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
