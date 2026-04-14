import { useEffect, useState } from "react";

import { slugify } from "../lib/format";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  color: "#7c5cff",
  location: "Google Meet",
  duration_minutes: 30,
  is_active: true,
  buffer_before_minutes: 5,
  buffer_after_minutes: 5,
};

export function EventTypeModal({ eventType, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (eventType) {
      setForm(eventType);
    } else {
      setForm(emptyForm);
    }
  }, [eventType]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleNameChange(value) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: current.slug && eventType ? current.slug : slugify(value),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      ...form,
      duration_minutes: Number(form.duration_minutes),
      buffer_before_minutes: Number(form.buffer_before_minutes),
      buffer_after_minutes: Number(form.buffer_after_minutes),
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Event type</p>
            <h3>{eventType ? "Edit event type" : "Create new event type"}</h3>
          </div>
          <button className="ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Event name
            <input value={form.name} onChange={(event) => handleNameChange(event.target.value)} required />
          </label>
          <label>
            Public URL slug
            <input value={form.slug} onChange={(event) => updateField("slug", slugify(event.target.value))} required />
          </label>
          <label>
            Description
            <textarea rows="3" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
          </label>
          <div className="form-grid two-up">
            <label>
              Duration
              <input min="15" max="240" step="15" type="number" value={form.duration_minutes} onChange={(event) => updateField("duration_minutes", event.target.value)} />
            </label>
            <label>
              Location
              <input value={form.location} onChange={(event) => updateField("location", event.target.value)} />
            </label>
          </div>
          <div className="form-grid three-up">
            <label>
              Accent color
              <input type="color" value={form.color} onChange={(event) => updateField("color", event.target.value)} />
            </label>
            <label>
              Buffer before
              <input min="0" max="120" type="number" value={form.buffer_before_minutes} onChange={(event) => updateField("buffer_before_minutes", event.target.value)} />
            </label>
            <label>
              Buffer after
              <input min="0" max="120" type="number" value={form.buffer_after_minutes} onChange={(event) => updateField("buffer_after_minutes", event.target.value)} />
            </label>
          </div>
          <label className="inline-checkbox">
            <input checked={form.is_active} type="checkbox" onChange={(event) => updateField("is_active", event.target.checked)} />
            Active and bookable
          </label>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" type="submit">
              {eventType ? "Save changes" : "Create event type"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
