import { useEffect, useState } from "react";
import ProductService from "../../services/ProductService";
import ProductSection from "../home/ProductSection";

// "More campus finds" shown under a product: other products, with the
// same category first, never including the one being viewed.
function MoreCampusFinds({ currentId, categoryId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;

    ProductService.getProducts({ limit: 24 })
      .then((list) => {
        if (!active) return;

        const others = list.filter((product) => product.id !== currentId);
        const same = others.filter((product) => product.category_id === categoryId);
        const rest = others.filter((product) => product.category_id !== categoryId);

        setItems([...same, ...rest].slice(0, 4));
      })
      .catch(() => {
        if (active) setItems([]);
      });

    return () => {
      active = false;
    };
  }, [currentId, categoryId]);

  if (!items.length) return null;

  return (
    <ProductSection
      title="More campus finds"
      subtitle="KEEP EXPLORING"
      products={items}
    />
  );
}

export default MoreCampusFinds;