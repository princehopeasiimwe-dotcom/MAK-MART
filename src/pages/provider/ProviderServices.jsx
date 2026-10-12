import { useCallback, useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import ServiceService from "../../services/services";
import ServiceManager from "../../components/provider/ServiceManager";
import ServiceForm from "../../components/provider/ServiceForm";
import Modal from "../../components/common/modal";
import ErrorMessage from "../../components/common/ErrorMessage";

function ProviderServices() {
  const { serviceProvider } = useAuth();

  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    if (!serviceProvider?.id) {
      setLoading(false);
      return;
    }

    try {
      const [list, cats] = await Promise.all([
        ServiceService.getServicesByProvider(serviceProvider.id),
        ServiceService.getServiceCategories(),
      ]);
      setServices(list);
      setCategories(cats);
    } catch (err) {
      setError(err.message || "Could not load your services.");
    } finally {
      setLoading(false);
    }
  }, [serviceProvider]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (data) => {
    if (selected) {
      await ServiceService.updateService(selected.id, data);
    } else {
      await ServiceService.createService({
        ...data,
        provider_id: serviceProvider.id,
      });
    }

    setModalOpen(false);
    setSelected(null);
    await load();
  };

  const handleDelete = async (service) => {
    if (!window.confirm(`Delete "${service.name}"?`)) return;

    try {
      await ServiceService.deleteService(service.id);
      await load();
    } catch (err) {
      setError(err.message || "Could not delete the service.");
    }
  };

  return (
    <>
      <ErrorMessage message={error} onClose={() => setError("")} />

      <ServiceManager
        services={services}
        loading={loading}
        onAdd={() => {
          setSelected(null);
          setModalOpen(true);
        }}
        onEdit={(service) => {
          setSelected(service);
          setModalOpen(true);
        }}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected ? "Edit service" : "Add service"}
      >
        <ServiceForm
          key={selected?.id || "new"}
          initialData={selected}
          categories={categories}
          onSubmit={handleSubmit}
        />
      </Modal>
    </>
  );
}

export default ProviderServices;