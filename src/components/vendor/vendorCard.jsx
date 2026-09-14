import { Link } from "react-router-dom";
import { Store, MapPin, ArrowUpRight } from "lucide-react";

function VendorCard({ vendor }) {
  if (!vendor) return null;

  const name = vendor.business_name || "KU Market Vendor";
  const image = vendor.logo_url || vendor.cover_image_url;
  const location = vendor.location || "Main Campus";
  const description =
    vendor.description ||
    "Student entrepreneur on KU Market.";

  return (
    <Link
      to={`/marketplace/vendors/${vendor.id}`}
      className="vendor-card"
    >
      <div className="vendor-card__image">
        {image ? (
          <img src={image} alt={name} loading="lazy" />
        ) : (
          <Store size={34} />
        )}
      </div>

      <div className="vendor-card__content">
        <h3>{name}</h3>

        <p>{description}</p>

        <span className="vendor-card__location">
          <MapPin size={15} />
          {location}
        </span>

        <span className="vendor-card__action">
          Visit store
          <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}

export default VendorCard;