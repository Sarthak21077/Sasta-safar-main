import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function MyBookingsPage() {
  const [requests, setRequests] = useState([]);
  const [payingId, setPayingId] = useState(null);

  const loadRequests = async () => {
    try {
      const response = await api.get("/requests/mine");
      setRequests(response.data);
    } catch {
      toast.error("Could not load your booking requests");
    }
  };

  useEffect(() => {
    loadRequests();

    const intervalId = setInterval(loadRequests, 10000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadRequests();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const startPayment = async (requestId) => {
    setPayingId(requestId);
    try {
      const response = await api.post("/payments/checkout/session", {
        request_id: requestId,
        origin_url: window.location.origin,
      });
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Unable to start payment");
      setPayingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="my-bookings-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl font-bold text-zinc-900" data-testid="my-bookings-heading">
            My booking requests
          </h1>
          <p className="mt-2 text-sm text-zinc-600" data-testid="my-bookings-subheading">
            Track request approvals and complete payment after driver accepts your offer.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full border-2"
          onClick={loadRequests}
          data-testid="my-bookings-refresh-button"
        >
          Refresh
        </Button>
      </div>

      <div className="mt-6 space-y-4" data-testid="my-bookings-list">
        {requests.map((request) => (
          <article
            key={request.id}
            className="rounded-3xl border border-border bg-card p-6"
            data-testid={`my-booking-card-${request.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-xl font-semibold" data-testid={`my-booking-route-${request.id}`}>
                {request.from_city} → {request.to_city}
              </h2>
              <span
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase"
                data-testid={`my-booking-status-${request.id}`}
              >
                {request.status}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-700">
              <p data-testid={`my-booking-offer-${request.id}`}>Your offer: ₹{request.offered_price}</p>
              <p data-testid={`my-booking-base-${request.id}`}>Base: ₹{request.base_price}</p>
              <p data-testid={`my-booking-seats-${request.id}`}>Seats: {request.seats_requested}</p>
              <p data-testid={`my-booking-payment-status-${request.id}`}>
                Payment: {request.payment_status}
              </p>
            </div>

            {(request.status === "accepted" || request.status === "booked") &&
            request.payment_status !== "paid" ? (
              <Button
                onClick={() => startPayment(request.id)}
                disabled={payingId === request.id}
                className="mt-4 rounded-full px-8"
                data-testid={`pay-now-button-${request.id}`}
              >
                {payingId === request.id ? "Redirecting..." : "Pay now"}
              </Button>
            ) : request.payment_status === "paid" ? (
              <p className="mt-4 text-sm font-semibold text-green-600" data-testid={`booking-paid-note-${request.id}`}>
                Payment completed. Ride confirmed.
              </p>
            ) : null}
          </article>
        ))}

        {!requests.length && (
          <div
            className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-zinc-700"
            data-testid="my-bookings-empty-state"
          >
            You have not sent any booking requests yet.
          </div>
        )}
      </div>
    </section>
  );
}
