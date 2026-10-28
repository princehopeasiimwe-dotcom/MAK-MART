import { useEffect, useState } from "react";
import { Copy, Download, Share2, Check } from "lucide-react";

import { makeSharePoster } from "../../lib/sharePoster";

// The address people should get in the link. On your own computer
// (localhost) the live site address is used instead, so the link always works.
const LIVE_SITE = "https://mak-mart-vcy2.vercel.app";

function siteAddress() {
  const origin = window.location.origin;
  return /localhost|127\.0\.0\.1/.test(origin) ? LIVE_SITE : origin;
}

// Lets a vendor (shop) or a service provider (services) post on a WhatsApp
// status or anywhere else: a ready-made MAK MART picture plus a link.
function ShareStoreCard({ vendor: shop, provider }) {
  const isService = Boolean(provider);
  const vendor = provider || shop;
  const [poster, setPoster] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const link = vendor?.id
    ? isService
      ? `${siteAddress()}/providers/${vendor.id}?ref=status`
      : `${siteAddress()}/marketplace/vendors/${vendor.id}?ref=status`
    : "";

  const caption = vendor
    ? isService
      ? `🛠️ ${vendor.business_name} on MAK MART, Makerere's student marketplace.\nTap to see my services and request one 👇\n${link}`
      : `🛍️ Shop ${vendor.business_name} on MAK MART, Makerere's student marketplace.\nTap to see my products 👇\n${link}`
    : "";

  useEffect(() => {
    if (!vendor?.id) return undefined;
    let alive = true;
    makeSharePoster({
      shopName: vendor.business_name,
      shopLogoUrl: isService
        ? vendor.profile_image_url || vendor.logo_url
        : vendor.logo_url,
      tagline: isService
        ? "Book my services on MAK MART"
        : "Shop my products on MAK MART",
      footer: isService
        ? "Trusted student services. Support students."
        : "Buy from students. Support students.",
      fallbackName: isService ? "My services" : "My shop",
    })
      .then((result) => alive && setPoster(result))
      .catch(() => alive && setPoster(null));
    return () => {
      alive = false;
    };
  }, [vendor?.id, vendor?.business_name, vendor?.logo_url, vendor?.profile_image_url, isService]);

  if (!vendor) return null;

  const fileName = `${(vendor.business_name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || (isService ? "my-services" : "my-shop")}-mak-mart.png`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copy your link:", link);
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
        <h3>{isService ? "Share your services" : "Share your market"}</h3>
        <p>
          {isService
            ? "Post your services on your WhatsApp status. People tap the link and land straight on your services page."
            : "Post your shop on your WhatsApp status. Customers tap the link and land straight on your products."}
        </p>

        {!vendor.is_active && (
          <p className="share-store__note">
            {isService ? "Your link starts working as soon as the admin approves your account." : "Your link starts working as soon as the admin approves your store."}
          </p>
        )}

        <div className="share-store__link">
          <input value={link} readOnly aria-label="Your link" onFocus={(e) => e.target.select()} />
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