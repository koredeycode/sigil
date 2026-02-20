import { Monitor, Moon, Shield } from 'lucide-react';

export function SettingsPage() {
    return (
        <div className="flex flex-col h-full space-y-6 max-w-4xl">
            <header>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your dashboard preferences and connection settings.</p>
            </header>

            <div className="grid grid-cols-1 gap-6">
                
                {/* General Settings */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-muted-foreground" />
                        General
                    </h2>
                    <div className="bg-card border border-border rounded-xl divide-y divide-border">
                        <div className="p-5 flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">Dashboard Version</h3>
                                <p className="text-sm text-muted-foreground">Currently installed version</p>
                            </div>
                            <span className="font-mono text-sm bg-secondary px-2 py-1 rounded text-muted-foreground">v0.1.0</span>
                        </div>
                        <div className="p-5 flex items-center justify-between">
                             <div>
                                <h3 className="font-medium">API Endpoint</h3>
                                <p className="text-sm text-muted-foreground">Connecting to Core API</p>
                            </div>
                            <code className="text-sm bg-secondary px-2 py-1 rounded text-primary">{window.location.hostname}:7445</code>
                        </div>
                    </div>
                </section>

                {/* Appearance */}
                 <section className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Moon className="w-5 h-5 text-muted-foreground" />
                        Appearance
                    </h2>
                    <div className="bg-card border border-border rounded-xl divide-y divide-border">
                        <div className="p-5 flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">Dark Mode</h3>
                                <p className="text-sm text-muted-foreground">Use system preference or force dark theme</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Always On</span>
                                <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                 {/* Security */}
                 <section className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        Security
                    </h2>
                    <div className="bg-card border border-border rounded-xl divide-y divide-border">
                        <div className="p-5">
                            <button className="text-sm font-medium text-red-500 hover:text-red-400 underline underline-offset-4">
                                Clear Saved Tokens
                            </button>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
