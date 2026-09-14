import { Search, ArrowRight, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

function Hero() {
  const [search, setSearch] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    const query = search.trim();

    if (!query) return;

    window.location.href = `/products?search=${encodeURIComponent(query)}`;
  };

  return (
    <section className="home-hero">
      <div className="home-hero__content">
        <span className="eyebrow eyebrow--light">
          MAKERERE UNIVERSITY
        </span>

        <h1>
          Everything students
          <span> buy, sell & discover.</span>
        </h1>

        <p>
          Discover products from student entrepreneurs,
          services around campus and events happening
          in the Makerere community.
        </p>

        <form
          className="hero-search"
          onSubmit={handleSubmit}
        >
          <Search size={21} />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search perfumes, clothes, food, services..."
          />

          <button type="submit">
            Search
          </button>
        </form>

        <div className="home-hero__actions">
          <Link
            to="/products"
            className="hero-primary-action"
          >
            Explore market
            <ArrowRight size={18} />
          </Link>

          <Link
            to="/vendor/signup"
            className="hero-secondary-action"
          >
            <Store size={18} />
            Start selling
          </Link>
        </div>
      </div>

      <div className="home-hero__visual">
        <div className="hero-visual-card hero-visual-card--main">
          <span>MAK MART</span>

          <strong>
            Built by
            <br />
            students.
          </strong>

          <p>
            Discover the people, products and
            opportunities around campus.
          </p>
        </div>

        <div className="hero-visual-card hero-visual-card--floating">
          <span className="hero-visual-card__number">
            100+
          </span>

          <span>
            Student businesses
            <br />
            growing together
          </span>
        </div>
      </div>
    </section>
  );
}

export default Hero;