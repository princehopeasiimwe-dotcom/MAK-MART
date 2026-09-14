import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";

import ServiceCard from "../../components/services/ServiceCard";
import useService from "../../hooks/useService";
import { formatCurrency } from "../../utils/currency";
import { openWhatsApp } from "../../lib/whatsapp";

function ServiceDetails() {
  const { serviceId } = useParams();
  const { service, loading, error, fetchService } = useService(serviceId);

  useEffect(() => {
    fetchService(serviceId);
  }, [fetchService, serviceId]);

  if (loading) return <main className="page-container"><p>Loading service...</p></main>;
  if (error) return <main className="page-container"><p role="alert">{error}</p></main>;
  if (!service) return <main className="page-container"><p>Service not found.</p></main>;

  const provider = service.service_providers;
  const providerPhone = provider?.phone;

  const handleContact = () => {
    if (!providerPhone) return;

    openWhatsApp(
      providerPhone,
      `Hi ${provider.business_name}, I found "${service.name}" on KU Market and I'd like to know more.`
    );
  };

  return (
    <main className="page-container">
      <Link to="/services" className="back-link">Back to services</Link>
      <div className="service-details">
        <ServiceCard service={service} />
        <div>
          <h1>{service.name}</h1>

          {provider?.business_name && (
            <p className="service-card__meta">
              Offered by{" "}
              <Link to={`/providers/${provider.id}`}>
                {provider.business_name}
              </Link>
            </p>
          )}

          {service.price != null && (
            <p className="service-details__price">
              {formatCurrency(service.price)}
            </p>
          )}

          <p>{service.description || "Professional services available around campus."}</p>

          {providerPhone && (
            <button
              type="button"
              className="primary-button"
              onClick={handleContact}
            >
              <MessageCircle size={18} />
              Contact on WhatsApp
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default ServiceDetails;
