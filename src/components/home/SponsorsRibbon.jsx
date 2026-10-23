import { useEffect, useState } from "react";

import SponsorService from "../../services/sponsorService";

function safeLink(url) {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function SponsorsRibbon() {
  const [sponsors, setSponsors] = useState([]);

  useEffect(() => {
    let alive = true;
    SponsorService.getActive()
      .then((data) => alive && setSponsors(data))
      .catch(() => alive && setSponsors([]));
    return () => {
      alive = false;
    };
  }, []);

  if (!sponsors.length) return null;

  // Repeat short lists so the ribbon always fills the screen, then double the
  // whole set so the loop is seamless.
  const repeats = Math.max(1, Math.ceil(8 / sponsors.length));
  const base = Array.from({ length: repeats }, () => sponsors).flat();
  const loop = [...base, ...base];

  return (
    <section className="mm-sponsors mm-container" aria-label="Our sponsors">
      <span className="mm-sponsors__label">Our sponsors</span>
      <div className="mm-sponsors__window">
        <ul className="mm-sponsors__track">
          {loop.map((sponsor, i) => {
            const href = safeLink(sponsor.link_url);
            const inner = sponsor.logo_url ? (
              <img src={sponsor.logo_url} alt={sponsor.name} loading="lazy" />
            ) : (
              <span className="mm-sponsors__name">{sponsor.name}</span>
            );
            const duplicate = i >= base.length;

            return (
              <li key={`${sponsor.id}-${i}`} aria-hidden={duplicate || undefined}>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    tabIndex={duplicate ? -1 : undefined}
                    title={sponsor.name}
                  >
                    {inner}
                  </a>
                ) : (
                  <span title={sponsor.name}>{inner}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default SponsorsRibbon;