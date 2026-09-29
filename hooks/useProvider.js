import { useCallback, useEffect, useState } from "react";
import ProviderService from "../services/services";

function useProvider(providerId = null) {
  const [provider, setProvider] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProvider = useCallback(async (id = providerId) => {
    if (!id) return null;

    try {
      setLoading(true);
      setError(null);

      const data =
        await ProviderService.getProviderById(id);

      setProvider(data);

      return data;
    } catch (err) {
      setError(
        err.message || "Failed to load provider."
      );

      return null;
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data =
        await ProviderService.getProviders();

      setProviders(data || []);

      return data;
    } catch (err) {
      setError(
        err.message || "Failed to load providers."
      );

      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (providerId) {
      fetchProvider(providerId);
    }
  }, [providerId, fetchProvider]);

  return {
    provider,
    providers,
    loading,
    error,
    fetchProvider,
    fetchProviders,
  };
}

export default useProvider;