import { Link } from "react-router-dom";
import mark from "../../assets/logos/mak-mart-mark.png";

// Logo only (no wordmark or tagline). Used by the header and the footer
// so they always match.
function Brand({ onClick }) {
  return (
    <Link to="/" className="mm-brand" onClick={onClick} aria-label="MAK MART home">
      <img className="mm-brand__mark" src={mark} alt="MAK MART" />
    </Link>
  );
}

export default Brand;