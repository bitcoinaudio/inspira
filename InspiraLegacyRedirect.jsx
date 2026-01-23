import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function InspiraLegacyRedirect() {
  const location = useLocation();

  const pathname = location.pathname.replace(/^\/apps\/inspira/, "/inspira");
  const to = `${pathname}${location.search}${location.hash}`;

  return <Navigate to={to} replace />;
}
