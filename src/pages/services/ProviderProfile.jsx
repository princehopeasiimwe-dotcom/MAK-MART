import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MessageCircle, MapPin, Phone, BriefcaseBusiness } from "lucide-react";

import ServiceService from "../../services/services";
import ServiceCard from "../../components/services/ServiceCard";
import { createWhatsAppLink } from "../../lib/whatsapp";
import useAuth from "../../hooks/useAuth";
import useRatings from "../../hooks/useRatings";
import { StarRating } from "../../components/common/Stars";
import { rankServices } from "../../lib/ranking";
import SignInToOrder from "../../components/marketplace/SignInToOrder";

import usePageSeo from "../../hooks/usePageSeo";

function ProviderProfile() {
  const { providerId } = useParams();

  const { user } = useAuth();
  const { providerStats, serviceStats } = useRatings();
  const [signInOpen, setSignInOpen] = useState(false);
  const [provider, setProvider] = useState(null);
  usePageSeo({ title: provider?.business_name || "Service provider", description: provider?.description, image: provider?.profile_image_url });

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
        `Hi ${businessName}, I found you on MAK MART.`
      )
    : null;

  return (
    <main className="page-container">
      <Link to="/services" className="back-button">
        Back to services
      </Link>

      <div className="page-header">
        {provider.profile_image_url && (
          <img
            className="provider-avatar"
            src={provider.profile_image_url}
            alt={businessName}
          />
        )}
        <span className="eyebrow">SERVICE PROVIDER</span>
        <h1>{businessName}</h1>

        <StarRating
          value={providerStats.get(provider.id)?.rating_avg}
          count={providerStats.get(provider.id)?.rating_count}
          size={18}
          showEmpty
        />

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
        {whatsappLink && user && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button"
          >
            <MessageCircle size={18} /> WhatsApp
          </a>
        )}

        {whatsappLink && !user && (
          <button type="button" className="primary-button" onClick={() => setSignInOpen(true)}>
            <MessageCircle size={18} /> WhatsApp
          </button>
        )}

        {user && provider.phone && (
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
            {rankServices(services, providerStats, serviceStats).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </>
      )}

      <SignInToOrder isOpen={signInOpen} onClose={() => setSignInOpen(false)} />
    </main>
  );
}

export default ProviderProfile;