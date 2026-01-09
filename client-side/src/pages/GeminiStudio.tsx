import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useVocabularies } from "@/hooks/useVocabularies";
import { supabase } from "@/integrations/supabase/client";
import { Vocabulary } from "@/types/vocabulary";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    ArrowLeft,
    Wand2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Search,
    Filter,
    Layers,
    Bot,
    Save,
    Trash2,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { partsOfSpeech } from "@/lib/partsOfSpeech";
import { cn } from "@/lib/utils";

interface EnhancementResult {
    id: string;
    korean_word: string;
    status: "pending" | "processing" | "success" | "error";
    error?: string;
}

type FilterType = "all" | "missing-all-fields" | "missing-romanization" | "missing-pos" | "missing-explanation" | "missing-examples" | "missing-themes" | "missing-chapters" | "missing-verb" | "missing-id";

export default function GeminiStudio() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: vocabularies = [], isLoading } = useVocabularies();

    const API_BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
    // const API_BASE_URL = "http://localhost:3000";

    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [filterPos, setFilterPos] = useState<string>("all");
    const [selectedVocabs, setSelectedVocabs] = useState<Set<string>>(new Set());
    const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(["all"]));
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<EnhancementResult[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [previewVocab, setPreviewVocab] = useState<Vocabulary | null>(null);
    const [enhancedData, setEnhancedData] = useState<Partial<Vocabulary> | null>(null);
    const [isApplying, setIsApplying] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [results]);

    const hasMissingFields = useCallback((vocab: Vocabulary) => {
        const isVerb = vocab.part_of_speech === "verb";
        const noVerbForms = isVerb ? !vocab.verb_forms : false;
        const noExamples = !vocab.examples || vocab.examples.length === 0;
        const noExplanation = !vocab.explanation || (vocab.explanation && vocab.explanation.length < 50);
        const noRomanization = !vocab.romanization;
        const noPos = !vocab.part_of_speech;
        const noThemes = !vocab.themes || vocab.themes.length === 0;

        return noVerbForms || noExamples || noExplanation || noRomanization || noPos || noThemes;
    }, []);

    const filterVocabularies = () => {
        let filtered = vocabularies;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(v =>
                v.korean_word?.toLowerCase().includes(query) ||
                v.bangla_meaning?.toLowerCase().includes(query)
            );
        }

        if (filterPos !== "all") {
            filtered = filtered.filter(v => v.part_of_speech === filterPos);
        }

        if (filterType === "missing-verb") {
            filtered = filtered.filter(v => v.part_of_speech === "verb" && !v.verb_forms);
        } else if (filterType === "missing-examples") {
            filtered = filtered.filter(v => !v.examples || v.examples.length === 0);
        } else if (filterType === "missing-explanation") {
            filtered = filtered.filter(v => !v.explanation || v.explanation.length < 50);
        } else if (filterType === "missing-romanization") {
            filtered = filtered.filter(v => !v.romanization);
        } else if (filterType === "missing-id") {
            // Added for debugging if needed, but not in UI
            filtered = filtered.filter(v => !v.id || v.id === "NaN");
        } else if (filterType === "missing-pos") {
            filtered = filtered.filter(v => !v.part_of_speech);
        } else if (filterType === "missing-themes") {
            filtered = filtered.filter(v => !v.themes || v.themes.length === 0);
        } else if (filterType === "missing-all-fields") {
            filtered = filtered.filter(v => hasMissingFields(v));
        } else if (filterType === "all") {
            filtered = filtered.filter(v => hasMissingFields(v));
        }

        return filtered;
    };

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedVocabs);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedVocabs(newSelection);
    };

    const selectAll = () => {
        const filtered = filterVocabularies();
        setSelectedVocabs(new Set(filtered.map(v => v.id)));
    };

    const clearSelection = () => setSelectedVocabs(new Set());

    const handleEnhanceSelected = async () => {
        if (selectedVocabs.size === 0) {
            toast.error("Please select vocabularies to enhance");
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        const selected = vocabularies.filter(v => selectedVocabs.has(v.id));
        setResults(selected.map(v => ({ id: v.id, korean_word: v.korean_word, status: "pending" })));

        const masterToastId = toast.loading(`Enhancing ${selected.length} items...`, {
            description: `Starting bulk enhancement...`,
        });

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < selected.length; i++) {
            const vocab = selected[i];
            setResults(prev => prev.map(r => r.id === vocab.id ? { ...r, status: "processing" } : r));

            setProgress(((i) / selected.length) * 100);
            toast.message(`Processing: ${vocab.korean_word}`, {
                id: masterToastId,
                description: `Item ${i + 1} of ${selected.length} (${Math.round((i / selected.length) * 100)}%)`,
            });

            try {
                const fieldsToEnhance = selectedFields.has("all") ? undefined : Array.from(selectedFields);
                const localApiKey = localStorage.getItem('gemini_api_key');

                const response = await fetch(`${API_BASE_URL}/gemini/enhance`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(localApiKey && { "x-gemini-api-key": localApiKey })
                    },
                    body: JSON.stringify({ vocabulary: vocab, fields: fieldsToEnhance })
                });

                if (!response.ok) throw new Error("Enhancement failed");

                const result = await response.json();
                let enhanced = result.data;

                if (typeof enhanced === 'string') {
                    const cleaned = enhanced.replace(/```json/g, "").replace(/```/g, "").trim();
                    enhanced = JSON.parse(cleaned);
                }

                const finalData = Array.isArray(enhanced) ? enhanced[0] : enhanced;

                const { error: updateError } = await supabase
                    .from('vocabulary')
                    .update(finalData)
                    .eq('id', vocab.id);

                if (updateError) throw updateError;

                setResults(prev => prev.map(r => r.id === vocab.id ? { ...r, status: "success" } : r));
                successCount++;

                toast.success(`Enhanced: ${vocab.korean_word}`, {
                    duration: 2000,
                });
            } catch (error) {
                console.error(`Error enhancing ${vocab.korean_word}:`, error);
                setResults(prev => prev.map(r => r.id === vocab.id ? { ...r, status: "error", error: "Failed" } : r));
                errorCount++;

                toast.error(`Failed: ${vocab.korean_word}`, {
                    description: error instanceof Error ? error.message : "Unknown error",
                    duration: 4000,
                });
            }

            setProgress(((i + 1) / selected.length) * 100);

            if (i < selected.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        setIsProcessing(false);
        queryClient.invalidateQueries({ queryKey: ['vocabularies'] });

        toast.success("Bulk Enhancement Complete", {
            id: masterToastId,
            description: `Successfully enhanced ${successCount} items. ${errorCount > 0 ? `${errorCount} failed.` : ""}`,
            duration: 5000,
        });
    };

    const handlePreviewEnhancement = async (vocab: Vocabulary) => {
        setPreviewVocab(vocab);
        setEnhancedData(null);
        setShowPreview(true);

        try {
            const fieldsToEnhance = selectedFields.has("all") ? undefined : Array.from(selectedFields);
            const localApiKey = localStorage.getItem('gemini_api_key');

            const response = await fetch(`${API_BASE_URL}/gemini/enhance`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(localApiKey && { "x-gemini-api-key": localApiKey })
                },
                body: JSON.stringify({ vocabulary: vocab, fields: fieldsToEnhance })
            });

            if (!response.ok) throw new Error("Preview generation failed");
            const result = await response.json();
            let enhanced = result.data;
            if (typeof enhanced === 'string') {
                const cleaned = enhanced.replace(/```json/g, "").replace(/```/g, "").trim();
                enhanced = JSON.parse(cleaned);
            }
            setEnhancedData(Array.isArray(enhanced) ? enhanced[0] : enhanced);
        } catch (error) {
            console.error("Error generating preview:", error);
            toast.error("Failed to generate preview");
            setShowPreview(false);
        }
    };

    const handleApplyPreview = async () => {
        if (!previewVocab || !enhancedData) return;
        setIsApplying(true);
        try {
            // DIRECT UPDATE BYPASSING BROKEN HOOK
            const { error: updateError } = await supabase
                .from('vocabulary')
                .update(enhancedData)
                .eq('id', previewVocab.id);

            if (updateError) throw updateError;

            queryClient.invalidateQueries({ queryKey: ['vocabularies'] });
            toast.success("Vocabulary enhanced successfully!");
            setShowPreview(false);
        } catch (error) {
            console.error("Error applying enhancement:", error);
            toast.error("Failed to apply enhancement");
        } finally {
            setIsApplying(false);
        }
    };

    const filteredVocabs = filterVocabularies();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 p-6 lg:p-10 font-sans">
            {/* Header */}
            <header className="max-w-[1600px] mx-auto mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-white border-slate-200">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Bot className="h-6 w-6 text-primary" />
                            Gemini Studio
                        </h1>
                        <p className="text-xs font-medium text-slate-500 font-medium">Bulk Intelligence Alignment</p>
                    </div>
                </div>
                {isProcessing && (
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-primary/20 shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
                    </div>
                )}
            </header>

            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-200px)]">
                {/* Left side: Controls */}
                <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-4 border-b border-slate-50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Filter className="h-4 w-4 text-primary" />
                                Filter Selection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Korean or Bangla..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-slate-50/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">POS</Label>
                                    <Select value={filterPos} onValueChange={setFilterPos}>
                                        <SelectTrigger className="bg-slate-50/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {partsOfSpeech.map(pos => <SelectItem key={pos.key} value={pos.key}>{pos.key}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Issues</Label>
                                    <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                                        <SelectTrigger className="bg-slate-50/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Any Incomplete</SelectItem>
                                            <SelectItem value="missing-all-fields">All Missing (Except BN/KR)</SelectItem>
                                            <SelectItem value="missing-explanation">Explanation</SelectItem>
                                            <SelectItem value="missing-examples">Examples</SelectItem>
                                            <SelectItem value="missing-verb">Verb Forms</SelectItem>
                                            <SelectItem value="missing-romanization">Pronunciation</SelectItem>
                                            <SelectItem value="missing-pos">Part of Speech</SelectItem>
                                            <SelectItem value="missing-themes">Themes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-4 border-b border-slate-50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Layers className="h-4 w-4 text-primary" />
                                Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fields to Enhance</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all",
                                    selectedFields.has("all") ? "bg-primary text-white border-primary" : "bg-slate-50 hover:bg-slate-100"
                                )}>
                                    <input type="checkbox" checked={selectedFields.has("all")} onChange={(e) => e.target.checked ? setSelectedFields(new Set(["all"])) : setSelectedFields(new Set())} className="hidden" />
                                    <span>● All Missing</span>
                                </label>
                                {[
                                    { id: "explanation", label: "Explanation" },
                                    { id: "examples", label: "Examples" },
                                    { id: "verb_forms", label: "Verb Forms" },
                                    { id: "romanization", label: "Pronunciation" },
                                    { id: "part_of_speech", label: "Part of Speech" },
                                    { id: "themes", label: "Themes" },
                                ].map(field => (
                                    <label key={field.id} className={cn(
                                        "flex items-center gap-2 p-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all",
                                        selectedFields.has(field.id) ? "bg-primary/10 border-primary/30 text-primary" : "bg-slate-50 hover:bg-slate-100"
                                    )}>
                                        <input type="checkbox" checked={selectedFields.has(field.id)} onChange={(e) => {
                                            const newFields = new Set(selectedFields);
                                            newFields.delete("all");
                                            if (e.target.checked) newFields.add(field.id);
                                            else newFields.delete(field.id);
                                            setSelectedFields(newFields);
                                        }} className="hidden" />
                                        <span>{field.label}</span>
                                    </label>
                                ))}
                            </div>
                            <Button
                                className="w-full font-bold h-11 bg-primary text-white shadow-lg shadow-primary/20 mt-4"
                                onClick={handleEnhanceSelected}
                                disabled={selectedVocabs.size === 0 || isProcessing}
                            >
                                <Zap className="h-4 w-4 mr-2" />
                                Enhance {selectedVocabs.size > 0 ? selectedVocabs.size : ""} Selected
                            </Button>
                        </CardContent>
                    </Card>

                    <AnimatePresence>
                        {results.length > 0 && (
                            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                                <CardHeader className="pb-2 border-b border-slate-50 bg-slate-50/50 text-center">
                                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Monitor</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div
                                        className="max-h-[200px] overflow-y-auto divide-y divide-slate-50 custom-scrollbar"
                                        ref={scrollRef}
                                    >
                                        {results.map((r, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 px-4 transition-colors hover:bg-slate-50/50">
                                                <span className="text-[11px] font-bold text-slate-600">{r.korean_word}</span>
                                                <div className="flex items-center gap-2">
                                                    {r.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                                    {r.status === 'success' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                                    {r.status === 'error' && <AlertCircle className="h-3 w-3 text-rose-500" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right side: List */}
                <div className="lg:col-span-8 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                        <div>
                            <h2 className="font-bold text-slate-900">Vocabulary Pool</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{filteredVocabs.length} Items Found</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs font-bold text-primary hover:bg-primary/5">Select All</Button>
                            <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs font-bold text-slate-400 hover:bg-slate-50">Clear</Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/30">
                        {filteredVocabs.map((vocab) => (
                            <div
                                key={vocab.id}
                                className={cn(
                                    "p-4 rounded-xl border transition-all flex items-center gap-4 cursor-pointer group shadow-sm bg-white",
                                    selectedVocabs.has(vocab.id)
                                        ? "border-primary/40 ring-1 ring-primary/10"
                                        : "border-slate-100 hover:border-slate-200"
                                )}
                            >
                                <div className="shrink-0 pt-1" onClick={(e) => { e.stopPropagation(); toggleSelection(vocab.id); }}>
                                    <div className={cn(
                                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shadow-sm",
                                        selectedVocabs.has(vocab.id) ? "bg-primary border-primary scale-110" : "border-slate-200 hover:border-slate-300"
                                    )}>
                                        {selectedVocabs.has(vocab.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                                    </div>
                                </div>
                                <div className="flex-1" onClick={() => toggleSelection(vocab.id)}>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-800">{vocab.korean_word}</h3>
                                        <Badge variant="outline" className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50 border-slate-100">{vocab.part_of_speech}</Badge>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{vocab.bangla_meaning}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                                        {(!vocab.romanization) && <Badge className="h-4 p-0 px-1 bg-amber-500/10 text-amber-600 border-none text-[8px] uppercase font-black">Pron</Badge>}
                                        {(!vocab.explanation || vocab.explanation.length < 50) && <Badge className="h-4 p-0 px-1 bg-blue-500/10 text-blue-600 border-none text-[8px] uppercase font-black">Expl</Badge>}
                                        {(!vocab.examples || vocab.examples.length === 0) && <Badge className="h-4 p-0 px-1 bg-violet-500/10 text-violet-600 border-none text-[8px] uppercase font-black">Examp</Badge>}
                                        {(!vocab.part_of_speech) && <Badge className="h-4 p-0 px-1 bg-emerald-500/10 text-emerald-600 border-none text-[8px] uppercase font-black">POS</Badge>}
                                        {(!vocab.themes || vocab.themes.length === 0) && <Badge className="h-4 p-0 px-1 bg-rose-500/10 text-rose-600 border-none text-[8px] uppercase font-black">Themes</Badge>}
                                        {(vocab.part_of_speech === "verb" && !vocab.verb_forms) && <Badge className="h-4 p-0 px-1 bg-indigo-500/10 text-indigo-600 border-none text-[8px] uppercase font-black">Verb</Badge>}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-slate-50"
                                        onClick={(e) => { e.stopPropagation(); handlePreviewEnhancement(vocab); }}
                                    >
                                        PREVIEW
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="p-6 pb-2 bg-slate-900 text-white">
                        <DialogTitle className="flex items-center gap-2 text-xl font-black italic tracking-tighter">
                            <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                            GEMINI AI PREVIEW
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                            Reviewing enhancement for: <span className="text-white">{previewVocab?.korean_word}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4 custom-scrollbar">
                        {!enhancedData ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Computing Intelligence...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(enhancedData).map(([key, value]) => {
                                    // Only show the field if it's one we actually enhanced or if it's interesting
                                    if (['id', 'korean_word', 'bangla_meaning'].includes(key)) return null;

                                    return (
                                        <motion.div
                                            key={key}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                                        >
                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                                                <span className="font-black text-[10px] uppercase tracking-widest text-slate-400">{key}</span>
                                                <Badge variant="secondary" className="text-[8px] bg-emerald-50 text-emerald-600 border-emerald-100 font-black">READY</Badge>
                                            </div>
                                            <div className="p-0">
                                                <textarea
                                                    value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                    readOnly
                                                    className="w-full h-full min-h-[100px] p-4 bg-transparent font-mono text-xs resize-none focus:outline-none"
                                                    spellCheck={false}
                                                />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t bg-white flex items-center justify-between">
                        <Button variant="ghost" onClick={() => setShowPreview(false)} className="font-bold text-slate-400 text-xs">CANCEL</Button>
                        <Button
                            onClick={handleApplyPreview}
                            disabled={!enhancedData || isApplying}
                            className="bg-primary text-white font-black px-8 shadow-lg shadow-primary/20"
                        >
                            {isApplying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            APPLY ENHANCEMENT
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}

const Zap = ({ className }: { className?: string }) => <Wand2 className={className} />;
