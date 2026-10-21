import { useEffect, useMemo, useState } from "react";
import useRatings from "../../hooks/useRatings";
import { rankVendors } from "../../lib/ranking";
import { supabase } from "../../lib/supabase";
import VendorCard from "../../components/vendor/vendorCard";
import Loader from "../../components/common/loader";
import EmptyState from "../../components/common/EmptyState";

import usePageSeo from "../../hooks/usePageSeo";

function Vendors() {
  usePageSeo({ title: "Campus vendors", description: "Meet the verified student vendors selling on MAK MART at Makerere University." });

  const [vendors, setVendors] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const { vendorStats } = useRatings();
  const ranked = useMemo(() => rankVendors(vendors, vendorStats), [vendors, vendorStats]);

  useEffect(() => {
    const loadVendors = async () => {
      const { data, error } =
        await supabase
          .from("vendors")
          .select("*")
          .eq("is_active", true)
          .order("created_at", {
            ascending: false,
          });

      if (!error) {
        setVendors(data || []);
      }

      setLoading(false);
    };

    loadVendors();
  }, []);

  if (loading) {
    return (
      <Loader message="Loading vendors..." />
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <span className="eyebrow">
          STUDENT ENTREPRENEURS
        </span>

        <h1>MAK MART Vendors</h1>

        <p>
          Explore businesses run by the Makerere
          University community.
        </p>
      </div>

      {!vendors.length ? (
        <EmptyState
          title="No vendors found"
          message="Approved vendors will appear here."
        />
      ) : (
        <div className="vendor-grid">
          {ranked.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              stats={vendorStats.get(vendor.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default Vendors;