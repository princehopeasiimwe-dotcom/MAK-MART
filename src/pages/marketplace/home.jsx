import { useEffect, useMemo, useState } from "react";

import useProducts from "../../hooks/useProducts";
import useEvents from "../../hooks/useEvents";
import ProductService from "../../services/ProductService";
import ProductSection from "../../components/home/ProductSection";
import CategoryChips from "../../components/home/CategoryChips";
import ServicePreview from "../../components/home/ServicesPreview";
import VendorCTA from "../../components/home/VendorCTA";
import EventsCarousel from "../../components/home/EventsCarousel";
import SponsorsRibbon from "../../components/home/SponsorsRibbon";
import { isOnPromo, sortPromos } from "../../lib/promo";

import usePageSeo from "../../hooks/usePageSeo";

function Home() {
  usePageSeo({ title: "" });

  const { products: featured, loading: featuredLoading } = useProducts({ featured: true });
  const { products: allProducts, loading: allLoading } = useProducts({});
  const { events, loading: eventsLoading } = useEvents();

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    ProductService.getCategories()
      .then((data) =>
        setCategories(data.filter((category) => !category.parent_id).slice(0, 8))
      )
      .catch(() => setCategories([]));
  }, []);

  // products on promotion come first on the home page
  const promos = useMemo(
    () => sortPromos(allProducts.filter(isOnPromo)).slice(0, 4),
    [allProducts]
  );

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
      <EventsCarousel events={events || []} loading={eventsLoading} />

      <SponsorsRibbon />

      <CategoryChips categories={categories} />

      {promos.length > 0 && (
        <ProductSection
          title="🔥 Promotions"
          subtitle="BLACK NOVEMBER DEALS"
          products={promos}
          loading={false}
          viewAllTo="/marketplace/products?promo=1"
        />
      )}

      <ProductSection
        title="Campus favourites"
        subtitle="TRENDING ON MAK MART"
        products={favourites}
        loading={featuredLoading || allLoading}
      />

      <ServicePreview />

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