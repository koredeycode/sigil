import { useEffect, useState } from 'react';
import { ApiClient, type Provider } from '../lib/api';

export function useProviders() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProviders = async () => {
             const token = localStorage.getItem('sigil_token');
             if (!token) return;
             try {
                 const client = new ApiClient(token);
                 const res = await client.getProviders();
                 if (res.data) {
                     setProviders(res.data);
                 }
             } catch (e) {
                 console.error("Failed to fetch providers", e);
             } finally {
                 setLoading(false);
             }
        };

        fetchProviders();
    }, []);

    const primaryProvider = providers.find(p => p.is_primary === 1) || null;

    return { providers, primaryProvider, loading };
}
