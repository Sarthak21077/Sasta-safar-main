import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function DriverRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const loadRequests = async () => {
    try {
      const response = await api.get("/requests/incoming");
      setRequests(response.data);
    } catch {
      toast.error("Unable to load incoming requests");
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

  const decide = async (requestId, decision) => {
    setBusyId(requestId);
    try {
      await api.patch(`/requests/${requestId}/decision`, { decision });
      toast.success(`Request ${decision}ed successfully`);
      await loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not update request");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="incoming-requests-page">
      <h1 className="font-heading text-4xl font-bold text-zinc-900" data-testid="incoming-requests-heading">
        Incoming booking requests
      </h1>
      <p className="mt-2 text-sm text-zinc-600" data-testid="incoming-requests-subheading">
        Review rider offers and decide whether to accept or reject.
      </p>

      <div className="mt-6 space-y-4" data-testid="incoming-requests-list">
        {requests.map((request) => (
          <article
            key={request.id}
            className="rounded-3xl border border-border bg-card p-6 shadow-sm"
            data-testid={`incoming-request-card-${request.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-xl font-semibold" data-testid={`incoming-route-${request.id}`}>
                {request.from_city} → {request.to_city}
              </h2>
              <span
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase text-zinc-700"
                data-testid={`incoming-status-${request.id}`}
              >
                {request.status}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-700">
              <p data-testid={`incoming-rider-${request.id}`}>Rider: {request.rider_name}</p>
              <p data-testid={`incoming-base-price-${request.id}`}>Base: ₹{request.base_price}</p>
              <p className="font-bold text-primary" data-testid={`incoming-offered-price-${request.id}`}>
                Offer: ₹{request.offered_price}
              </p>
              <p data-testid={`incoming-seats-${request.id}`}>Seats: {request.seats_requested}</p>
            </div>

            {request.status === "pending" ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  onClick={() => decide(request.id, "accept")}
                  disabled={busyId === request.id}
                  className="rounded-full px-8"
                  data-testid={`accept-request-button-${request.id}`}
                >
                  Accept offer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => decide(request.id, "reject")}
                  disabled={busyId === request.id}
                  className="rounded-full border-2 px-8"
                  data-testid={`reject-request-button-${request.id}`}
                >
                  Reject
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-sm font-medium text-zinc-600" data-testid={`incoming-final-note-${request.id}`}>
                This request is already {request.status}. Payment status: {request.payment_status}.
              </p>
            )}
          </article>
        ))}

        {!requests.length && (
          <div
            className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-zinc-700"
            data-testid="incoming-empty-state"
          >
            No incoming requests yet.
          </div>
        )}
      </div>
    </section>
  );
}
