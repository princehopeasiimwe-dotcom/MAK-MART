import { Link } from "react-router-dom";

const services = [
  { icon: "📸", name: "Photography" },
  { icon: "🎨", name: "Graphic Design" },
  { icon: "📚", name: "Tutoring" },
  { icon: "🧺", name: "Laundry" },
  { icon: "🚚", name: "Delivery" },
  { icon: "💻", name: "Tech Services" },
];

function ServicePreview() {
  return (
    <section className="section services-preview">
      <div className="section-heading">
        <div>
          <span className="eyebrow">NEED A SERVICE?</span>
          <h2>Campus services</h2>
        </div>

        <Link to="/services" className="text-link">
          View all →
        </Link>
      </div>

      <div className="services-grid">
        {services.map((service) => (
          <Link
            to="/services"
            className="service-preview-card"
            key={service.name}
          >
            <span className="service-icon">{service.icon}</span>
            <strong>{service.name}</strong>
            <small>Find providers →</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default ServicePreview;