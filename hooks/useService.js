import { useCallback, useEffect, useState } from "react";
import ServiceService from "../services/services";

function useService(serviceId = null) {
  const [service, setService] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchService = useCallback(async (id = serviceId) => {
    if (!id) return null;

    try {
      setLoading(true);
      setError(null);

      const data =
        await ServiceService.getServiceById(id);

      setService(data);

      return data;
    } catch (err) {
      setError(
        err.message || "Failed to load service."
      );

      return null;
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  const fetchServices = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const data =
        await ServiceService.getServices(filters);

      setServices(data || []);

      return data;
    } catch (err) {
      setError(
        err.message || "Failed to load services."
      );

      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (serviceId) {
      fetchService(serviceId);
    }
  }, [serviceId, fetchService]);

  return {
    service,
    services,
    loading,
    error,
    fetchService,
    fetchServices,
  };
}

export default useService;