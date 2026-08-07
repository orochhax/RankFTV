import { notFound } from "next/navigation";

// The platform subscription has no approved price yet. Keep the historical
// URL unavailable until a real product and billing contract are defined.
export default function ArenaPlatformSubscriptionUnavailable() {
  notFound();
}
