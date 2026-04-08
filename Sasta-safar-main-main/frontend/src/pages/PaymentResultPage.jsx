import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function PaymentResultPage() {
  const location = useLocation();
  const [statusData, setStatusData] = useState(null);
  const [checking, setChecking] = useState(false);

  const mode = location.pathname.includes("success") ? "success" : "cancel";
  const sessionId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return query.get("session_id");
  }, [location.search]);

  useEffect(() => {
    if (mode !== "success" || !sessionId) {
      return;
    }

    const pollStatus = async () => {
      setChecking(true);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const response = await api.get(`/payments/checkout/status/${sessionId}`);
          setStatusData(response.data);

          if (response.data.payment_status === "paid" || response.data.status === "expired") {
            break;
          }
        } catch {
          break;
        }
        // eslint-disable-next-line no-await-in-loop
        await wait(2000);
      }
      setChecking(false);
    };

    pollStatus();
  }, [mode, sessionId]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8" data-testid="payment-result-page">
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="font-heading text-4xl font-bold text-zinc-900" data-testid="payment-result-heading">
          {mode === "success" ? "Payment status" : "Payment cancelled"}
        </h1>

        {mode === "cancel" ? (
          <p className="mt-4 text-zinc-700" data-testid="payment-cancel-message">
            You cancelled this checkout. You can retry payment from My Bookings.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            <p className="text-zinc-700" data-testid="payment-session-id">
              Session: {sessionId || "Not available"}
            </p>
            <p className="font-semibold text-zinc-900" data-testid="payment-checking-status">
              {checking ? "Checking status..." : "Status updated"}
            </p>
            {statusData && (
              <>
                <p data-testid="payment-final-status">Checkout status: {statusData.status}</p>
                <p data-testid="payment-final-payment-status">
                  Payment status: {statusData.payment_status}
                </p>
                <p data-testid="payment-final-amount">
                  Amount: {statusData.amount} {statusData.currency.toUpperCase()}
                </p>
              </>
            )}
          </div>
        )}

        <Link to="/my-bookings" data-testid="payment-back-link">
          <Button className="mt-6 rounded-full px-8" data-testid="payment-back-button">
            Back to my bookings
          </Button>
        </Link>
      </div>
    </section>
  );
}
