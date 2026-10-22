import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Password box with a "show password" eye so people can check what they typed.
function PasswordField({ id, name, value, onChange, minLength, required, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        minLength={minLength}
        required={required}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-field__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={19} /> : <Eye size={19} />}
      </button>
    </div>
  );
}

export default PasswordField;