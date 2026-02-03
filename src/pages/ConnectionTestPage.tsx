import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Wifi, Database, Globe, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ConnectionTestPage() {
    const [results, setResults] = useState<any>({});
    const [running, setRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [envInfo, setEnvInfo] = useState<any>({});

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    useEffect(() => {
        setEnvInfo({
            url: import.meta.env.VITE_SUPABASE_URL,
            hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
            mode: import.meta.env.MODE
        });
    }, []);

    const runTests = async () => {
        setRunning(true);
        setResults({});
        setLogs([]);
        addLog("Starting diagnostics...");

        // 1. Test Google Reachability (General Internet)
        try {
            addLog("Testing Internet (Google)...");
            // const start = performance.now();
            await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
            addLog(`Internet OK`);
            setResults((p: any) => ({ ...p, internet: { status: 'ok', msg: 'Reachable' } }));
        } catch (e: any) {
            addLog(`Internet FAILED: ${e.message}`);
            setResults((p: any) => ({ ...p, internet: { status: 'error', msg: e.message } }));
        }

        // 2. Test Supabase Health/Reachability
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        try {
            addLog(`Pinging Supabase URL: ${supabaseUrl}...`);
            // const start = performance.now();
            // Try fetching a known public endpoint or just root
            // Supabase projects usually respond to /rest/v1/ with 401 or similar if active
            const res = await fetch(`${supabaseUrl}/rest/v1/`, {
                method: 'HEAD',
                headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }
            });
            addLog(`Supabase Ping: Status ${res.status}`);
            setResults((p: any) => ({ ...p, supabasePing: { status: res.status !== 503 ? 'ok' : 'warning', msg: `Status ${res.status}` } }));
        } catch (e: any) {
            addLog(`Supabase Ping FAILED: ${e.message}`);
            setResults((p: any) => ({ ...p, supabasePing: { status: 'error', msg: e.message } }));
        }

        // 3. Test Supabase Query (Profiles)
        try {
            addLog("Testing DB Read (profiles count)...");
            const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            if (error) {
                addLog(`DB Read Error: ${error.message} (${error.code})`);
                setResults((p: any) => ({ ...p, dbRead: { status: 'error', msg: error.message } }));
            } else {
                addLog(`DB Read OK. Count: ${count}`);
                setResults((p: any) => ({ ...p, dbRead: { status: 'ok', msg: `Connection OK` } }));
            }
        } catch (e: any) {
            addLog(`DB Read EXCEPTION: ${e.message}`);
            setResults((p: any) => ({ ...p, dbRead: { status: 'error', msg: e.message } }));
        }

        setRunning(false);
    };

    const StatusIcon = ({ status }: { status: string }) => {
        if (status === 'ok') return <CheckCircle2 className="text-green-500" />;
        if (status === 'error') return <AlertTriangle className="text-destructive" />;
        return <div className="h-4 w-4 rounded-full bg-gray-300 animate-pulse" />;
    };

    return (
        <div className="p-4 space-y-4 max-w-md mx-auto mt-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wifi /> Connection Diagnostics
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                        URL: {envInfo.url}<br />
                        Has Key: {envInfo.hasKey ? 'YES' : 'NO'}<br />
                        Env: {envInfo.mode}
                    </div>

                    <Button onClick={runTests} disabled={running} className="w-full">
                        {running ? 'Running Tests...' : 'Run Diagnostics'}
                    </Button>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between border p-2 rounded">
                            <div className="flex items-center gap-2"><Globe size={16} /> Internet Reachability</div>
                            {results.internet ? <StatusIcon status={results.internet.status} /> : null}
                        </div>
                        <div className="flex items-center justify-between border p-2 rounded">
                            <div className="flex items-center gap-2"><Wifi size={16} /> Supabase Server Reachability</div>
                            {results.supabasePing ? <StatusIcon status={results.supabasePing.status} /> : null}
                        </div>
                        <div className="flex items-center justify-between border p-2 rounded">
                            <div className="flex items-center gap-2"><Database size={16} /> DB Query (Select)</div>
                            {results.dbRead ? <StatusIcon status={results.dbRead.status} /> : null}
                        </div>
                    </div>

                    <div className="h-40 overflow-y-auto bg-black/90 text-green-400 font-mono text-xs p-2 rounded">
                        {logs.length === 0 ? "Ready to start..." : logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
