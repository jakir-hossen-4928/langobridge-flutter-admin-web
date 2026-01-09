import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileJson, FileSpreadsheet, Download, RefreshCw, CheckCircle, AlertTriangle, X, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface BulkUploadItem {
    korean_word: string;
    bangla_meaning: string;
    romanization?: string;
    part_of_speech?: string;
    explanation?: string;
    examples?: string; // JSON string in CSV, or object array in JSON
    themes?: string; // Comma separated
    chapters?: string; // Comma separated
    verb_forms?: any; // JSON object
}

export function BulkVocabularyUpload({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [jsonInput, setJsonInput] = useState('');
    const [uploadMode, setUploadMode] = useState<'json' | 'file'>('json');
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    useState(() => {
        const pending = localStorage.getItem('pending_bulk_upload');
        if (pending) {
            setJsonInput(pending);
            localStorage.removeItem('pending_bulk_upload');
            toast({ title: "AI Data Loaded", description: "Your generated data from AI Studio is ready." });
        }
    });

    const templates = {
        csv: `korean_word,bangla_meaning,romanization,part_of_speech,explanation,themes,chapters,examples
가다,যাওয়া,gada,verb,To move from one place to another,"daily_life, action",1,"[{""korean"":""집에 가요"",""bangla"":""I go home""}]"`,
        json: JSON.stringify([
            {
                korean_word: "가다",
                bangla_meaning: "যাওয়া",
                romanization: "gada",
                part_of_speech: "verb",
                explanation: "To move from one place to another",
                themes: ["daily_life", "action"],
                chapters: [1],
                examples: [{ korean: "집에 가요", bangla: "I go home" }]
            }
        ], null, 2)
    };

    const copyTemplate = (type: 'csv' | 'json') => {
        navigator.clipboard.writeText(templates[type]);
        toast({ title: 'Copied!', description: `${type.toUpperCase()} template copied to clipboard.` });
    };

    const downloadTemplate = (type: 'csv' | 'json') => {
        const content = templates[type];
        const blob = new Blob([content], { type: type === 'csv' ? 'text/csv' : 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vocabulary_template.${type}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setError(null);
        setPreviewData([]);

        if (uploadedFile.name.endsWith('.csv')) {
            Papa.parse(uploadedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        setError(`CSV Parsing Error: ${results.errors[0].message}`);
                    } else {
                        const data = results.data as any[];
                        const invalidItems = data.filter(item => !item.korean_word || !item.bangla_meaning);
                        if (invalidItems.length > 0) {
                            setError(`Validation Warning: ${invalidItems.length} items in CSV are missing required fields. Only valid items will be previewed.`);
                            setPreviewData(data.filter(item => item.korean_word && item.bangla_meaning));
                        } else {
                            setPreviewData(data);
                        }
                    }
                },
                error: (err) => {
                    setError(`CSV Read Error: ${err.message}`);
                }
            });
        } else if (uploadedFile.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const json = JSON.parse(event.target?.result as string);
                    if (Array.isArray(json)) {
                        const invalidItems = json.filter(item => !item.korean_word || !item.bangla_meaning);
                        if (invalidItems.length > 0) {
                            setError(`Validation Warning: ${invalidItems.length} items in JSON are missing required fields. Only valid items will be previewed.`);
                            setPreviewData(json.filter(item => item.korean_word && item.bangla_meaning));
                        } else {
                            setPreviewData(json);
                        }
                    } else {
                        setError("Invalid JSON: Root must be an array.");
                    }
                } catch (err) {
                    setError("Invalid JSON format.");
                }
            };
            reader.readAsText(uploadedFile);
        } else {
            setError("Unsupported file type. Please upload CSV or JSON.");
        }
    };

    const handleJsonPaste = () => {
        setError(null);
        setPreviewData([]);

        try {
            const parsed = JSON.parse(jsonInput);
            if (Array.isArray(parsed)) {
                const invalidItems = parsed.filter(item => !item.korean_word || !item.bangla_meaning);
                if (invalidItems.length > 0) {
                    setError(`Validation Error: ${invalidItems.length} items are missing korean_word or bangla_meaning.`);
                    setPreviewData(parsed.filter(item => item.korean_word && item.bangla_meaning));
                } else {
                    setPreviewData(parsed);
                    toast({ title: 'JSON Parsed!', description: `Found ${parsed.length} items.` });
                }
            } else {
                setError('Invalid JSON: Root must be an array.');
            }
        } catch (err) {
            setError('Invalid JSON format. Please check your syntax.');
        }
    };

    const processDataForUpload = (data: any[]) => {
        return data.map(item => {
            // Handle examples: CSV might be stringified JSON, JSON is already object
            let examples = [];
            try {
                if (typeof item.examples === 'string') {
                    // Try parsing if it looks like JSON
                    if (item.examples.trim().startsWith('[')) {
                        examples = JSON.parse(item.examples);
                    }
                } else if (Array.isArray(item.examples)) {
                    examples = item.examples;
                }
            } catch (e) {
                console.warn("Failed to parse examples for", item.korean_word);
            }

            // Handle themes: CSV string vs JSON array
            let themes: string[] | null = null;
            if (typeof item.themes === 'string') {
                themes = item.themes.split(',').map((t: string) => t.trim()).filter(Boolean);
            } else if (Array.isArray(item.themes)) {
                themes = item.themes;
            }

            // Handle chapters: CSV string vs JSON array
            let chapters: number[] | null = null;
            if (typeof item.chapters === 'string') {
                chapters = item.chapters.split(',').map((c: string) => parseInt(c.trim())).filter((c: number) => !isNaN(c));
            } else if (Array.isArray(item.chapters)) {
                chapters = item.chapters;
            } else if (typeof item.chapters === 'number') {
                chapters = [item.chapters];
            }

            return {
                korean_word: item.korean_word,
                bangla_meaning: item.bangla_meaning,
                romanization: item.romanization || null,
                part_of_speech: item.part_of_speech || null,
                explanation: item.explanation || '',
                examples: examples,
                themes: themes,
                chapters: chapters,
                verb_forms: item.verb_forms || null
            };
        }).filter(item => item.korean_word && item.bangla_meaning); // strictly require primary fields
    };

    const handleUpload = async () => {
        if (!previewData.length) return;

        setUploading(true);
        const formattedData = processDataForUpload(previewData);

        if (formattedData.length === 0) {
            setError("No valid data found to upload. Check required fields.");
            setUploading(false);
            return;
        }

        const { error: uploadError } = await supabase
            .from('vocabulary')
            .insert(formattedData);

        setUploading(false);

        if (uploadError) {
            setError(`Upload Failed: ${uploadError.message}`);
            toast({ title: 'Upload Failed', description: uploadError.message, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: `Uploaded ${formattedData.length} items successfully.` });
            onSuccess();
        }
    };

    return (
        <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl flex justify-between items-center">
                    <span>Bulk Upload Vocabulary</span>
                    <div className="flex gap-2">
                        <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => downloadTemplate('csv')} title="Download CSV">
                                <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => copyTemplate('csv')} title="Copy CSV">
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => downloadTemplate('json')} title="Download JSON">
                                <FileJson className="w-4 h-4 mr-2" /> JSON
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => copyTemplate('json')} title="Copy JSON">
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardTitle>

                {/* Mode Tabs */}
                <div className="flex gap-2 mt-4 border-b">
                    <button
                        onClick={() => { setUploadMode('json'); setError(null); }}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${uploadMode === 'json'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <FileJson className="w-4 h-4 inline mr-2" />
                        Paste JSON
                    </button>
                    <button
                        onClick={() => { setUploadMode('file'); setError(null); }}
                        className={`px-4 py-2 font-medium transition-colors border-b-2 ${uploadMode === 'file'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Upload className="w-4 h-4 inline mr-2" />
                        Upload File
                    </button>
                </div>
            </CardHeader>
            <CardContent className="px-0 space-y-6">

                {/* File Upload Mode */}
                {uploadMode === 'file' && (
                    !file ? (
                        <div className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-muted/50 transition-colors">
                            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Upload CSV or JSON file</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Drag and drop your file here, or click to browse
                            </p>
                            <input
                                type="file"
                                accept=".csv,.json"
                                className="hidden"
                                id="file-upload"
                                onChange={handleFileUpload}
                            />
                            <Button asChild>
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    Select File
                                </label>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                            <div className="flex items-center space-x-4">
                                {file.name.endsWith('.csv') ? <FileSpreadsheet className="w-8 h-8 text-green-600" /> : <FileJson className="w-8 h-8 text-orange-600" />}
                                <div>
                                    <p className="font-medium">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setFile(null); setPreviewData([]); setError(null); }}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )
                )}

                {/* JSON Paste Mode */}
                {uploadMode === 'json' && (
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Paste JSON Array</label>
                            <Textarea
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                placeholder={templates.json}
                                className="font-mono text-sm min-h-[300px]"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleJsonPaste} disabled={!jsonInput.trim()}>
                                <FileJson className="w-4 h-4 mr-2" />
                                Parse JSON
                            </Button>
                            <Button variant="outline" onClick={() => {
                                try {
                                    setJsonInput(JSON.stringify(JSON.parse(jsonInput), null, 2));
                                } catch (e) {
                                    toast({ title: "Invalid JSON", description: "Cannot prettify invalid JSON.", variant: "destructive" });
                                }
                            }} disabled={!jsonInput.trim()}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Prettify
                            </Button>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Preview Table */}
                {previewData.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Ready to upload {previewData.length} items
                            </h4>
                        </div>
                        <ScrollArea className="h-[300px] border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Korean</TableHead>
                                        <TableHead>Bangla</TableHead>
                                        <TableHead>POS</TableHead>
                                        <TableHead>Themes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.slice(0, 10).map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-korean">{row.korean_word}</TableCell>
                                            <TableCell className="font-bangla">{row.bangla_meaning}</TableCell>
                                            <TableCell>{row.part_of_speech}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">
                                                {Array.isArray(row.themes) ? row.themes.join(', ') : row.themes}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                        <p className="text-xs text-muted-foreground">Showing first 10 items preview.</p>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={onCancel}>Cancel</Button>
                            <Button onClick={handleUpload} disabled={uploading}>
                                {uploading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                                Upload {previewData.length} Items
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
