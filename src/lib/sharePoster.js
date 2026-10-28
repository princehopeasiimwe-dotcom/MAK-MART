// Draws the picture a vendor posts on their WhatsApp status:
// MAK MART logo, the shop name / logo, and a "tap the link below" call to action.
// The link itself goes in the caption (WhatsApp makes it tappable).

function loadImage(src, cross = false) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const image = new Image();
    if (cross) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width <= maxWidth || !line) {
      line = attempt;
    } else {
      lines.push(line);
      line = word;
    }
  });
  if (line) lines.push(line);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, "")}…`;
    return kept;
  }
  return lines;
}

const FONT = '"Plus Jakarta Sans", "DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export async function makeSharePoster({
  shopName,
  shopLogoUrl,
  brandLogoUrl = "/icons/icon-512.png",
  tagline = "Shop my products on MAK MART",
  footer = "Buy from students. Support students.",
  fallbackName = "My shop",
}) {
  try {
    await document.fonts?.ready;
  } catch {
    /* fonts are optional */
  }

  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const [brand, shop] = await Promise.all([
    loadImage(brandLogoUrl),
    loadImage(shopLogoUrl, true),
  ]);

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#ff7a2f");
  bg.addColorStop(0.55, "#f7661f");
  bg.addColorStop(1, "#d94a0a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // soft circles
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath(); ctx.arc(W - 120, 220, 340, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(80, H - 260, 300, 0, Math.PI * 2); ctx.fill();

  // MAK MART logo (top)
  const logoSize = 220;
  if (brand) {
    ctx.save();
    roundRect(ctx, (W - logoSize) / 2, 150, logoSize, logoSize, 56);
    ctx.clip();
    ctx.drawImage(brand, (W - logoSize) / 2, 150, logoSize, logoSize);
    ctx.restore();
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 54px ${FONT}`;
  ctx.fillText("MAK MART", W / 2, 460);
  ctx.font = `500 32px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText("Makerere's student marketplace", W / 2, 510);

  // white card (its height follows the shop name, which may take 1 or 2 lines)
  const cardX = 90;
  const cardY = 600;
  const cardW = W - 180;
  ctx.font = `800 76px ${FONT}`;
  const nameLines = wrapLines(ctx, shopName || fallbackName, cardW - 120, 2);
  const subtitleY = cardY + 420 + (nameLines.length - 1) * 88 + 88 + 20;
  const pillW = 640;
  const pillH = 120;
  const pillY = subtitleY + 70;
  const cardH = pillY + pillH + 70 - cardY;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.fill();
  ctx.restore();

  // shop logo or initial
  const circleR = 120;
  const cx = W / 2;
  const cy = cardY + 190;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
  ctx.clip();
  if (shop) {
    const side = Math.min(shop.width, shop.height);
    ctx.drawImage(
      shop,
      (shop.width - side) / 2,
      (shop.height - side) / 2,
      side,
      side,
      cx - circleR,
      cy - circleR,
      circleR * 2,
      circleR * 2
    );
  } else {
    ctx.fillStyle = "#e3f3e6";
    ctx.fillRect(cx - circleR, cy - circleR, circleR * 2, circleR * 2);
    ctx.fillStyle = "#1f6b4a";
    ctx.font = `800 130px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.fillText((shopName || "M").trim().charAt(0).toUpperCase(), cx, cy + 6);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  // shop name
  ctx.fillStyle = "#171b19";
  ctx.font = `800 76px ${FONT}`;
  let y = cardY + 420;
  nameLines.forEach((line) => {
    ctx.fillText(line, W / 2, y);
    y += 88;
  });

  ctx.fillStyle = "#6b7370";
  ctx.font = `500 42px ${FONT}`;
  ctx.fillText(tagline, W / 2, subtitleY);

  // call to action pill
  const pillX = (W - pillW) / 2;
  ctx.fillStyle = "#171b19";
  roundRect(ctx, pillX, pillY, pillW, pillH, 60);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 46px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText("Tap the link below  👇", W / 2, pillY + pillH / 2 + 2);
  ctx.textBaseline = "alphabetic";

  // bottom arrows
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 120px ${FONT}`;
  ctx.fillText("↓", W / 2, 1620);
  ctx.font = `600 34px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(footer, W / 2, 1730);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, dataUrl: canvas.toDataURL("image/jpeg", 0.9) }) : reject(new Error("Could not make the picture."))),
      "image/png"
    );
  });
}