import { cleanMoney, groupDigits } from "../../utils/money";

// A price box that understands commas: typing 35000, 35,000, 35 000 or 35k
// all work, and it shows 35,000 as you type. It reports the plain digits
// ("35000") through onChange({ target: { name, value } }), so it plugs into
// the same handleChange the other fields use.
function MoneyInput({ id, name, value, onChange, placeholder, required }) {
  const handle = (event) => {
    onChange?.({ target: { name, value: cleanMoney(event.target.value) } });
  };

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={groupDigits(value)}
      onChange={handle}
      placeholder={placeholder}
      required={required}
    />
  );
}

export default MoneyInput;