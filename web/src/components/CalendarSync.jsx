import React, { useEffect, useState } from "react";
import { api, BASE } from "../api.js";
import { CheckIcon, CalendarIcon, AlertIcon } from "./Icons.jsx";

/**
 * A private, read-only iCalendar feed of this person's shifts.
 *
 * Subscription rather than a Google API integration: it works in Google
 * Calendar, Apple Calendar and Outlook without an OAuth app, and the roster
 * stays the one place shifts are edited. The trade-off is refresh timing —
 * Google decides when to re-fetch, and it is not instant. Said plainly below,
 * because a roster people rely on should not quietly imply otherwise.
 */
export default function CalendarSync({ notify }) {
  const [token, setToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/calendar-token")
      .then((d) => setToken(d.token))
      .catch(() => { /* the rest of the page is more important than this card */ });
  }, []);

  const url = token ? `${BASE}/calendar.ics?token=${token}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      notify("Couldn't copy — select the link and copy it manually.", "error");
    }
  };

  const reset = () => {
    if (!confirm("Create a new link? Any calendar already subscribed to the old one will stop updating and will need re-adding.")) return;
    setBusy(true);
    api("/calendar-token/reset", { method: "POST" })
      .then((d) => { setToken(d.token); notify("New calendar link created.", "success"); })
      .catch((e) => notify(e.message, "error"))
      .finally(() => setBusy(false));
  };

  if (!token) return null;

  return (
    <div className="card">
      <h3>Sync to your calendar</h3>
      <p className="sync-lede">
        Add your shifts to Google Calendar, Apple Calendar or Outlook. They stay up to date on
        their own — no need to re-add anything when the roster changes.
      </p>

      <div className="sync-url">
        <input
          type="text" value={url} readOnly aria-label="Your private calendar link"
          onFocus={(e) => e.target.select()}
        />
        <button className="btn small" onClick={copy}>
          {copied ? <><CheckIcon size={14} /> Copied</> : "Copy link"}
        </button>
      </div>

      <ol className="sync-steps">
        <li>
          <span className="step-n">1</span>
          <span>
            <strong>Google Calendar</strong> (on a computer): Other calendars <b>+</b> →
            {" "}<strong>From URL</strong> → paste → <strong>Add calendar</strong>.
          </span>
        </li>
        <li>
          <span className="step-n">2</span>
          <span>
            <strong>iPhone</strong>: Settings → Apps → Calendar → Accounts →
            {" "}<strong>Add Account</strong> → <strong>Other</strong> → <strong>Add Subscribed Calendar</strong> → paste.
          </span>
        </li>
      </ol>

      <p className="sync-note">
        <AlertIcon size={14} />
        <span>
          Google re-checks subscribed calendars on its own schedule — usually every several hours,
          and it can't be forced. Apple Calendar lets you set it to refresh hourly. For the live
          roster, this app is always current.
        </span>
      </p>

      <div className="sync-foot">
        <span><CalendarIcon size={13} /> Private to you · read-only · covers the next 6 months</span>
        <button className="link-reset" onClick={reset} disabled={busy}>
          {busy ? "Working…" : "Create a new link"}
        </button>
      </div>
    </div>
  );
}
