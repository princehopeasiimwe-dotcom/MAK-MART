function Loader({
  fullScreen = false,
  message = "Loading...",
  size = "md",
}) {
  return (
    <div
      className={`loader-container ${
        fullScreen ? "loader-container--fullscreen" : ""
      }`}
    >
      <div
        className={`loader loader--${size}`}
        aria-label={message}
      />

      {message && (
        <p className="loader-container__message">
          {message}
        </p>
      )}
    </div>
  );
}

export default Loader;