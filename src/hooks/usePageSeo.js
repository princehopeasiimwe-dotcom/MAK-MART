import { useEffect } from "react";

const SITE_NAME = "MAK MART";
const DEFAULT_DESCRIPTION =
  "MAK MART is Makerere University's student marketplace: buy and sell products, find campus services and events from trusted student vendors.";

function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Sets the tab title, description, canonical link and social-share tags
// for the current page. Pass noindex for private pages (login, cart...).
export default function usePageSeo({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  noindex = false,
} = {}) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | ${SITE_NAME}`
      : `${SITE_NAME} | Makerere Student Marketplace`;
    const desc = (description || DEFAULT_DESCRIPTION).replace(/\s+/g, " ").trim().slice(0, 160);
    const url = window.location.origin + window.location.pathname;

    document.title = fullTitle;
    setMeta("name", "description", desc);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    setCanonical(url);

    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    if (image) {
      setMeta("property", "og:image", image);
      setMeta("name", "twitter:image", image);
    }
  }, [title, description, image, noindex]);
}