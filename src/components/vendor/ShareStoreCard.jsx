import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Share2, Check } from "lucide-react";

import { makeSharePoster } from "../../lib/sharePoster";

// Lets a vendor post their shop on a WhatsApp status (or anywhere):
// a ready-made MAK MART picture plus a link that opens their shop.
function ShareStoreCard({ vendor }) {
  const [poster, setPoster] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const link = useMemo(
    () =>
      vendor?.id
        ? `${window.location.origin}/marketplace/vendors/${vendor.id}?ref=status`
        : "",
    [vendor?.id]
  );

  const caption = vendor
    ? `🛍️ Shop ${vendor.business_name} on MAK MART, Makerere's student marketplace.\nTap to see my products 👇\n${link}`
    : "";

  useEffect(() => {
    if (!vendor?.id) return undefined;
    let alive = true;
    makeSharePoster({
      shopName: vendor.business_name,
      shopLogoUrl: vendor.logo_url,
    })
      .then((result) => alive && setPoster(result))
      .catch(() => alive && setPoster(null));
    return () => {
      alive = false;
    };
  }, [vendor?.id, vendor?.business_name, vendor?.logo_url]);

  if (!vendor) return null;

  const fileName = `${(vendor.business_name || "my-shop")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-mak-mart.png`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copy your shop link:", link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const download = () => {
    if (!poster) return;
    const url = URL.createObjectURL(poster.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const share = async () => {
    setMessage("");
    if (!poster) return;
    setBusy(true);

    try {
      const file = new File([poster.blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        // Opens the phone's share sheet: pick WhatsApp > My status.
        await navigator.share({ files: [file], text: caption });
      } else if (navigator.share) {
        await navigator.share({ text: caption, url: link });
      } else {
        download();
        await copyLink();
        setMessage(
          "Picture saved and link copied. Open WhatsApp > Status, add the picture, and paste the link."
        );
      }
    } catch (err) {
      // closing the share sheet is not an error
      if (err?.name !== "AbortError") {
        setMessage("Could not open sharing. Use Save picture and Copy link instead.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="share-store">
      <div className="share-store__text">
        <h3>Share your market</h3>
        <p>
          Post your shop on your WhatsApp status. Customers tap the link and
          land straight on your products.
        </p>

        {!vendor.is_active && (
          <p className="share-store__note">
            Your link starts working as soon as the admin approves your store.
          </p>
        )}

        <div className="share-store__link">
          <input value={link} readOnly aria-label="Your shop link" onFocus={(e) => e.target.select()} />
          <button type="button" onClick={copyLink} title="Copy link">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="share-store__actions">
          <button type="button" className="primary-button" onClick={share} disabled={!poster || busy}>
            <Share2 size={16} /> Share to status
          </button>
          <button type="button" className="secondary-button" onClick={download} disabled={!poster}>
            <Download size={16} /> Save picture
          </button>
        </div>

        {message && <p className="share-store__note">{message}</p>}
      </div>

      <div className="share-store__preview">
        {poster ? (
          <img src={poster.dataUrl} alt="Your MAK MART status picture" />
        ) : (
          <div className="share-store__loading">Preparing your picture…</div>
        )}
      </div>
    </div>
  );
}

export default ShareStoreCard;