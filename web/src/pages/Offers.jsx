import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { fmtTime, fmtDate, todayIso, addDays } from "../util.js";
import Avatar from "../components/Avatar.jsx";

function OfferCard({ o, me, onAction }) {
  const s = o.shift;
  const isMine = o.offered_by === me.id;
  const roleClass = s.role.name.toLowerCase().includes("mood") ? "role-mood" : "role-centre";
  const badge = {
    open: <span className="badge open">Open</span>,
    pending_approval: <span className="badge pending">Awaiting approval</span>,
    approved: <span className="badge approved">Approved</span>,
    rejected: <span className="badge rejected">Declined</span>,
    cancelled: <span className="badge cancelled">Cancelled</span>,
  }[o.status];

  return (
    <div className="offer-card">
      <div className="offer-top">
        <div>
          <div className="offer-when">{fmtDate(s.shift_date)}</div>
          <div className="offer-shift-line">
            {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
          </div>
          <div className="shift-chips" style={{ marginTop: 6 }}>
            <span className="chip loc">📍 {s.location.name}</span>
            <span className={`chip ${roleClass}`}>{s.role.name}</span>
          </div>
        </div>
        {badge}
      </div>

      <div className="offer-people">
        <Avatar name={o.offerer.name} size="sm" />
        <span className="pname">{isMine ? "You" : o.offerer.name}</span>
        <span className="arrow">→</span>
        {o.acceptor ? (
          <>
            <Avatar name={o.acceptor.name} size="sm" />
            <span className="pname">{o.accepted_by === me.id ? "You" : o.acceptor.name}</span>
          </>
        ) : (
          <span className="waiting">waiting for someone to take it…</span>
        )}
      </div>

      {o.offer_note && <p className="offer-note">“{o.offer_note}”</p>}
      {o.admin_note && <p className="offer-note">Admin: {o.admin_note}</p>}

      {(o.status === "open" || o.status === "pending_approval") && (
        <div className="offer-actions">
          {o.status === "open" && !isMine && (
            <button className="btn small green" onClick={() => onAction(o.id, "accept")}>
              Take this shift
            </button>
          )}
          {o.status === "open" && isMine && (
            <button className="btn small secondary" onClick={() => onAction(o.id, "cancel")}>
              Withdraw
            </button>
          )}
          {o.status === "pending_approval" && me.isAdmin && (
            <>
              <button className="btn small green" onClick={() => onAction(o.id, "approve")}>Approve</button>
              <button className="btn small red" onClick={() => onAction(o.id, "reject")}>Decline</button>
            </>
          )}
          {o.status === "pending_approval" && !me.isAdmin && (isMine || o.accepted_by === me.id) && (
            <button className="btn small secondary" onClick={() => onAction(o.id, "cancel")}>
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Offers({ me, notify }) {
  const [offers, setOffers] = useState(null);
  const [showPick, setShowPick] = useState(false);
  const [myShifts, setMyShifts] = useState([]);
  const [pickedShift, setPickedShift] = useState(null);
  const [note, setNote] = useState("");

  const load = () => {
    api("/offers").then((d) => setOffers(d.offers)).catch((e) => notify(e.message));
  };
  useEffect(load, []); // eslint-disable-line

  const act = (id, action) => {
    api(`/offers/${id}/${action}`, { method: "POST" })
      .then(() => {
        notify(
          {
            accept: "Accepted — waiting for admin approval.",
            cancel: "Offer cancelled.",
            approve: "Swap approved. The roster has been updated.",
            reject: "Offer declined.",
          }[action],
        );
        load();
      })
      .catch((e) => notify(e.message));
  };

  const openPicker = () => {
    const start = todayIso();
    const end = addDays(start, 27);
    api(`/calendar?start=${start}&end=${end}`)
      .then((d) => {
        const active = new Set(
          (offers ?? [])
            .filter((o) => ["open", "pending_approval"].includes(o.status))
            .map((o) => o.shift_instance_id),
        );
        setMyShifts(d.shifts.filter((s) => s.staff_id === me.id && !active.has(s.id)));
        setShowPick(true);
      })
      .catch((e) => notify(e.message));
  };

  const submit = () => {
    api("/offers", { method: "POST", body: { shiftInstanceId: pickedShift.id, note } })
      .then(() => {
        notify("Shift offered for swap.");
        setShowPick(false);
        setPickedShift(null);
        setNote("");
        load();
      })
      .catch((e) => notify(e.message));
  };

  const open = (offers ?? []).filter((o) => o.status === "open");
  const pending = (offers ?? []).filter((o) => o.status === "pending_approval");
  const done = (offers ?? []).filter((o) => ["approved", "rejected", "cancelled"].includes(o.status)).slice(0, 10);

  return (
    <div className="plain-page">
      <header className="topbar">
        <h1>Offers</h1>
      </header>

      {offers === null && <p className="empty">Loading…</p>}
      {offers !== null && (
        <>
          <p className="section-title">Open offers</p>
          {open.length === 0 && (
            <p className="empty">
              <span className="big">🤝</span>
              No open offers. Tap + to offer one of your shifts.
            </p>
          )}
          {open.map((o) => <OfferCard key={o.id} o={o} me={me} onAction={act} />)}

          {pending.length > 0 && (
            <>
              <p className="section-title">Awaiting approval</p>
              {pending.map((o) => <OfferCard key={o.id} o={o} me={me} onAction={act} />)}
            </>
          )}

          {done.length > 0 && (
            <>
              <p className="section-title">Recent</p>
              {done.map((o) => <OfferCard key={o.id} o={o} me={me} onAction={act} />)}
            </>
          )}
        </>
      )}

      <button className="fab" onClick={openPicker} aria-label="Offer a shift">+</button>

      {showPick && (
        <div className="modal-back" onClick={() => setShowPick(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <h2>Offer a shift for swap</h2>
            {myShifts.length === 0 && (
              <p className="empty">No upcoming shifts available to offer (next 4 weeks).</p>
            )}
            {myShifts.map((s) => (
              <button
                key={s.id}
                className={"offer-shift-pick" + (pickedShift?.id === s.id ? " selected" : "")}
                onClick={() => setPickedShift(s)}
              >
                <strong>{fmtDate(s.shift_date)}</strong> · {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                <br />
                <span className="sub">📍 {s.location.name} · {s.role.name}</span>
              </button>
            ))}
            {myShifts.length > 0 && (
              <>
                <div className="row" style={{ marginTop: 10 }}>
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <div className="row" style={{ marginTop: 14 }}>
                  <button className="btn" disabled={!pickedShift} onClick={submit}>Offer shift</button>
                  <button className="btn secondary" onClick={() => setShowPick(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
