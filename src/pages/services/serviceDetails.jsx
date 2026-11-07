import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";

import ServiceCard from "../../components/services/ServiceCard";
import useService from "../../hooks/useService";
import { formatCurrency } from "../../utils/currency";
import useAuth from "../../hooks/useAuth";
import useRatings from "../../hooks/useRatings";
import { StarRating } from "../../components/common/Stars";
import SignInToOrder from "../../components/marketplace/SignInToOrder";
import ServiceRequestModal from "../../components/services/ServiceRequestModal";
import { trackServiceView } from "../../lib/analytics";
import ServiceService from "../../services/services";

import usePageSeo from "../../hooks/usePageSeo";
import ReportButton from "../../components/common/ReportButton";

function ServiceDetails() {
  const { serviceId } = useParams();
  const { service, loading, error, fetchService } = useService(serviceId);

  const { user, loading: authLoading } = useAuth();
  const { serviceStats, providerStats } = useRatings();
  const [signInOpen, setSignInOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [packages, setPackages] = useState([]);
  const [pickedPackage, setPickedPackage] = useState("");

  usePageSeo({ title: service?.name || "Service", description: service?.description, image: service?.image_url });

  useEffect(() => {
    fetchService(serviceId).then((result) => {
      if (result?.id) trackServiceView(result.id);
    });
  }, [fetchService, serviceId]);

  useEffect(() => {
    let alive = true;
    ServiceService.getPackages(serviceId)
      .then((rows) => alive && setPackages(rows))
      .catch(() => alive && setPackages([]));
    return () => {
      alive = false;
    };
  }, [serviceId]);

  if (loading) return <main className="page-container"><p>Loading service...</p></main>;
  if (error) return <main className="page-container"><p role="alert">{error}</p></main>;
  if (!service) return <main className="page-container"><p>Service not found.</p></main>;

  const provider = service.service_providers;
  const providerPhone = provider?.phone;

  const handleContact = (packageId = "") => {
    if (!providerPhone) return;
    setPickedPackage(typeof packageId === "string" ? packageId : "");
    if (user) setRequestOpen(true);
    else setSignInOpen(true);
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

          <StarRating
            value={serviceStats.get(service.id)?.rating_avg ?? providerStats.get(service.provider_id)?.rating_avg}
            count={serviceStats.get(service.id)?.rating_count ?? providerStats.get(service.provider_id)?.rating_count}
            size={18}
            showEmpty
          />

          {service.price != null && (
            <p className="service-details__price">
              {packages.length > 0 ? "From " : ""}{formatCurrency(service.price)}
            </p>
          )}

          <p>{service.description || "Professional services available around campus."}</p>

          {packages.length > 0 && (
            <section className="package-list" aria-label="Packages and prices">
              <h2>Packages and prices</h2>
              {packages.map((p) => (
                <div className="package-list__row" key={p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    {p.description && <small>{p.description}</small>}
                  </div>
                  <span className="package-list__price">
                    {formatCurrency(p.price)}{p.unit ? <small> {p.unit}</small> : null}
                  </span>
                  {providerPhone && (
                    <button type="button" className="secondary-button" disabled={authLoading} onClick={() => handleContact(p.id)}>
                      Choose
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}

          {providerPhone && (
            <button
              type="button"
              className="primary-button"
              disabled={authLoading}
              onClick={() => handleContact()}
            >
              <MessageCircle size={18} />
              Request this service
            </button>
          )}

          <ReportButton type="service" id={service.id} label="Report this service" />
        </div>
      </div>

      <SignInToOrder isOpen={signInOpen} onClose={() => setSignInOpen(false)} />
      <ServiceRequestModal
        service={service}
        provider={provider}
        packages={packages}
        initialPackageId={pickedPackage}
        isOpen={requestOpen && Boolean(user)}
        onClose={() => setRequestOpen(false)}
      />
    </main>
  );
}

export default ServiceDetails;