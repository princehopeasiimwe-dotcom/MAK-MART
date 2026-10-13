import { Link } from "react-router-dom";
import {
  Armchair,
  ArrowRight,
  BookOpen,
  LayoutGrid,
  Package,
  Shirt,
  Smartphone,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

// Picks an icon and a soft colour from the category name.
const STYLES = [
  { match: /tech|phone|electronic|gadget/i, icon: Smartphone, tone: "blue" },
  { match: /fashion|cloth|shoe|wear/i, icon: Shirt, tone: "peach" },
  { match: /book|stationery|study/i, icon: BookOpen, tone: "green" },
  { match: /beauty|perfume|skin|cosmetic/i, icon: Sparkles, tone: "pink" },
  { match: /food|snack|drink|meal/i, icon: UtensilsCrossed, tone: "yellow" },
  { match: /home|living|furniture|room/i, icon: Armchair, tone: "lavender" },
  { match: /^more$/i, icon: LayoutGrid, tone: "peach" },
];

function styleFor(name = "") {
  return (
    STYLES.find((style) => style.match.test(name)) || {
      icon: Package,
      tone: "peach",
    }
  );
}

function CategoryChips({ categories = [] }) {
  if (!categories.length) return null;

  return (
    <section className="mm-section mm-container">
      <div className="mm-section__head">
        <div>
          <span className="mm-eyebrow">SOMETHING FOR EVERY STUDENT</span>
          <h2>Shop by category</h2>
        </div>

        <Link to="/marketplace/products" className="mm-viewall">
          View all <ArrowRight size={18} />
        </Link>
      </div>

      <div className="mm-chips">
        {categories.map((category) => {
          const { icon: Icon, tone } = styleFor(category.name);

          return (
            <Link
              key={category.id}
              to={`/marketplace/products?category=${category.id}`}
              className="mm-chip"
            >
              <span className={`mm-chip__circle mm-tone-${tone}`}>
                {category.image_url ? (
                  <img src={category.image_url} alt="" loading="lazy" />
                ) : (
                  <Icon size={30} strokeWidth={1.6} />
                )}
              </span>
              <span className="mm-chip__name">{category.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default CategoryChips;