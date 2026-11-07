import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import ServiceService from "../../services/services";
import ServiceManager from "../../components/provider/ServiceManager";
import ServiceForm from "../../components/provider/ServiceForm";
import Modal from "../../components/common/modal";
import usePlatformLimit from "../../hooks/usePlatformLimit";
import SwitchListingModal from "../../components/common/SwitchListingModal";
import ErrorMessage from "../../components/common/ErrorMessage";

function ProviderServices() {
  const { serviceProvider } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(null);
  const limit = usePlatformLimit("max_services_per_provider", 5);

  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedPackages, setSelectedPackages] = useState([]);

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

  const openEditor = async (service) => {
    setSelectedPackages([]);
    setSelected(service);

    if (service) {
      try {
        setSelectedPackages(await ServiceService.getPackages(service.id));
      } catch (err) {
        setError(err.message || "Could not load the packages.");
      }
    }

    setModalOpen(true);
  };

  const handleSubmit = async (data, packages = []) => {
    let saved;
    if (selected) {
      saved = await ServiceService.updateService(selected.id, data);
    } else {
      saved = await ServiceService.createService({
        ...data,
        provider_id: serviceProvider.id,
      });
    }

    if (packages.length > 0 || selectedPackages.length > 0) {
      await ServiceService.savePackages(saved.id, packages);
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
        onAdd={() => openEditor(null)}
        onEdit={openEditor}
        onDelete={handleDelete}
        onSwitch={setSwitching}
        limit={limit}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected ? "Edit service" : "Add service"}
      >
        <ServiceForm
          key={`${selected?.id || "new"}-${selectedPackages.length}`}
          initialData={selected}
          initialPackages={selectedPackages}
          categories={categories}
          onSubmit={handleSubmit}
        />
      </Modal>

      {switching && (
        <SwitchListingModal
          key={switching.id}
          kind="service"
          item={switching}
          onClose={() => setSwitching(null)}
          onDone={() => {
            setSwitching(null);
            navigate("/vendor/products");
          }}
        />
      )}
    </>
  );
}

export default ProviderServices;