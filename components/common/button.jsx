function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      className={`ku-button ku-button--${variant} ku-button--${size} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <>
          <span className="ku-button__spinner" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;