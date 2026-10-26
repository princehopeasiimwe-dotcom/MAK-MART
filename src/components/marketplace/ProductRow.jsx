import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import ProductCard from "./productcard";

// One shelf: a title and a single row of products that scrolls sideways
// (arrow buttons on a computer, swipe on a phone).
function ProductRow({ title, eyebrow, to, products = [] }) {
  const trackRef = useRef(null);

  if (!products.length) return null;

  const scrollBy = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * Math.max(track.clientWidth * 0.8, 240),
      behavior: "smooth",
    });
  };

  return (
    <section className="mm-row" aria-label={title}>
      <div className="mm-row__head">
        <div>
          {eyebrow && <span className="mm-row__eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>

        <div className="mm-row__tools">
          {to && (
            <Link to={to} className="mm-row__all">
              See all <ArrowRight size={16} />
            </Link>
          )}

          <button
            type="button"
            className="mm-row__arrow"
            onClick={() => scrollBy(-1)}
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="mm-row__arrow"
            onClick={() => scrollBy(1)}
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mm-row__track" ref={trackRef}>
        {products.map((product) => (
          <div className="mm-row__item" key={product.id}>
            <ProductCard product={product} />
          </div>
        ))}

        {to && products.length >= 4 && (
          <Link to={to} className="mm-row__more">
            See all
            <ArrowRight size={18} />
          </Link>
        )}
      </div>
    </section>
  );
}

export default ProductRow;