import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Camera, GraduationCap, Palette } from "lucide-react";

const services = [
  { icon: Camera, name: "Photography", text: "Capture your campus moments" },
  { icon: Palette, name: "Graphic Design", text: "Bring your next idea to life" },
  { icon: GraduationCap, name: "Tutoring", text: "Learn faster with peer support" },
];

function ServicePreview() {
  return (
    <section className="mm-section mm-container">
      <div className="mm-section__head">
        <div>
          <span className="mm-eyebrow">A LITTLE HELP GOES A LONG WAY</span>
          <h2>Campus services, sorted.</h2>
        </div>

        <Link to="/services" className="mm-viewall">
          View all <ArrowRight size={18} />
        </Link>
      </div>

      <div className="mm-services">
        {services.map(({ icon: Icon, name, text }) => (
          <Link to="/services" className="mm-service" key={name}>
            <span className="mm-service__icon">
              <Icon size={30} strokeWidth={1.7} />
            </span>
            <span className="mm-service__text">
              <strong>{name}</strong>
              <small>{text}</small>
            </span>
            <ArrowUpRight size={22} className="mm-service__arrow" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default ServicePreview;