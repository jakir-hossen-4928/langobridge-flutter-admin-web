import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy, Eye, EyeOff, Save, Trash2 } from 'lucide-react';

const GEMINI_KEY_STORAGE = 'gemini_api_key';

export default function Settings() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem(GEMINI_KEY_STORAGE);
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem(GEMINI_KEY_STORAGE, apiKey);
    toast({
      title: 'Success',
      description: 'Gemini API key saved locally',
    });
  };

  const handleDeleteKey = () => {
    localStorage.removeItem(GEMINI_KEY_STORAGE);
    setApiKey('');
    toast({
      title: 'Key Removed',
      description: 'Gemini API key deleted from local storage',
    });
  };

  return (
    <div className="space-y-6 max-w-2xl py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your Langobridge preferences and AI keys</p>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">AI Configuration</CardTitle>
          <CardDescription>
            Manage your Google Gemini API key. This key is stored locally in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gemini-key">Gemini API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="gemini-key"
                  type={showKey ? "text" : "password"}
                  placeholder="Enter your Gemini API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSaveKey} size="icon" className="shrink-0">
                <Save className="h-4 w-4" />
              </Button>
              {apiKey && (
                <Button
                  onClick={handleDeleteKey}
                  variant="destructive"
                  size="icon"
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Need a key? Get one from the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google AI Studio</a>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">App Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Data Version</Label>
            <Input defaultValue="1" readOnly className="bg-muted" />
            <p className="text-xs text-muted-foreground mt-1">
              Increment when you update vocabulary/resources data
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Enable dark theme</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Korean Font Size</Label>
              <p className="text-xs text-muted-foreground">Larger Korean text for readability</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Storage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Supabase URL</Label>
            <Input defaultValue="https://vysfbzcurkswmwgptbfj.supabase.co" readOnly className="bg-muted text-xs" />
          </div>
          <Button variant="outline" className="w-full h-10 border-dashed hover:bg-muted/50 transition-colors">
            Clear Local Cache
          </Button>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-2 py-2">
            <p className="font-bold text-lg">Langobridge Admin</p>
            <p className="text-sm text-primary font-medium">
              🇰🇷 Korean - 🇧🇩 Bangla Learning Bridge
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-mono border border-border">v1.0.0</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20">Production</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
