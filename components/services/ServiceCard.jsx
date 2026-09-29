import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  MapPin,
  Star,
  BriefcaseBusiness,
} from "lucide-react";

function ServiceCard({ service }) {
  if (!service) return null;

  const serviceId = service.id;

  const businessName =
    service.business_name ||
    service.name ||
    service.title ||
    "Service Provider";

  const description =
    service.description ||
    "Professional services available around campus.";

  const image =
    service.image_url ||
    service.cover_image_url ||
    service.avatar_url ||
    null;

  const category =
    service.service_categories?.name ||
    "Service";

  const location =
    service.location ||
    "Makerere University";

  const rating =
    service.rating ||
    service.average_rating ||
    null;

  return (
    <Link
      to={`/services/${serviceId}`}
      className="service-card"
    >
      <div className="service-card__image">
        {image ? (
          <img
            src={image}
            alt={businessName}
            loading="lazy"
          />
        ) : (
          <div className="service-card__placeholder">
            <BriefcaseBusiness size={34} />
          </div>
        )}

        <span className="service-card__category">
          {category}
        </span>

        <div className="service-card__open">
          <ArrowUpRight size={18} />
        </div>
      </div>

      <div className="service-card__content">
        <h3>{businessName}</h3>

        <p className="service-card__description">
          {description}
        </p>

        <div className="service-card__meta">
          <span>
            <MapPin size={15} />
            {location}
          </span>

          {rating && (
            <span className="service-card__rating">
              <Star size={15} fill="currentColor" />
              {Number(rating).toFixed(1)}
            </span>
          )}
        </div>

        <span className="service-card__action">
          View service
          <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}

export default ServiceCard;