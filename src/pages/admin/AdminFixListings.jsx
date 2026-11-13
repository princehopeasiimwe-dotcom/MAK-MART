import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightLeft, Search } from "lucide-react";

import { supabase } from "../../lib/supabase";
import Modal from "../../components/common/modal";
import { formatDate } from "../../utils/formatters";
import { flattenTree } from "../../lib/categoryTree";

const TABS = [
  { key: "product", label: "Products" },
  { key: "service", label: "Services" },
  { key: "event", label: "Events" },
];

const TYPE_NAME = { product: "Product", service: "Service", event: "Event" };

async function loadListings(kind) {
  if (kind === "product") {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, price, category_id, created_at, vendors ( business_name )"
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      title: row.name,
      owner: row.vendors?.business_name || "—",
      categoryId: row.category_id,
      price: row.price,
      date: row.created_at,
    }));
  }

  if (kind === "service") {
    const { data, error } = await supabase
      .from("services")
      .select(
        "id, name, price, location, category_id, created_at, service_providers ( business_name )"
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      title: row.name,
      owner: row.service_providers?.business_name || "—",
      categoryId: row.category_id,
      price: row.price,
      location: row.location,
      date: row.created_at,
    }));
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, location, start_time, ticket_price, created_at, profiles:created_by ( full_name )"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    owner: row.profiles?.full_name || "—",
    price: row.ticket_price,
    location: row.location,
    date: row.start_time || row.created_at,
  }));
}

function AdminFixListings() {
  const [tab, setTab] = useState("product");
  const [rows, setRows] = useState([]);
  const [productCats, setProductCats] = useState([]);
  const [serviceCats, setServiceCats] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [moving, setMoving] = useState(null); // the row being moved
  const [target, setTarget] = useState("");
  const [form, setForm] = useState({});
  const [moveBusy, setMoveBusy] = useState(false);
  const [moveError, setMoveError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [list, pc, sc] = await Promise.all([
        loadListings(tab),
        supabase.from("categories").select("id, name, parent_id").order("name"),
        supabase.from("service_categories").select("id, name").order("name"),
      ]);
      setRows(list);
      // full paths, e.g. "Technology › Phones › iPhones"
      setProductCats(
        flattenTree(pc.data || []).map((c) => ({ id: c.id, name: c.path }))
      );
      setServiceCats(sc.data || []);
    } catch (err) {
      setError(err.message || "Could not load the list.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.title?.toLowerCase().includes(term) ||
        row.owner?.toLowerCase().includes(term)
    );
  }, [rows, search]);

  const categoriesFor = (kind) =>
    kind === "service" ? serviceCats : productCats;

  const changeCategory = async (row, categoryId) => {
    setBusyId(row.id);
    setError(null);
    setNotice(null);
    try {
      const { error: rpcError } = await supabase.rpc("admin_set_category", {
        p_kind: tab,
        p_id: row.id,
        p_category: categoryId || null,
      });
      if (rpcError) throw rpcError;
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, categoryId: categoryId || null } : item
        )
      );
      setNotice(`"${row.title}" moved to its new category. The owner was notified.`);
    } catch (err) {
      setError(err.message || "Could not change the category.");
    } finally {
      setBusyId(null);
    }
  };

  const openMove = (row) => {
    const first = TABS.map((t) => t.key).find((key) => key !== tab);
    setMoving(row);
    setTarget(first);
    setForm({
      category: "",
      start: "",
      end: "",
      location: row.location || "",
      price: row.price ?? "",
    });
    setMoveError(null);
  };

  const closeMove = () => {
    if (!moveBusy) setMoving(null);
  };

  const setField = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));

  const submitMove = async (event) => {
    event.preventDefault();
    setMoveError(null);

    if (target === "event" && !form.start) {
      setMoveError("Choose when the event starts.");
      return;
    }

    setMoveBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc("admin_move_listing", {
        p_from: tab,
        p_id: moving.id,
        p_to: target,
        p_category: target === "event" ? null : form.category || null,
        p_start:
          target === "event" ? new Date(form.start).toISOString() : null,
        p_end:
          target === "event" && form.end
            ? new Date(form.end).toISOString()
            : null,
        p_price: form.price === "" ? null : Number(form.price),
        p_location: form.location || null,
      });
      if (rpcError) throw rpcError;

      setNotice(
        `"${moving.title}" is now listed as ${
          target === "event" ? "an" : "a"
        } ${TYPE_NAME[target].toLowerCase()}. The owner was notified.`
      );
      setMoving(null);
      await load();
    } catch (err) {
      setMoveError(err.message || "Could not move this listing.");
    } finally {
      setMoveBusy(false);
    }
  };

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h1>Fix wrongly posted items</h1>
          <p>
            Change a category, or move something to where it belongs — for
            example a service that is really an event. The person who posted it
            is told automatically.
          </p>
        </div>
      </div>

      <div className="service-category-filters">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`service-category-chip ${
              tab === item.key ? "active" : ""
            }`}
            onClick={() => {
              setTab(item.key);
              setSearch("");
              setNotice(null);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="form-group" style={{ maxWidth: 420, marginTop: 14 }}>
        <label htmlFor="fix-search">
          <Search size={14} /> Search by name or poster
        </label>
        <input
          id="fix-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Type to filter..."
        />
      </div>

      {notice && <p className="form-success">{notice}</p>}
      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing found</h3>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{TYPE_NAME[tab]}</th>
              <th>Posted by</th>
              <th>{tab === "event" ? "Starts" : "Category"}</th>
              <th>Move</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td>{row.title}</td>
                <td>{row.owner}</td>
                <td>
                  {tab === "event" ? (
                    formatDate(row.date)
                  ) : (
                    <select
                      value={row.categoryId || ""}
                      disabled={busyId === row.id}
                      onChange={(event) =>
                        changeCategory(row, event.target.value)
                      }
                      aria-label={`Category for ${row.title}`}
                    >
                      <option value="">No category</option>
                      {categoriesFor(tab).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      onClick={() => openMove(row)}
                      title="Move to another type"
                    >
                      <ArrowRightLeft size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p style={{ marginTop: 16 }}>
        Need to add or rename categories? Go to{" "}
        <Link to="/admin/categories">Categories</Link>.
      </p>

      <Modal
        isOpen={Boolean(moving)}
        onClose={closeMove}
        title="Move to the right place"
      >
        {moving && (
          <form
            onSubmit={submitMove}
            style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr" }}
          >
            <p>
              <strong>{moving.title}</strong> is currently a{" "}
              <strong>{TYPE_NAME[tab].toLowerCase()}</strong>. Where does it
              belong?
            </p>

            <div className="form-group">
              <label htmlFor="move-target">Move it to</label>
              <select
                id="move-target"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                  setField("category", "");
                }}
              >
                {TABS.filter((item) => item.key !== tab).map((item) => (
                  <option key={item.key} value={item.key}>
                    {TYPE_NAME[item.key]}
                  </option>
                ))}
              </select>
            </div>

            {target === "event" && (
              <>
                <div className="form-group">
                  <label htmlFor="move-start">Starts *</label>
                  <input
                    id="move-start"
                    type="datetime-local"
                    value={form.start}
                    onChange={(event) => setField("start", event.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="move-end">Ends (optional)</label>
                  <input
                    id="move-end"
                    type="datetime-local"
                    value={form.end}
                    onChange={(event) => setField("end", event.target.value)}
                  />
                </div>
              </>
            )}

            {target !== "event" && (
              <div className="form-group">
                <label htmlFor="move-category">Category</label>
                <select
                  id="move-category"
                  value={form.category}
                  onChange={(event) => setField("category", event.target.value)}
                >
                  <option value="">Choose later</option>
                  {categoriesFor(target).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="move-location">Location</label>
              <input
                id="move-location"
                value={form.location}
                onChange={(event) => setField("location", event.target.value)}
                placeholder="Where is it?"
              />
            </div>

            <div className="form-group">
              <label htmlFor="move-price">
                {target === "event" ? "Ticket price (optional)" : "Price (UGX)"}
              </label>
              <input
                id="move-price"
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => setField("price", event.target.value)}
              />
            </div>

            <p style={{ fontSize: 13, opacity: 0.8 }}>
              The name, description and photo come along. Reviews and view
              counts stay with the old listing and are not carried over.
            </p>

            {moveError && <p className="form-error">{moveError}</p>}

            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                type="button"
                className="secondary-button"
                style={{ width: "auto", padding: "10px 18px" }}
                onClick={closeMove}
                disabled={moveBusy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                style={{ whiteSpace: "nowrap", width: "auto", padding: "10px 18px" }}
                disabled={moveBusy}
              >
                {moveBusy ? "Moving..." : "Move it"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}

export default AdminFixListings;