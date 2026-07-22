import React from "react";
import { initials, avatarColor } from "../util.js";

export default function Avatar({ name, size = "" }) {
  return (
    <span className={`avatar ${size}`} style={{ background: avatarColor(name) }}>
      {initials(name)}
    </span>
  );
}
