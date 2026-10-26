import { chainOf, childrenOf, topLevel } from "../../lib/categoryTree";

const LEVEL_LABELS = ["Category", "Sub-category", "Type"];

// Step-by-step category chooser: Technology, then Phones, then iPhones.
// `value` is the most specific category chosen so far.
function CategoryPicker({ categories = [], value = "", onChange, idPrefix = "category" }) {
  const chain = value ? chainOf(categories, value) : [];

  const levels = [{ options: topLevel(categories), selected: chain[0]?.id || "" }];

  for (let i = 0; i < 2; i += 1) {
    const parent = chain[i];
    if (!parent) break;
    const options = childrenOf(categories, parent.id);
    if (!options.length) break;
    levels.push({ options, selected: chain[i + 1]?.id || "" });
  }

  const handleChange = (levelIndex, newId) => {
    if (newId) {
      onChange?.(newId);
    } else {
      // cleared this level: fall back to the level above (or nothing)
      onChange?.(levelIndex === 0 ? "" : chain[levelIndex - 1]?.id || "");
    }
  };

  return (
    <>
      {levels.map((level, index) => (
        <div className="form-group" key={index}>
          <label htmlFor={`${idPrefix}-${index}`}>{LEVEL_LABELS[index]}</label>

          <select
            id={index === 0 ? `${idPrefix}_id` : `${idPrefix}-${index}`}
            name={index === 0 ? "category_id" : undefined}
            value={level.selected}
            onChange={(event) => handleChange(index, event.target.value)}
          >
            <option value="">
              {index === 0
                ? "Select a category"
                : `Choose a ${LEVEL_LABELS[index].toLowerCase()} (optional)`}
            </option>

            {level.options.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </>
  );
}

export default CategoryPicker;