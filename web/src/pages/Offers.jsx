import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api.js";
import { fmtTime, fmtDate, todayIso, addDays, hoursBetween, roleChipStyle } from "../util.js";
import Avatar from "../components/Avatar.jsx";
import { SkeletonRows } from "../components/Skeleton.jsx";
import { PinIcon, SwapIcon, ArrowRight, PlusIcon } from "../components/Icons.jsx";

const shiftHours = (s) => hoursBetween(s.start_time.slice(0, 5), s.end_time.slice(0, 5));

function OfferCard({ o, me, onAction, onAccept }) {
  const s = o.shift;
  const r = o.return_shift;
  const isMine = o.offered_by === me.id;
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
            <span className="chip loc"><PinIcon size={13} /> {s.location.name}</span>
            <span className="chip role" style={roleChipStyle(s.role.name)}>{s.role.name}</span>
            <span className="chip loc">⏱ {shiftHours(s)}h</span>
          </div>
        </div>
        {badge}
      </div>

      <div className="offer-people">
        <Avatar name={o.offerer.name} size="sm" />
        <span className="pname">{isMine ? "You" : o.offerer.name}</span>
        <span className="arrow">{r ? "⇄" : <ArrowRight size={15} />}</span>
        {o.acceptor ? (
          <>
            <Avatar name={o.acceptor.name} size="sm" />
            <span className="pname">{o.accepted_by === me.id ? "You" : o.acceptor.name}</span>
          </>
        ) : (
          <span className="waiting">waiting for a same-hours swap…</span>
        )}
      </div>

      {r && (
        <p className="offer-note" style={{ fontStyle: "normal" }}>
          ⇄ In return: {fmtDate(r.shift_date)} · {fmtTime(r.start_time)} – {fmtTime(r.end_time)} ({shiftHours(r)}h · {r.location.name})
        </p>
      )}

      {o.offer_note && <p className="offer-note">“{o.offer_note}”</p>}
      {o.admin_note && <p className="offer-note">Admin: {o.admin_note}</p>}

      {(o.status === "open" || o.status === "pending_approval") && (
        <div className="offer-actions">
          {o.status === "open" && !isMine && (
            <button className="btn small green" onClick={() => onAccept(o)}>
              Swap one of my shifts
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
  // accepting an offer: pick which of my shifts to give back
  const [acceptOffer, setAcceptOffer] = useState(null);
  const [acceptShifts, setAcceptShifts] = useState([]);
  const [acceptPick, setAcceptPick] = useState(null);

  const load = () => {
    api("/offers").then((d) => setOffers(d.offers)).catch((e) => notify(e.message, "error"));
  };
  useEffect(load, []); // eslint-disable-line

  const act = (id, action) => {
    api(`/offers/${id}/${action}`, { method: "POST" })
      .then(() => {
        notify(
          {
            cancel: "Offer cancelled.",
            approve: "Swap approved. Both shifts have been traded on the roster.",
            reject: "Offer declined.",
          }[action],
          action === "approve" ? "success" : undefined,
        );
        load();
      })
      .catch((e) => notify(e.message, "error"));
  };

  const activeOfferShiftIds = () =>
    new Set(
      (offers ?? [])
        .filter((o) => ["open", "pending_approval"].includes(o.status))
        .flatMap((o) => [o.shift_instance_id, o.return_shift_instance_id].filter(Boolean)),
    );

  const loadMyShifts = () => {
    const start = todayIso();
    const end = addDays(start, 27);
    return api(`/calendar?start=${start}&end=${end}`).then((d) => {
      const active = activeOfferShiftIds();
      return d.shifts.filter((s) => s.staff_id === me.id && !active.has(s.id));
    });
  };

  const openPicker = () => {
    loadMyShifts()
      .then((shifts) => {
        setMyShifts(shifts);
        setShowPick(true);
      })
      .catch((e) => notify(e.message, "error"));
  };

  const openAccept = (o) => {
    loadMyShifts()
      .then((shifts) => {
        setAcceptShifts(shifts);
        setAcceptPick(null);
        setAcceptOffer(o);
      })
      .catch((e) => notify(e.message, "error"));
  };

  const submitAccept = () => {
    api(`/offers/${acceptOffer.id}/accept`, {
      method: "POST",
      body: { returnShiftInstanceId: acceptPick.id },
    })
      .then(() => {
        notify("Swap requested — waiting for admin approval.", "success");
        setAcceptOffer(null);
        load();
      })
      .catch((e) => notify(e.message, "error"));
  };

  const submit = () => {
    api("/offers", { method: "POST", body: { shiftInstanceId: pickedShift.id, note } })
      .then(() => {
        notify("Shift offered for swap.", "success");
        setShowPick(false);
        setPickedShift(null);
        setNote("");
        load();
      })
      .catch((e) => notify(e.message, "error"));
  };

  const open = (offers ?? []).filter((o) => o.status === "open");
  const pending = (offers ?? []).filter((o) => o.status === "pending_approval");
  const done = (offers ?? []).filter((o) => ["approved", "rejected", "cancelled"].includes(o.status)).slice(0, 10);
  const wantedHours = acceptOffer ? shiftHours(acceptOffer.shift) : 0;

  return (
    <div className="plain-page has-fab">
      <header className="topbar">
        <h1>Offers</h1>
      </header>

      {offers === null && <SkeletonRows count={3} />}
      {offers !== null && (
        <>
          <p className="section-title">Open offers</p>
          {open.length === 0 && (
            <p className="empty">
              <span className="big"><SwapIcon size={26} /></span>
              <strong>No shifts up for swap</strong>
              When someone offers a shift it appears here. Tap + to offer one of yours.
            </p>
          )}
          <div className="cards-grid">
            {open.map((o) => <OfferCard key={o.id} o={o} me={me} onAction={act} onAccept={openAccept} />)}
          </div>

          {pending.length > 0 && (
            <>
              <p className="section-title">Awaiting approval</p>
              <div className="cards-grid">
                {pending.map((o) => <OfferCard key={o.id} o={o} me={me} onAction={act} onAccept={openAccept} />)}
              </div>
            </>
          )}

          {done.length > 0 && (
            <>
              <p className="section-title">Recent</p>
              <div className="cards-grid">
                {done.map((o) => <OfferCard key={o.id} o={o} me={me} onAction={act} onAccept={openAccept} />)}
              </div>
            </>
          )}
        </>
      )}

      <button className="fab" onClick={openPicker} aria-label="Offer a shift"><PlusIcon size={24} /></button>

      {showPick && createPortal(
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
                <strong>{fmtDate(s.shift_date)}</strong> · {fmtTime(s.start_time)} – {fmtTime(s.end_time)} ({shiftHours(s)}h)
                <br />
                <span className="sub"><PinIcon size={12} /> {s.location.name} · {s.role.name}</span>
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
        </div>,
        document.body,
      )}

      {acceptOffer && createPortal(
        <div className="modal-back" onClick={() => setAcceptOffer(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <h2>Pick a shift to give back</h2>
            <p className="sub" style={{ marginBottom: 10 }}>
              You're taking {acceptOffer.offerer.name}'s {wantedHours}h shift on {fmtDate(acceptOffer.shift.shift_date)}.
              Swaps must be for the same hours, so pick one of your {wantedHours}h shifts to give in return.
            </p>
            {acceptShifts.length === 0 && (
              <p className="empty">You have no upcoming shifts to swap (next 4 weeks).</p>
            )}
            {acceptShifts.map((s) => {
              const h = shiftHours(s);
              const match = h === wantedHours;
              return (
                <button
                  key={s.id}
                  className={"offer-shift-pick" + (acceptPick?.id === s.id ? " selected" : "")}
                  disabled={!match}
                  style={match ? undefined : { opacity: 0.45 }}
                  onClick={() => setAcceptPick(s)}
                >
                  <strong>{fmtDate(s.shift_date)}</strong> · {fmtTime(s.start_time)} – {fmtTime(s.end_time)} ({h}h)
                  <br />
                  <span className="sub"><PinIcon size={12} /> {s.location.name} · {s.role.name}{match ? "" : " — different hours"}</span>
                </button>
              );
            })}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" disabled={!acceptPick} onClick={submitAccept}>Request swap</button>
              <button className="btn secondary" onClick={() => setAcceptOffer(null)}>Cancel</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
