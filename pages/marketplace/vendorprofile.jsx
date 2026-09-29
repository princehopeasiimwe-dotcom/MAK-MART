import { useEffect, useState } from "react";
import {
  useParams,
  Link,
} from "react-router-dom";
import { supabase } from "../../lib/supabase";
import ProductService from "../../services/ProductService";
import ProductGrid from "../../components/marketplace/productGrid";
import Loader from "../../components/common/loader";

function VendorProfile() {
  const { vendorId } = useParams();

  const [vendor, setVendor] =
    useState(null);

  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadVendor = async () => {
      const { data: vendorData } =
        await supabase
          .from("vendors")
          .select("*")
          .eq("id", vendorId)
          .maybeSingle();

      const productData =
        await ProductService.getProducts({
          vendorId,
        });

      setVendor(vendorData);
      setProducts(productData || []);
      setLoading(false);
    };

    loadVendor();
  }, [vendorId]);

  if (loading) {
    return <Loader message="Loading store..." />;
  }

  if (!vendor) {
    return (
      <section className="page">
        <h1>Vendor not found</h1>

        <Link to="/marketplace/vendors">
          Return to vendors
        </Link>
      </section>
    );
  }

  return (
    <section className="page vendor-profile-page">
      <div className="vendor-profile-header">
        <div className="vendor-avatar">
          {vendor.logo_url ? (
            <img
              src={vendor.logo_url}
              alt={vendor.business_name}
            />
          ) : (
            <span>
              {vendor.business_name?.charAt(0)}
            </span>
          )}
        </div>

        <div>
          <span className="eyebrow">
            KU MARKET VENDOR
          </span>

          <h1>{vendor.business_name}</h1>

          <p>
            {vendor.description ||
              "Student entrepreneur at Makerere University."}
          </p>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <span className="eyebrow">
            STOREFRONT
          </span>

          <h2>Products</h2>
        </div>
      </div>

      <ProductGrid products={products} />
    </section>
  );
}

export default VendorProfile;
