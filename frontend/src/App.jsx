import { useEffect, useState } from "react";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Navigate, Route, Routes, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";

import { EventTypeModal } from "./components/EventTypeModal";
import { AdminLayout } from "./components/AdminLayout";
import { api } from "./lib/api";
import { TIMEZONES, WEEKDAYS, buildCalendarDays, cn, formatDate, formatDateTime, toInputDate } from "./lib/format";

function cleanTimeValue(value) {
  return value ? `${value}`.slice(0, 5) : "";
}

function normalizeAvailability(availability) {
  return {
    ...availability,
    rules: availability.rules.map((rule) => ({
      ...rule,
      start_time: cleanTimeValue(rule.start_time),
      end_time: cleanTimeValue(rule.end_time),
    })),
    overrides: availability.overrides.map((override) => ({
      ...override,
      date: `${override.date}`.slice(0, 10),
      start_time: cleanTimeValue(override.start_time),
      end_time: cleanTimeValue(override.end_time),
    })),
  };
}

function useAdminContext() {
  return useOutletContext();
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </div>
  );
}

function SchedulingPage() {
  const { data, actions } = useAdminContext();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const filtered = data.event_types.filter((eventType) =>
    eventType.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="page-content">
      <SectionHeader
        title="Scheduling"
        description="Create and manage event types exactly like Calendly’s scheduling hub."
        action={
          <button className="primary-button" onClick={() => setIsCreating(true)} type="button">
            + Create
          </button>
        }
      />

      <div className="toolbar">
        <input placeholder="Search event types" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <div className="card-list">
        {filtered.map((eventType) => (
          <article className="event-card" key={eventType.id}>
            <div className="event-accent" style={{ background: eventType.color }} />
            <div className="event-body">
              <p className="event-host">{data.user.name}</p>
              <h3>{eventType.name}</h3>
              <p>
                {eventType.duration_minutes} min • {eventType.location}
              </p>
              <p className="event-description">{eventType.description}</p>
            </div>
            <div className="event-actions">
              <button className="secondary-button icon-button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${eventType.public_url}`)} type="button">
                <Copy size={16} />
                Copy link
              </button>
              <a className="secondary-button icon-button" href={eventType.public_url} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                View
              </a>
              <button className="ghost-button icon-button" onClick={() => setEditing(eventType)} type="button">
                <Pencil size={16} />
                Edit
              </button>
              <button className="ghost-button danger icon-button" onClick={() => actions.removeEventType(eventType.id)} type="button">
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {(isCreating || editing) && (
        <EventTypeModal
          eventType={editing}
          onClose={() => {
            setIsCreating(false);
            setEditing(null);
          }}
          onSave={async (payload) => {
            await actions.saveEventType(editing?.id, payload);
            setIsCreating(false);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

function MeetingsPage() {
  const { data, actions } = useAdminContext();
  const [tab, setTab] = useState("upcoming");

  const now = new Date();
  const meetings = data.meetings.filter((meeting) =>
    tab === "past" ? new Date(meeting.starts_at) < now : new Date(meeting.starts_at) >= now,
  );

  return (
    <section className="page-content">
      <SectionHeader
        title="Meetings"
        description="Review upcoming and past meetings, then cancel instantly when plans change."
      />
      <div className="tabs">
        {["upcoming", "past"].map((value) => (
          <button key={value} className={cn("tab-button", tab === value && "active")} onClick={() => setTab(value)} type="button">
            {value}
          </button>
        ))}
      </div>
      <div className="meeting-grid">
        {meetings.map((meeting) => (
          <article className="meeting-card" key={meeting.id}>
            <div>
              <p className="meeting-status">{meeting.status}</p>
              <h3>{meeting.event_type_name}</h3>
              <p>{meeting.invitee_name}</p>
              <span>{meeting.invitee_email}</span>
            </div>
            <div>
              <p>{formatDateTime(meeting.starts_at)}</p>
              <span>Confirmation #{meeting.confirmation_code}</span>
            </div>
            {tab === "upcoming" && meeting.status !== "cancelled" ? (
              <button className="ghost-button danger" onClick={() => actions.cancelMeeting(meeting.id)} type="button">
                Cancel meeting
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function AvailabilityPage() {
  const { data, actions } = useAdminContext();
  const [draft, setDraft] = useState(normalizeAvailability(data.availability));

  useEffect(() => {
    setDraft(normalizeAvailability(data.availability));
  }, [data.availability]);

  function updateRule(weekday, field, value) {
    setDraft((current) => ({
      ...current,
      rules: current.rules.map((rule) => (rule.weekday === weekday ? { ...rule, [field]: value } : rule)),
    }));
  }

  function addOverride() {
    setDraft((current) => ({
      ...current,
      overrides: [
        ...current.overrides,
        {
          date: toInputDate(new Date()),
          is_available: true,
          start_time: "10:00",
          end_time: "14:00",
          label: "Special hours",
        },
      ],
    }));
  }

  function updateOverride(index, field, value) {
    setDraft((current) => ({
      ...current,
      overrides: current.overrides.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function removeOverride(index) {
    setDraft((current) => ({
      ...current,
      overrides: current.overrides.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  return (
    <section className="page-content">
      <SectionHeader
        title="Availability"
        description="Set weekly working hours, timezone, and date-specific overrides."
        action={
          <button className="secondary-button" onClick={addOverride} type="button">
            + Hours
          </button>
        }
      />
      <div className="availability-grid">
        <article className="panel-card">
          <div className="panel-card-header">
            <div>
              <p className="eyebrow">Schedule</p>
              <h3>Working hours</h3>
            </div>
            <select value={draft.timezone} onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))}>
              {TIMEZONES.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </div>
          <div className="availability-list">
            {WEEKDAYS.map((day) => {
              const rule = draft.rules.find((item) => item.weekday === day.value);
              return (
                <div className="availability-row" key={day.value}>
                  <strong>{day.label}</strong>
                  <label className="inline-checkbox">
                    <input checked={rule?.is_available ?? false} type="checkbox" onChange={(event) => updateRule(day.value, "is_available", event.target.checked)} />
                    Available
                  </label>
                  <input type="time" value={rule?.start_time ?? ""} onChange={(event) => updateRule(day.value, "start_time", event.target.value)} />
                  <span>-</span>
                  <input type="time" value={rule?.end_time ?? ""} onChange={(event) => updateRule(day.value, "end_time", event.target.value)} />
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-card-header">
            <div>
              <p className="eyebrow">Overrides</p>
              <h3>Date-specific hours</h3>
            </div>
          </div>
          <div className="override-list">
            {draft.overrides.map((override, index) => (
              <div className="override-card" key={`${override.date}-${index}`}>
                <input type="date" value={override.date} onChange={(event) => updateOverride(index, "date", event.target.value)} />
                <input value={override.label} onChange={(event) => updateOverride(index, "label", event.target.value)} />
                <label className="inline-checkbox">
                  <input checked={override.is_available} type="checkbox" onChange={(event) => updateOverride(index, "is_available", event.target.checked)} />
                  Bookable
                </label>
                <div className="inline-time">
                  <input type="time" value={override.start_time ?? ""} onChange={(event) => updateOverride(index, "start_time", event.target.value)} />
                  <span>-</span>
                  <input type="time" value={override.end_time ?? ""} onChange={(event) => updateOverride(index, "end_time", event.target.value)} />
                </div>
                <button className="ghost-button danger" onClick={() => removeOverride(index)} type="button">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="page-actions">
        <button className="primary-button" onClick={() => actions.saveAvailability(draft)} type="button">
          Save availability
        </button>
      </div>
    </section>
  );
}

function ContactsPage() {
  const { data } = useAdminContext();
  return (
    <section className="page-content">
      <SectionHeader title="Contacts" description="Contacts are automatically built from booked meetings, just like Calendly." />
      <div className="hero-card">
        <div>
          <h3>Stay organized as you build relationships</h3>
          <p>View invitee history, access key details, and keep every booking in one place.</p>
        </div>
        <button className="primary-button" type="button">
          + Add contact
        </button>
      </div>
      <div className="table-card">
        <div className="table-head">
          <span>Name</span>
          <span>Email</span>
          <span>Company</span>
          <span>Role</span>
        </div>
        {data.contacts.map((contact) => (
          <div className="table-row" key={contact.id}>
            <span>{contact.name}</span>
            <span>{contact.email}</span>
            <span>{contact.company}</span>
            <span>{contact.job_title}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkflowsPage() {
  const { data, actions } = useAdminContext();
  const templates = [
    { name: "Reminder email", description: "Send a reminder 24 hours before the meeting.", trigger_type: "email" },
    { name: "Cancellation text", description: "Text the host when an invitee cancels.", trigger_type: "sms" },
    { name: "Thank you email", description: "Follow up automatically after the meeting.", trigger_type: "email" },
  ];

  return (
    <section className="page-content">
      <SectionHeader title="Workflows" description="Automate your meeting communications with plug-and-play templates." />
      <div className="workflow-grid">
        {templates.map((template) => (
          <article className="workflow-template" key={template.name}>
            <h3>{template.name}</h3>
            <p>{template.description}</p>
            <button className="primary-button small" onClick={() => actions.createWorkflow(template)} type="button">
              Add workflow
            </button>
          </article>
        ))}
      </div>
      <div className="workflow-stack">
        {data.workflows.map((workflow) => (
          <article className="meeting-card" key={workflow.id}>
            <div>
              <p className="meeting-status">{workflow.trigger_type}</p>
              <h3>{workflow.name}</h3>
              <p>{workflow.description}</p>
            </div>
            <span className={cn("pill", workflow.is_enabled && "connected")}>{workflow.is_enabled ? "Enabled" : "Disabled"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function IntegrationsPage() {
  const { data } = useAdminContext();
  return (
    <section className="page-content">
      <SectionHeader title="Integrations & apps" description="Show the evaluators a realistic ecosystem page with connected tools and discoverable apps." />
      <div className="integration-hero">
        <div>
          <p className="eyebrow">Getting started</p>
          <h3>Calendly works where you work</h3>
          <p>Connect calendars, meeting apps, and CRM tools to enhance your scheduling automation.</p>
        </div>
      </div>
      <div className="integration-grid">
        {data.integrations.map((integration) => (
          <article className="integration-card" key={integration.id}>
            <div className="integration-icon">{integration.name.charAt(0)}</div>
            <h3>{integration.name}</h3>
            <p>{integration.description}</p>
            <span className={cn("pill", integration.status === "connected" && "connected")}>{integration.status}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function AnalyticsPage() {
  const { data } = useAdminContext();
  const total = Math.max(...data.analytics.duration_breakdown.map((item) => item.value), 1);
  return (
    <section className="page-content">
      <SectionHeader title="Analytics" description="Surface booking metrics with simple, readable cards and trends." />
      <div className="stats-grid">
        <StatCard label="Created events" value={data.analytics.created_events} hint="All-time booked meetings" />
        <StatCard label="Completed events" value={data.analytics.completed_events} hint="Finished meetings" />
        <StatCard label="Rescheduled events" value={data.analytics.rescheduled_events} hint="Meetings moved to a new time" />
        <StatCard label="Cancelled events" value={data.analytics.cancelled_events} hint="Cancelled by host or invitee" />
      </div>
      <div className="analytics-layout">
        <article className="panel-card">
          <h3>Event distribution by duration</h3>
          <div className="bar-stack">
            {data.analytics.duration_breakdown.map((item) => (
              <div className="bar-row" key={item.label}>
                <span>{item.label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(item.value / total) * 100}%` }} />
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="panel-card">
          <h3>Popular event types</h3>
          <div className="metric-list">
            {data.analytics.popular_event_types.map((item) => (
              <div className="metric-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function AdminCenterPage() {
  const { data } = useAdminContext();
  return (
    <section className="page-content">
      <SectionHeader title="Admin center" description="A compact team overview screen inspired by Calendly’s organization dashboard." />
      <div className="hero-card admin-hero">
        <div>
          <p className="eyebrow">No analytics yet</p>
          <h3>Monitor your organization in one place</h3>
          <ul className="simple-list">
            <li>Identify if new users need help with setup tasks.</li>
            <li>Track weekly meeting activity and cancellation rates.</li>
            <li>Use quick links to open analytics or managed events.</li>
          </ul>
        </div>
        <div className="stats-grid compact">
          <StatCard label="Created events" value={data.analytics.created_events} hint="Last seeded week" />
          <StatCard label="Completed" value={data.analytics.completed_events} hint="Performance view" />
          <StatCard label="Cancelled" value={data.analytics.cancelled_events} hint="Operational signal" />
        </div>
      </div>
    </section>
  );
}

function BookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const [form, setForm] = useState({ name: "", email: "", notes: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const payload = await api.getPublicEvent(slug, toInputDate(new Date(month.getFullYear(), month.getMonth(), 1)));
        setEventData(payload);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, month]);

  useEffect(() => {
    async function loadSlots() {
      if (!selectedDate) {
        setSlots([]);
        return;
      }
      try {
        const payload = await api.getPublicSlots(slug, selectedDate);
        setSlots(payload.slots);
      } catch (requestError) {
        setError(requestError.message);
      }
    }
    loadSlots();
  }, [selectedDate, slug]);

  const highlighted = new Set(eventData?.highlighted_dates || []);
  const calendarDays = buildCalendarDays(month);

  async function handleBooking(event) {
    event.preventDefault();
    const confirmation = await api.bookSlot(slug, {
      date: selectedDate,
      time: selectedTime,
      ...form,
    });
    navigate(`/book/${slug}/confirmation/${confirmation.confirmation_code}`, { state: confirmation });
  }

  if (loading) {
    return <div className="public-shell centered">Loading booking page...</div>;
  }

  if (!eventData) {
    return <div className="public-shell centered">{error || "Unable to load booking page."}</div>;
  }

  return (
    <div className="public-shell">
      <div className="booking-card">
        <aside className="booking-sidebar">
          <div className="brand-inline">
            <div className="brand-mark small">C</div>
            <span>Calendly</span>
          </div>
          <p className="booking-host">{eventData.host.name}</p>
          <h1>{eventData.event_type.name}</h1>
          <div className="booking-meta">
            <span>{eventData.event_type.duration_minutes} min</span>
            <span>{eventData.event_type.location}</span>
            <span>{eventData.timezone}</span>
          </div>
          <p>{eventData.event_type.description}</p>
        </aside>

        <section className="booking-main">
          <div className="booking-column">
            <div className="calendar-header">
              <h2>
                {month.toLocaleString("en-US", { month: "long", year: "numeric" })}
              </h2>
              <div className="calendar-nav">
                <button className="ghost-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} type="button">
                  Prev
                </button>
                <button className="ghost-button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} type="button">
                  Next
                </button>
              </div>
            </div>
            <div className="calendar-grid labels">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((day, index) =>
                day ? (
                  <button
                    key={`${day.toISOString()}-${index}`}
                    className={cn(
                      "calendar-day",
                      highlighted.has(toInputDate(day)) && "available",
                      selectedDate === toInputDate(day) && "selected",
                    )}
                    disabled={!highlighted.has(toInputDate(day))}
                    onClick={() => setSelectedDate(toInputDate(day))}
                    type="button"
                  >
                    {day.getDate()}
                  </button>
                ) : (
                  <span key={`empty-${index}`} />
                ),
              )}
            </div>
          </div>

          <div className="booking-column">
            <h2>{selectedDate ? formatDate(selectedDate) : "Select a date"}</h2>
            <div className="slot-list">
              {slots.map((slot) => (
                <button
                  key={slot.value}
                  className={cn("slot-button", selectedTime === slot.value && "selected")}
                  onClick={() => setSelectedTime(slot.value)}
                  type="button"
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          <form className="booking-form" onSubmit={handleBooking}>
            <h2>Your details</h2>
            <label>
              Name
              <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              Email
              <input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </label>
            <label>
              Notes
              <textarea rows="4" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <button className="primary-button" disabled={!selectedDate || !selectedTime} type="submit">
              Confirm booking
            </button>
            {error ? <p className="error-text">{error}</p> : null}
          </form>
        </section>
      </div>
    </div>
  );
}

function ConfirmationPage() {
  const { confirmationCode } = useParams();
  const location = useLocation();
  const locationState = location.state;
  const [confirmation, setConfirmation] = useState(locationState || null);

  useEffect(() => {
    async function loadConfirmation() {
      if (confirmation) {
        return;
      }
      const payload = await api.getConfirmation(confirmationCode);
      setConfirmation(payload);
    }
    loadConfirmation();
  }, [confirmation, confirmationCode]);

  if (!confirmation) {
    return <div className="public-shell centered">Loading confirmation...</div>;
  }

  return (
    <div className="public-shell centered">
      <div className="confirmation-card">
        <div className="success-mark">✓</div>
        <p className="eyebrow">Booking confirmed</p>
        <h1>{confirmation.event_type_name}</h1>
        <p>
          {confirmation.invitee_name}, your meeting is scheduled for {formatDateTime(confirmation.starts_at)}.
        </p>
        <div className="confirmation-details">
          <span>{confirmation.location}</span>
          <span>{confirmation.invitee_email}</span>
          <span>{confirmation.timezone}</span>
        </div>
      </div>
    </div>
  );
}

function AdminApp() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const dashboard = await api.getDashboard();
      setData(dashboard);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const actions = {
    saveEventType: async (id, payload) => {
      if (id) {
        await api.updateEventType(id, payload);
      } else {
        await api.createEventType(payload);
      }
      await refresh();
    },
    removeEventType: async (id) => {
      await api.deleteEventType(id);
      await refresh();
    },
    saveAvailability: async (payload) => {
      await api.updateAvailability(payload);
      await refresh();
    },
    cancelMeeting: async (id) => {
      await api.cancelMeeting(id, "Cancelled from admin dashboard");
      await refresh();
    },
    createWorkflow: async (payload) => {
      await api.createWorkflow(payload);
      await refresh();
    },
  };

  if (error && !data) {
    return <div className="public-shell centered">{error}</div>;
  }

  if (!data) {
    return <div className="public-shell centered">Loading workspace...</div>;
  }

  return (
    <Routes>
      <Route element={<AdminLayout actions={actions} data={data} />}>
        <Route index element={<Navigate replace to="/app/scheduling" />} />
        <Route path="scheduling" element={<SchedulingPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="admin" element={<AdminCenterPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate replace to="/app/scheduling" />} />
      <Route path="/app/*" element={<AdminApp />} />
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="/book/:slug/confirmation/:confirmationCode" element={<ConfirmationPage />} />
    </Routes>
  );
}
