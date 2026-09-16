import React, { useEffect } from "react";
import { LogoMark, OrgLogo, hasOrgLogo, orgTheme } from "./Logo.jsx";

/** Full-screen notice for a workplace that has been switched off. */
export default function OrgOffline({ org }) {
  // the offline page still wears the workplace's own colours
  useEffect(() => {
    const theme = orgTheme(org?.slug);
    if (theme) document.documentElement.setAttribute("data-org", theme);
    else document.documentElement.removeAttribute("data-org");
  }, [org]);

  const branded = hasOrgLogo(org?.slug);
  return (
    <div className="login">
      {branded ? (
        <div className="login-org-logo"><OrgLogo slug={org.slug} /></div>
      ) : (
        <div className="brandmark"><LogoMark size={72} idSuffix="-offline" /></div>
      )}
      <h1 className="offline-title">
        {branded ? "Offline" : `${org?.name ?? "This workplace"} Offline`}
      </h1>
      <p className="subtitle">
        {org?.name ?? "This workplace"} is currently offline. Please check back later.
      </p>
    </div>
  );
}
