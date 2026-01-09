import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Welcome back!");
                navigate(from, { replace: true });
            }
        } catch (error: any) {
            toast.error("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20 overflow-hidden">
                        <img
                            src="/langobridge-app-icon.jpg"
                            alt="LangoBridge Logo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Langobridge Admin</h1>
                    <p className="text-muted-foreground mt-2">Sign in to manage your language platform</p>
                </div>

                <Card className="border-primary/10 shadow-xl backdrop-blur-sm bg-card/50">
                    <CardHeader>
                        <CardTitle>Welcome Back</CardTitle>
                        <CardDescription>Enter your credentials to access the dashboard</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center text-xs text-muted-foreground mt-8">
                    © {new Date().getFullYear()} Langobridge. All rights reserved.
                </p>
            </motion.div>
        </div>
    );
}
