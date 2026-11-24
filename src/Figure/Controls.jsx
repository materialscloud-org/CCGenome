// The controls left of the plot: X, Y and colour quantities and the filters.
import { quantityLabel } from "../ccgenome/config";
import { DualRangeSlider } from "mc-react-library";

function Select({ title, value, options, onChange }) {
  return (
    <label className="block text-sm">
      {title}
      <select
        className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Toggle buttons of the values of a list filter (Bokeh's CheckboxButtonGroup). */
function CheckboxButtons({ title, values, labels, value, onChange }) {
  const toggle = (v) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : values.filter((x) => x === v || value.includes(x)));
  return (
    <div className="text-sm">
      {title}
      <div className="mt-1 flex flex-wrap">
        {values.map((v, i) => {
          const on = value.includes(v);
          return (
            <button
              key={String(v)}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(v)}
              className={`-ml-px border border-slate-300 px-2 py-1 first:ml-0 first:rounded-l last:rounded-r ${
                on ? "bg-[#337ab7] text-white" : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {labels?.[i] ?? String(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Controls({ config, settings, onChange }) {
  const options = config.plotQuantities.map((q) => [q, config.quantities[q].label]);
  const set = (key) => (value) => onChange({ ...settings, [key]: value });
  const setFilter = (key) => (value) => onChange({ ...settings, filters: { ...settings.filters, [key]: value } });
  return (
    <div className="space-y-3">
      <Select title="X" value={settings.x} options={options} onChange={set("x")} />
      <Select title="Y" value={settings.y} options={options} onChange={set("y")} />
      <Select title="Color" value={settings.clr} options={options} onChange={set("clr")} />
      {config.filterList.map((key) => {
        const q = config.quantities[key];
        return q.type === "float" ? (
          <div key={key} className="space-y-1">
            <span className="block text-sm">{quantityLabel(q)}</span>
            <DualRangeSlider
              value={settings.filters[key]}
              min={q.range[0]}
              max={q.range[1]}
              step={0.1}
              onChange={setFilter(key)}
            />
          </div>
        ) : (
          <CheckboxButtons
            key={key}
            title={quantityLabel(q)}
            values={q.values}
            labels={q.labels}
            value={settings.filters[key]}
            onChange={setFilter(key)}
          />
        );
      })}
    </div>
  );
}
