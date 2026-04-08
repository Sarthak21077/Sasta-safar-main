import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const formatTimer = (seconds) => {
  if (seconds === null || seconds === undefined) return "";
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function SafetyPage() {
  const [coords, setCoords] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(null);

  const fetchEligibility = useCallback(async () => {
    setLoadingEligibility(true);
    try {
      const response = await api.get("/safety/eligibility");
      setEligibility(response.data);
      setSecondsLeft(response.data?.seconds_to_start ?? null);
    } catch {
      setEligibility({
        allowed: false,
        reason: "Unable to fetch ride safety status right now.",
      });
      setSecondsLeft(null);
    } finally {
      setLoadingEligibility(false);
    }
  }, []);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && eligibility && !eligibility.allowed) {
      fetchEligibility();
    }
  }, [secondsLeft, eligibility, fetchEligibility]);

  const safetyLocked = useMemo(() => !eligibility?.allowed, [eligibility]);

  const locateUser = () => {
    if (safetyLocked) {
      toast.error("Safety GPS sharing activates automatically once your ride starts");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude).toFixed(6);
        const lng = Number(position.coords.longitude).toFixed(6);
        setCoords({ lat, lng });
        toast.success("Location captured successfully");
      },
      () => toast.error("Unable to access your location"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const openNearbyPolice = () => {
    if (safetyLocked) {
      toast.error("Safety GPS sharing activates automatically once your ride starts");
      return;
    }

    if (!coords) {
      toast.error("Please capture your location first");
      return;
    }
    window.open(
      `https://www.google.com/maps/search/police+station/@${coords.lat},${coords.lng},14z`,
      "_blank",
    );
  };

  const shareLocation = async () => {
    if (safetyLocked) {
      toast.error("Safety GPS sharing activates automatically once your ride starts");
      return;
    }

    if (!coords) {
      toast.error("Please capture your location first");
      return;
    }

    const message = `Emergency support requested. My live location: https://maps.google.com/?q=${coords.lat},${coords.lng}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sasta Safar Safety Alert",
          text: message,
        });
        toast.success("Location shared successfully");
      } catch {
        toast.error("Could not share location");
      }
      return;
    }

    if (!navigator.clipboard) {
      toast.error("Clipboard access is unavailable. Please copy from the map link manually.");
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      toast.success("Location copied. Share it with nearest police authority.");
    } catch {
      toast.error("Clipboard permission denied. Please share location manually.");
    }
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8" data-testid="safety-page">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-red-100 p-2 text-red-600">
            <ShieldAlert size={22} />
          </div>
          <h1 className="font-heading text-4xl font-bold text-zinc-900" data-testid="safety-heading">
            Safety Assurance
          </h1>
        </div>

        <p className="mt-4 text-sm text-zinc-700 sm:text-base" data-testid="safety-description">
          In case of emergency, capture your GPS location and instantly share it with the nearest
          local police station or authorities.
        </p>

        <div className="mt-5 rounded-2xl border border-border bg-accent p-4" data-testid="safety-eligibility-card">
          {loadingEligibility ? (
            <p className="flex items-center gap-2 text-sm text-zinc-700" data-testid="safety-eligibility-loading">
              <Loader2 className="animate-spin" size={16} /> Checking ride status...
            </p>
          ) : (
            <>
              <p className="font-semibold text-zinc-900" data-testid="safety-eligibility-reason">
                {eligibility?.reason}
              </p>
              {eligibility?.ride_id && (
                <p className="mt-1 text-sm text-zinc-700" data-testid="safety-ride-details">
                  Ride: {eligibility.from_city} → {eligibility.to_city}
                </p>
              )}
              {safetyLocked && secondsLeft !== null && secondsLeft > 0 && (
                <p className="mt-2 text-sm font-semibold text-primary" data-testid="safety-countdown-timer">
                  Unlocks in {formatTimer(secondsLeft)}
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Button
            onClick={locateUser}
            className="rounded-full px-6"
            disabled={safetyLocked || loadingEligibility}
            data-testid="capture-location-button"
          >
            Capture my GPS location
          </Button>
          <Button
            onClick={openNearbyPolice}
            variant="outline"
            className="rounded-full border-2 px-6"
            disabled={safetyLocked || loadingEligibility}
            data-testid="open-police-map-button"
          >
            Find nearest police station
          </Button>
          <Button
            onClick={shareLocation}
            variant="outline"
            className="rounded-full border-2 px-6"
            disabled={safetyLocked || loadingEligibility}
            data-testid="share-location-button"
          >
            Share my location
          </Button>
        </div>

        <div className="mt-3">
          <Button
            variant="ghost"
            onClick={fetchEligibility}
            className="rounded-full"
            data-testid="refresh-safety-status-button"
          >
            Refresh ride start status
          </Button>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-accent p-4" data-testid="captured-location-card">
          <p className="text-sm text-zinc-600">Captured coordinates</p>
          <p className="mt-1 font-semibold text-zinc-900" data-testid="captured-location-value">
            {coords ? `${coords.lat}, ${coords.lng}` : "Not captured yet"}
          </p>
        </div>
      </div>
    </section>
  );
}
