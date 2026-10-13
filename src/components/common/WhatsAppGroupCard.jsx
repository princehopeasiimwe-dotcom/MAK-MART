import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import SettingsService from "../../services/settingsService";

// Shows the admin-configured vendor WhatsApp community group link
// (Admin -> Settings) on seller dashboards. Reads the live setting,
// so changing the link in Admin Settings updates every dashboard
// without a redeploy, including for vendors approved earlier.
//
// Props:
//   approved - only approved sellers get the join button; pending
//              sellers see a short note instead.
function WhatsAppGroupCard({ approved = true }) {
  const [link, setLink] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    SettingsService.getSetting("vendor_whatsapp_group_link")
      .then((value) => {
        if (active) setLink((value || "").trim());
      })
      .catch(() => {
        if (active) setLink("");
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Nothing to show until the admin has set a link.
  if (!loaded || !link) return null;

  // Only ever render a real https link (never javascript: etc.).
  const safeLink = /^https:\/\//i.test(link) ? link : "";
  if (!safeLink) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
        margin: "0 0 24px",
        padding: "18px 20px",
        background: "var(--color-surface, #fff)",
        border: "1px solid var(--color-border, #eee7e5)",
        borderLeft: "4px solid #25d366",
        borderRadius: "8px",
      }}
    >
      <MessageCircle size={28} color="#25d366" aria-hidden="true" />

      <div style={{ flex: "1 1 220px" }}>
        <strong>MAK MART vendor community</strong>
        <p style={{ margin: "4px 0 0", color: "var(--color-muted, #77717d)" }}>
          {approved
            ? "Join our WhatsApp group to get updates, tips and support from other sellers."
            : "You'll be able to join the vendor WhatsApp group once your account is approved."}
        </p>
      </div>

      {approved && (
        <a
          href={safeLink}
          target="_blank"
          rel="noopener noreferrer"
          className="primary-button"
          style={{ textDecoration: "none" }}
        >
          Join WhatsApp group
        </a>
      )}
    </div>
  );
}

export default WhatsAppGroupCard;