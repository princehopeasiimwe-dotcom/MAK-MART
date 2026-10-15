import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";

import useProducts from "../../hooks/useProducts";
import useEvents from "../../hooks/useEvents";
import ProductService from "../../services/ProductService";
import ProductSection from "../../components/home/ProductSection";
import CategoryChips from "../../components/home/CategoryChips";
import ServicePreview from "../../components/home/ServicesPreview";
import VendorCTA from "../../components/home/VendorCTA";
import EventSlider from "../../components/events/EventSlider";

const PILLARS = [
  { icon: Store, title: "Support student businesses", text: "Every purchase backs a Makerere entrepreneur." },
  { icon: MapPin, title: "Find vendors nearby", text: "Shop from sellers around your campus." },
  { icon: MessageCircle, title: "Chat on WhatsApp", text: "Talk to sellers directly before you buy." },
  { icon: ShieldCheck, title: "Clear prices", text: "Honest prices and real vendor profiles." },
];

import usePageSeo from "../../hooks/usePageSeo";

function Home() {
  usePageSeo({ title: "" });

  const { products: featured, loading: featuredLoading } = useProducts({ featured: true });
  const { products: allProducts, loading: allLoading } = useProducts({});
  const { events, loading: eventsLoading } = useEvents();

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    ProductService.getCategories()
      .then((data) => setCategories(data.slice(0, 8)))
      .catch(() => setCategories([]));
  }, []);

  // "Campus favourites" = featured products; if none are featured yet,
  // fall back to the newest products so the section is never empty.
  const favourites = useMemo(
    () => (featured.length ? featured : allProducts).slice(0, 4),
    [featured, allProducts]
  );

  // "Recommended for you" = other products not already shown above.
  const recommended = useMemo(() => {
    const shown = new Set(favourites.map((product) => product.id));
    return allProducts.filter((product) => !shown.has(product.id)).slice(0, 4);
  }, [allProducts, favourites]);

  return (
    <div className="mm-home">
      <section className="mm-hero-wrap mm-container">
        <div className="mm-hero">
          <div className="mm-hero__content">
            <span className="mm-pill">
              <Sparkles size={16} aria-hidden="true" />
              THE MAKERERE MARKETPLACE
            </span>

            <h1>
              Everything you need.
              <br />
              Right on campus.
            </h1>

            <p>
              Shop student businesses, discover local services, and find your
              next campus favourite.
            </p>

            <div className="mm-hero__actions">
              <Link to="/marketplace/products" className="mm-btn mm-btn--primary">
                Explore marketplace <ArrowRight size={20} />
              </Link>

              <Link to="/vendor/signup" className="mm-btn mm-btn--ghost">
                Start selling <ArrowUpRight size={20} />
              </Link>
            </div>

            <div className="mm-hero__trust">
              <span className="mm-hero__trust-icon">
                <ShieldCheck size={26} />
              </span>
              <div>
                <strong>Your campus. Your community.</strong>
                <span>Buy local. Support student businesses.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mm-pillars mm-container" aria-label="Why MAK MART">
        {PILLARS.map(({ icon: Icon, title, text }) => (
          <div className="mm-pillar" key={title}>
            <span className="mm-pillar__icon">
              <Icon size={22} />
            </span>
            <div>
              <strong>{title}</strong>
              <small>{text}</small>
            </div>
          </div>
        ))}
      </section>

      <CategoryChips categories={categories} />

      <ProductSection
        title="Campus favourites"
        subtitle="TRENDING ON MAK MART"
        products={favourites}
        loading={featuredLoading || allLoading}
      />

      <ServicePreview />

      {!eventsLoading && events?.length > 0 && (
        <EventSlider
          events={events}
          title="Upcoming events"
          subtitle="WHAT'S HAPPENING AROUND CAMPUS"
        />
      )}

      {recommended.length > 0 && (
        <ProductSection
          title="Recommended for you"
          subtitle="PICKED FOR YOU"
          products={recommended}
          loading={false}
        />
      )}

      <VendorCTA />
    </div>
  );
}

export default Home;