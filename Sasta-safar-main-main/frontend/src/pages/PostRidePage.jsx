import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { CityAutocompleteInput } from "@/components/CityAutocompleteInput";
import { useIndiaCities } from "@/hooks/useIndiaCities";

export default function PostRidePage() {
  const navigate = useNavigate();
  const cities = useIndiaCities();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savedDefaults, setSavedDefaults] = useState(null);
  const [form, setForm] = useState({
    from_city: "",
    to_city: "",
    date: "",
    time: "",
    seats_available: 1,
    price_per_seat: "",
    driving_licence_number: "",
    vehicle_number: "",
  });

  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const response = await api.get("/driver/preferences");
        setSavedDefaults(response.data);
      } catch {
        setSavedDefaults(null);
      }
    };

    loadDefaults();
  }, []);

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const nextStep = () => {
    if (step === 1 && (!form.from_city || !form.to_city)) {
      toast.error("Please enter both route cities");
      return;
    }
    if (step === 2 && (!form.date || !form.time || !form.seats_available)) {
      toast.error("Please fill date, time and seats");
      return;
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const submitRide = async () => {
    if (!form.price_per_seat || Number(form.price_per_seat) <= 0) {
      toast.error("Enter a valid seat price");
      return;
    }
    if (!form.driving_licence_number.trim()) {
      toast.error("Please enter driving licence number");
      return;
    }
    if (!form.vehicle_number.trim()) {
      toast.error("Please enter vehicle number");
      return;
    }

    setLoading(true);
    try {
      await api.post("/rides", {
        ...form,
        seats_available: Number(form.seats_available),
        price_per_seat: Number(form.price_per_seat),
        driving_licence_number: form.driving_licence_number,
        vehicle_number: form.vehicle_number,
      });
      toast.success("Ride posted successfully");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Unable to post ride");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8" data-testid="post-ride-page">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        {savedDefaults && (
          <div className="mb-4 rounded-2xl border border-border bg-accent p-4" data-testid="saved-defaults-card">
            <p className="text-sm text-zinc-700" data-testid="saved-defaults-text">
              Saved defaults found for quick posting.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-2 rounded-full border-2"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  from_city: savedDefaults.from_city || prev.from_city,
                  to_city: savedDefaults.to_city || prev.to_city,
                  time: savedDefaults.time || prev.time,
                  seats_available: savedDefaults.seats_available || prev.seats_available,
                  price_per_seat: savedDefaults.price_per_seat || prev.price_per_seat,
                  driving_licence_number:
                    savedDefaults.driving_licence_number || prev.driving_licence_number,
                  vehicle_number: savedDefaults.vehicle_number || prev.vehicle_number,
                }))
              }
              data-testid="use-saved-defaults-button"
            >
              Use saved details in one click
            </Button>
          </div>
        )}

        <p className="text-xs font-bold uppercase tracking-widest text-zinc-600" data-testid="post-ride-step-text">
          Step {step} of 3
        </p>
        <h1
          className="font-heading mt-2 text-4xl font-bold text-zinc-900"
          data-testid="post-ride-heading"
        >
          Post your ride
        </h1>

        <div className="mt-6 h-2 w-full rounded-full bg-zinc-200" data-testid="post-ride-progress-bg">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
            data-testid="post-ride-progress-fill"
          />
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-8 space-y-4"
        >
          {step === 1 && (
            <>
              <CityAutocompleteInput
                id="from_city"
                label="From City"
                value={form.from_city}
                onChange={(value) => updateField("from_city", value)}
                cities={cities}
                placeholder="e.g., Jaipur"
                testIdPrefix="from-city"
              />
              <CityAutocompleteInput
                id="to_city"
                label="To City"
                value={form.to_city}
                onChange={(value) => updateField("to_city", value)}
                cities={cities}
                placeholder="e.g., Delhi"
                testIdPrefix="to-city"
              />
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2" data-testid="date-field-wrap">
                <Label htmlFor="date" data-testid="date-label">
                  Travel Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  data-testid="date-input"
                />
              </div>
              <div className="space-y-2" data-testid="time-field-wrap">
                <Label htmlFor="time" data-testid="time-label">
                  Departure Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={form.time}
                  onChange={(event) => updateField("time", event.target.value)}
                  data-testid="time-input"
                />
              </div>
              <div className="space-y-2" data-testid="seats-field-wrap">
                <Label htmlFor="seats_available" data-testid="seats-label">
                  Available Seats
                </Label>
                <Input
                  id="seats_available"
                  type="number"
                  min={1}
                  max={8}
                  value={form.seats_available}
                  onChange={(event) => updateField("seats_available", event.target.value)}
                  data-testid="seats-input"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2" data-testid="price-field-wrap">
                <Label htmlFor="price_per_seat" data-testid="price-label">
                  Price per seat (INR)
                </Label>
                <Input
                  id="price_per_seat"
                  type="number"
                  min={1}
                  step="0.01"
                  value={form.price_per_seat}
                  onChange={(event) => updateField("price_per_seat", event.target.value)}
                  placeholder="e.g., 450.00"
                  data-testid="price-input"
                />
              </div>

              <div className="space-y-2" data-testid="vehicle-number-field-wrap">
                <Label htmlFor="vehicle_number" data-testid="vehicle-number-label">
                  Vehicle Number
                </Label>
                <Input
                  id="vehicle_number"
                  value={form.vehicle_number}
                  onChange={(event) => updateField("vehicle_number", event.target.value.toUpperCase())}
                  placeholder="e.g., UP32AB1234"
                  data-testid="vehicle-number-input"
                />
              </div>

              <div className="rounded-2xl border border-border bg-accent p-4" data-testid="licence-details-box">
                <div className="space-y-2" data-testid="licence-number-field-wrap">
                  <Label htmlFor="driving_licence_number" data-testid="licence-number-label">
                    Driving Licence Number
                  </Label>
                  <Input
                    id="driving_licence_number"
                    value={form.driving_licence_number}
                    onChange={(event) =>
                      updateField("driving_licence_number", event.target.value.toUpperCase())
                    }
                    placeholder="e.g., UP3220200012345"
                    data-testid="licence-number-input"
                  />
                  <p className="text-xs text-zinc-600" data-testid="licence-validation-note">
                    Temporary validation checks official Indian DL format. API verification can be
                    enabled once credentials are added.
                  </p>
                </div>
              </div>
            </>
          )}
        </motion.div>

        <div className="mt-8 flex flex-wrap justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-2"
            onClick={() => setStep((prev) => Math.max(prev - 1, 1))}
            disabled={step === 1}
            data-testid="post-ride-back-button"
          >
            Back
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              className="rounded-full px-8"
              onClick={nextStep}
              data-testid="post-ride-next-button"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              className="rounded-full px-8"
              onClick={submitRide}
              disabled={loading}
              data-testid="post-ride-submit-button"
            >
              {loading ? "Posting..." : "Publish ride"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
