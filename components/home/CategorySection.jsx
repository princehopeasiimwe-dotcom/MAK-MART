import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Shirt,
  Sparkles,
  Utensils,
  Laptop,
  BookOpen,
  ArrowRight,
} from "lucide-react";

const categories = [
  {
    name: "Fashion",
    slug: "fashion",
    description: "Clothes, shoes & accessories",
    icon: Shirt,
  },
  {
    name: "Beauty",
    slug: "beauty",
    description: "Perfumes, cosmetics & skincare",
    icon: Sparkles,
  },
  {
    name: "Food",
    slug: "food",
    description: "Meals, snacks & drinks",
    icon: Utensils,
  },
  {
    name: "Technology",
    slug: "technology",
    description: "Gadgets & accessories",
    icon: Laptop,
  },
  {
    name: "Books",
    slug: "books",
    description: "Books & academic materials",
    icon: BookOpen,
  },
  {
    name: "More",
    slug: "all",
    description: "Discover more businesses",
    icon: ShoppingBag,
  },
];

function CategorySection() {
  return (
    <section className="home-section category-section">
      <div className="section-header">
        <div>
          <span className="eyebrow">EXPLORE</span>
          <h2>Shop the campus</h2>
        </div>

        <Link to="/marketplace/products" className="section-link">
          View all <ArrowRight size={17} />
        </Link>
      </div>

      <div className="category-grid">
        {categories.map((category) => {
          const Icon = category.icon;

          return (
            <Link
              key={category.slug}
              to={
                category.slug === "all"
                  ? "/marketplace/products"
                  : `/marketplace/products?category=${category.slug}`
              }
              className="category-card"
            >
              <div className="category-card__icon">
                <Icon size={26} />
              </div>

              <h3>{category.name}</h3>

              <p>{category.description}</p>

              <span>
                Explore <ArrowRight size={15} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default CategorySection;