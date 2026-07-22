import React from "react";
import Avatar from "./Avatar.jsx";
import { timeParts } from "../util.js";

export default function ShiftCard({ shift, isMine, action, subtitle }) {
  const [st, stAmpm] = timeParts(shift.start_time);
  const [et, etAmpm] = timeParts(shift.end_time);
  const roleClass = shift.role.name.toLowerCase().includes("mood") ? "role-mood" : "role-centre";
  return (
    <div className="shift-card">
      <div className={"time-rail" + (shift.status === "swapped" ? " swapped" : "")}>
        <span className="t">{st}</span>
        <span className="ampm">{stAmpm}</span>
        <span className="rail" />
        <span className="t">{et}</span>
        <span className="ampm">{etAmpm}</span>
      </div>
      <div className="shift-body">
        <div className="shift-who">
          <Avatar name={shift.staff.name} size="sm" />
          <div>
            <div className="name">{shift.staff.name}</div>
            {subtitle && <div className="sub">{subtitle}</div>}
          </div>
        </div>
        <div className="shift-chips">
          <span className="chip loc">📍 {shift.location.name}</span>
          <span className={`chip ${roleClass}`}>{shift.role.name}</span>
          {shift.status === "swapped" && <span className="chip swapped">Swapped in</span>}
        </div>
      </div>
      <div className="shift-side">
        {isMine && <span className="chip you">You</span>}
        {action}
      </div>
    </div>
  );
}
