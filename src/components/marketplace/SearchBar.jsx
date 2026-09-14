import { useState } from "react";
import { Search, X } from "lucide-react";

function SearchBar({
  initialValue = "",
  placeholder = "Search products...",
  onSearch,
  className = "",
}) {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (event) => {
    event.preventDefault();

    onSearch?.(query.trim());
  };

  const clearSearch = () => {
    setQuery("");
    onSearch?.("");
  };

  return (
    <form
      className={`search-bar ${className}`}
      onSubmit={handleSubmit}
    >
      <Search
        size={20}
        className="search-bar__icon"
      />

      <input
        type="search"
        value={query}
        onChange={(event) =>
          setQuery(event.target.value)
        }
        placeholder={placeholder}
        aria-label="Search"
      />

      {query && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={clearSearch}
          aria-label="Clear search"
        >
          <X size={18} />
        </button>
      )}

      <button
        type="submit"
        className="search-bar__submit"
      >
        Search
      </button>
    </form>
  );
}

export default SearchBar;