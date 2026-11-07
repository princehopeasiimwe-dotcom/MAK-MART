import { Plus, Trash2 } from "lucide-react";
import MoneyInput from "../common/MoneyInput";

import { MAX_PACKAGES, newPackageRow } from "./packageRows";

const UNIT_SUGGESTIONS = ["per page", "per hour", "per person", "per item", "per kg", "per session", "per day", "per trip"];

// Quick starting points. Only names and units are filled in; the provider adds the prices.
const TEMPLATES = [
  { label: "Hair & beauty", rows: ["Haircut", "Braids", "Wash & style", "Colour / dye", "Kids cut"].map((name) => ({ name, unit: "" })) },
  {
    label: "Printing",
    rows: [
      { name: "Black & white print", unit: "per page" },
      { name: "Colour print", unit: "per page" },
      { name: "Photocopy", unit: "per page" },
      { name: "Binding", unit: "per item" },
      { name: "Lamination", unit: "per item" },
    ],
  },
  {
    label: "Tutoring",
    rows: [
      { name: "One-hour lesson", unit: "per hour" },
      { name: "Group session", unit: "per person" },
      { name: "Exam revision pack", unit: "" },
    ],
  },
  {
    label: "Laundry",
    rows: [
      { name: "Wash & fold", unit: "per kg" },
      { name: "Ironing", unit: "per item" },
      { name: "Bedding", unit: "per item" },
    ],
  },
  {
    label: "Photography",
    rows: [
      { name: "Portrait shoot", unit: "per session" },
      { name: "Graduation package", unit: "" },
      { name: "Event coverage", unit: "per hour" },
    ],
  },
  {
    label: "Delivery",
    rows: [
      { name: "Within campus", unit: "per trip" },
      { name: "Town trip", unit: "per trip" },
    ],
  },
];

// A price list: several priced options for one service.
function PackageEditor({ rows, onChange }) {
  const update = (key, patch) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key) => onChange(rows.filter((r) => r.key !== key));
  const add = (items) => onChange([...rows, ...items.map(newPackageRow)].slice(0, MAX_PACKAGES));

  return (
    <fieldset className="package-editor">
      <legend>Packages and prices (optional)</legend>
      <p className="field-hint">
        Offer more than one option, for example different hairstyles, or printing per page. Customers see each price and pick one.
      </p>

      <datalist id="package-units">
        {UNIT_SUGGESTIONS.map((u) => <option key={u} value={u} />)}
      </datalist>

      {rows.length === 0 && (
        <div className="package-editor__templates">
          <span>Start from an example:</span>
          {TEMPLATES.map((t) => (
            <button key={t.label} type="button" className="chip-button" onClick={() => add(t.rows)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {rows.map((row, index) => (
        <div className="package-row" key={row.key}>
          <div className="package-row__top">
            <input
              aria-label={`Package ${index + 1} name`}
              placeholder="Name, e.g. Box braids"
              maxLength={80}
              value={row.name}
              onChange={(e) => update(row.key, { name: e.target.value })}
            />
            <button type="button" className="icon-button" aria-label={`Remove package ${index + 1}`} onClick={() => remove(row.key)}>
              <Trash2 size={16} />
            </button>
          </div>
          <div className="package-row__mid">
            <MoneyInput
              id={`pk-price-${row.key}`}
              name="price"
              value={row.price}
              onChange={(e) => update(row.key, { price: e.target.value })}
              placeholder="Price (UGX)"
            />
            <input
              aria-label={`Package ${index + 1} unit`}
              list="package-units"
              placeholder="Per... (optional)"
              maxLength={30}
              value={row.unit}
              onChange={(e) => update(row.key, { unit: e.target.value })}
            />
          </div>
          <input
            aria-label={`Package ${index + 1} details`}
            placeholder="Short details (optional)"
            maxLength={300}
            value={row.description}
            onChange={(e) => update(row.key, { description: e.target.value })}
          />
        </div>
      ))}

      {rows.length < MAX_PACKAGES && (
        <button type="button" className="secondary-button" onClick={() => add([{}])}>
          <Plus size={16} /> Add a package
        </button>
      )}
    </fieldset>
  );
}

export default PackageEditor;