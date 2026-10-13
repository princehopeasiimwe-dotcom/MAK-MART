import { Link } from "react-router-dom";
import mark from "../../assets/logos/mak-mart-mark.png";

// Logo + two-colour wordmark ("MAK" dark, "MART" orange) + tagline.
// Used by the header and the footer so they always match.
function Brand({ onClick }) {
  return (
    <Link to="/" className="mm-brand" onClick={onClick} aria-label="MAK MART home">
      <img className="mm-brand__mark" src={mark} alt="" />
      <span className="mm-brand__text">
        <span className="mm-brand__name">
          MAK <span>MART</span>
        </span>
        <small>Makerere&rsquo;s student marketplace</small>
      </span>
    </Link>
  );
}

export default Brand;