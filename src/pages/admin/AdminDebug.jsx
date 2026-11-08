import { useEffect, useMemo, useRef, useState } from "react";
import { Bug, Pause, Play, Trash2, Copy, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { DEBUG_TOPIC } from "../../lib/debugLog";

const MAX_ROWS = 300;

// Live error feed from everyone's browsers. Nothing is stored anywhere:
// close this page and the feed is gone. That is what keeps it free.
function AdminDebug() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("");
  const pausedRef = useRef(false);
  const channelRef = useRef(null);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const channel = supabase
      .channel(DEBUG_TOPIC, { config: { private: true, broadcast: { self: true } } })
      .on("broadcast", { event: "log" }, ({ payload }) => {
        if (pausedRef.current) return;
        setRows((current) => [{ ...payload, id: `${payload.at}-${Math.random()}` }, ...current].slice(0, MAX_ROWS));
      })
      .subscribe((state) => {
        if (state === "SUBSCRIBED") setStatus("live");
        else if (["CHANNEL_ERROR", "TIMED_OUT"].includes(state)) setStatus("refused");
        else if (state === "CLOSED") setStatus("closed");
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, []);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q)) : rows;
  }, [rows, filter]);

  const sendTest = () =>
    channelRef.current?.send({
      type: "broadcast",
      event: "log",
      payload: { level: "info", message: "Test message from the admin page", page: "/admin/debug", user: "admin", at: new Date().toISOString() },
    });

  const copyAll = () => navigator.clipboard?.writeText(shown.map((r) => `[${r.at}] ${r.level} ${r.page} (${r.user}) ${r.message}${r.extra ? " | " + r.extra : ""}`).join("\n"));

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <h1><Bug size={26} /> Live debug feed</h1>
        <p>
          Errors from people using the site appear here as they happen. Nothing is saved, so it
          costs nothing: it only shows what happens while this page is open.
        </p>
      </div>

      <p className="product-limit">
        {status === "live" && "Connected. Waiting for errors..."}
        {status === "connecting" && "Connecting..."}
        {status === "refused" && "Not allowed to listen. Run database update 025 in Supabase, then reload this page."}
        {status === "closed" && "Disconnected. Reload the page to reconnect."}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <button type="button" className="primary-button" onClick={() => setPaused((p) => !p)}>
          {paused ? <><Play size={16} /> Resume</> : <><Pause size={16} /> Pause</>}
        </button>
        <button type="button" className="primary-button" onClick={() => setRows([])}><Trash2 size={16} /> Clear</button>
        <button type="button" className="primary-button" onClick={copyAll} disabled={!shown.length}><Copy size={16} /> Copy</button>
        <button type="button" className="primary-button" onClick={sendTest} disabled={status !== "live"}><Send size={16} /> Send test</button>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter (page, user, text)..."
          style={{ flex: "1 1 200px", minWidth: 0 }}
        />
      </div>

      {!shown.length ? (
        <p>No messages yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {shown.map((row) => (
            <div key={row.id} className="insights-card" style={{ padding: 12, overflowWrap: "anywhere" }}>
              <small>
                {new Date(row.at).toLocaleTimeString()} · <strong>{row.level}</strong> · {row.page} · user {row.user}
              </small>
              <div>{row.message}</div>
              {row.extra && <small>{row.extra}</small>}
              {row.agent && <small style={{ display: "block", opacity: 0.6 }}>{row.agent}</small>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminDebug;
