import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import VendorCard from "../../components/vendor/vendorCard";
import Loader from "../../components/common/loader";
import EmptyState from "../../components/common/EmptyState";

function Vendors() {
  const [vendors, setVendors] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

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

        <h1>KU Market Vendors</h1>

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
          {vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default Vendors;