import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronRight, Shirt, Sparkles, Utensils, Laptop, BookOpen, ShoppingBag,
  ArrowRight, Store, Zap
} from "lucide-react";

import useProducts from "../../hooks/useProducts";
import useEvents from "../../hooks/useEvents";
import ProductService from "../../services/ProductService";
import ProductSection from "../../components/home/ProductSection";
import ServicePreview from "../../components/home/ServicesPreview";
import VendorCTA from "../../components/home/VendorCTA";
import EventSlider from "../../components/events/EventSlider";

const categoryIcons = [Shirt, Sparkles, Utensils, Laptop, BookOpen, ShoppingBag];

function Home() {
  const navigate = useNavigate();
  const { products, loading: productsLoading } = useProducts({ featured: true });
  const { events, loading: eventsLoading } = useEvents();

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    ProductService.getCategories()
      .then((data) => setCategories(data.slice(0, 8)))
      .catch(() => setCategories([]));
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("search");
    if (query?.trim()) {
      navigate(`/marketplace/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="home-page jumia-home">
      <section className="home-hero-jumia">
        <div className="home-hero-jumia__inner">
          <aside className="home-categories">
            <div className="home-categories__title">Shop by Category</div>
            {categories.map((category, index) => {
              const Icon = categoryIcons[index % categoryIcons.length];
              return (
                <Link
                  key={category.id}
                  to={`/marketplace/products?category=${category.id}`}
                  className="home-categories__item"
                >
                  <Icon size={18} />
                  <span>{category.name}</span>
                  <ChevronRight size={15} />
                </Link>
              );
            })}

            <Link
              to="/marketplace/products"
              className="home-categories__item"
            >
              <ShoppingBag size={18} />
              <span>More</span>
              <ChevronRight size={15} />
            </Link>
          </aside>

          <div className="home-promo">
            <div className="home-promo__copy">
              <span className="promo-kicker"><Zap size={14} /> MAKERERE STUDENT DEALS</span>
              <h1>Everything you need.<br /><strong>Right on campus.</strong></h1>
              <p>Shop from student businesses, discover services and find what's happening around Makerere.</p>

              <form className="home-promo__search" onSubmit={handleSearch}>
                <input name="search" type="search" placeholder="What are you looking for today?" />
                <button type="submit">Search</button>
              </form>

              <div className="home-promo__actions">
                <Link to="/marketplace/products">Shop now <ArrowRight size={17} /></Link>
                <Link to="/vendor/signup"><Store size={17} /> Sell on MAK MART</Link>
              </div>
            </div>

            <div className="home-promo__visual">
              <div className="promo-circle promo-circle--one" />
              <div className="promo-circle promo-circle--two" />
              <div className="promo-card">
                <span>MAK MART</span>
                <strong>Student<br />businesses.</strong>
                <small>Buy local. Support students.</small>
              </div>
              <div className="promo-price">UGX<br /><b>BEST<br />DEALS</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-trust-strip">
        <div><b>🛍️ Shop student-made</b><span>Unique products around campus</span></div>
        <div><b>🚀 Fast campus access</b><span>Connect directly with vendors</span></div>
        <div><b>💬 Order directly</b><span>Simple WhatsApp ordering</span></div>
        <div><b>🏪 Sell your hustle</b><span>Open your MAK MART storefront</span></div>
      </section>

      {!eventsLoading && events?.length > 0 && (
        <EventSlider events={events} title="Upcoming events" subtitle="WHAT'S HAPPENING AROUND CAMPUS" />
      )}

      <section className="section home-category-section">
        <div className="section-heading">
          <div><span className="eyebrow">EXPLORE</span><h2>Shop by category</h2></div>
          <Link to="/marketplace/products" className="section-link">View all <ArrowRight size={16} /></Link>
        </div>
        <div className="home-category-grid">
          {categories.map((category, index) => {
            const Icon = categoryIcons[index % categoryIcons.length];
            return (
              <Link
                key={category.id}
                to={`/marketplace/products?category=${category.id}`}
                className="home-category-card"
              >
                <div className="home-category-card__icon"><Icon size={25} /></div>
                <b>{category.name}</b>
                <span>Shop now <ArrowRight size={14} /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <ProductSection products={products} loading={productsLoading} title="Top picks for you" subtitle="TRENDING ON MAK MART" />

      <ServicePreview />
      <VendorCTA />
    </div>
  );
}

export default Home;
