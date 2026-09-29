import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MessageCircle, MapPin, Phone, BriefcaseBusiness } from "lucide-react";

import ServiceService from "../../services/services";
import ServiceCard from "../../components/services/ServiceCard";
import { createWhatsAppLink } from "../../lib/whatsapp";

function ProviderProfile() {
  const { providerId } = useParams();

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      ServiceService.getProviderById(providerId),
      ServiceService.getServicesByProvider(providerId),
    ])
      .then(([providerData, serviceList]) => {
        if (!cancelled) {
          setProvider(providerData);
          setServices(serviceList);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load provider.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [providerId]);

  if (loading) {
    return (
      <main className="page-container">
        <p>Loading provider...</p>
      </main>
    );
  }

  if (error || !provider) {
    return (
      <main className="page-container">
        <Link to="/services" className="back-button">
          Back to services
        </Link>
        <div className="empty-state">
          <h3>Provider not found</h3>
          <p>{error || "This provider may no longer be available."}</p>
        </div>
      </main>
    );
  }

  const businessName = provider.business_name || "Service Provider";

  const whatsappLink = provider.phone
    ? createWhatsAppLink(
        provider.phone,
        `Hi ${businessName}, I found you on KU Market.`
      )
    : null;

  return (
    <main className="page-container">
      <Link to="/services" className="back-button">
        Back to services
      </Link>

      <div className="page-header">
        <span className="eyebrow">SERVICE PROVIDER</span>
        <h1>{businessName}</h1>

        <p className="service-card__meta">
          <MapPin size={16} />
          {provider.location || "Makerere University"}
        </p>
      </div>

      {provider.description ? (
        <p>{provider.description}</p>
      ) : (
        <p>Professional services available around campus.</p>
      )}

      <div className="product-card-actions">
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button"
          >
            <MessageCircle size={18} /> WhatsApp
          </a>
        )}

        {provider.phone && (
          <a href={`tel:${provider.phone}`} className="product-view-button">
            <Phone size={16} /> {provider.phone}
          </a>
        )}

        {!whatsappLink && !provider.phone && (
          <span className="empty-state">
            <BriefcaseBusiness size={20} />
            No contact details on file yet.
          </span>
        )}
      </div>

      {services.length > 0 && (
        <>
          <div className="section-heading">
            <div>
              <span className="eyebrow">OFFERED HERE</span>
              <h2>Services</h2>
            </div>
          </div>

          <div className="services-grid">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export default ProviderProfile;
