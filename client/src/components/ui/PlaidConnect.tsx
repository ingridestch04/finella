import React, { useCallback, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { useUiStore } from '../../store/uiStore';
import { Button } from './Button';

interface PlaidConnectProps {
  onSuccess?: () => void;
}

export function PlaidConnect({ onSuccess }: PlaidConnectProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.addToast);

  const exchangeMutation = useMutation({
    mutationFn: (data: { public_token: string; metadata: object }) =>
      apiClient.post('/accounts/plaid/exchange', data).then((r) => r.data),
    onSuccess: (data: { accounts: unknown[]; message: string }) => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast('success', data.message);
      onSuccess?.();
    },
    onError: () => toast('error', 'Erreur lors de la connexion Plaid'),
  });

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      exchangeMutation.mutate({ public_token, metadata });
    },
    onExit: () => setLinkToken(null),
  });

  const handleConnect = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/accounts/plaid/link-token');
      setLinkToken(res.data.link_token);
    } catch {
      toast('error', 'Impossible de démarrer Plaid. Vérifiez vos clés API.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Ouvrir Plaid Link dès que le token est prêt
  React.useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  return (
    <Button
      variant="outline"
      onClick={handleConnect}
      loading={loading || exchangeMutation.isPending}
      leftIcon="🏦"
    >
      Connecter via Plaid (Revolut, BNP…)
    </Button>
  );
}
