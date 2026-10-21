import { Link } from "react-router-dom";
import { Store, MapPin, ArrowUpRight } from "lucide-react";

import { StarRating } from "../common/Stars";

function VendorCard({ vendor, stats }) {
  if (!vendor) return null;

  const name = vendor.business_name || "MAK MART Vendor";
  const image = vendor.logo_url || vendor.cover_image_url;
  const location = vendor.location || "Main Campus";
  const description =
    vendor.description ||
    "Student entrepreneur on MAK MART.";

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

        <StarRating value={stats?.rating_avg} count={stats?.rating_count} />

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