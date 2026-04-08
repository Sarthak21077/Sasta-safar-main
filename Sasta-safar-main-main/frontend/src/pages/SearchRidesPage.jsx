import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RouteMap } from "@/components/RouteMap";
import { CityAutocompleteInput } from "@/components/CityAutocompleteInput";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useIndiaCities } from "@/hooks/useIndiaCities";

const formatDate = (isoDate) => {
  if (!isoDate) return "Any date";
  return new Date(isoDate).toLocaleDateString();
};

export default function SearchRidesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cities = useIndiaCities();
  const [filters, setFilters] = useState({ from_city: "", to_city: "", date: "" });
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [offer, setOffer] = useState({ offered_price: "", seats_requested: 1 });
  const [offerLoading, setOfferLoading] = useState(false);
  const [mobileView, setMobileView] = useState("list");

  const selectedRide = useMemo(
    () => rides.find((ride) => ride.id === selectedRideId) || null,
    [rides, selectedRideId],
  );

  const runSearch = async () => {
    setLoading(true);
    try {
      const response = await api.get("/rides/search", { params: filters });
      setRides(response.data);
      if (response.data.length) {
        setSelectedRideId(response.data[0].id);
      }
    } catch {
      toast.error("Unable to search rides right now");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedRide) {
      setOffer((prev) => ({
        ...prev,
        offered_price: selectedRide.price_per_seat,
      }));
    }
  }, [selectedRide]);

  const submitOffer = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (!selectedRide) {
      toast.error("Please select a ride first");
      return;
    }
    if (!offer.offered_price || Number(offer.offered_price) <= 0) {
      toast.error("Enter a valid offer price");
      return;
    }

    setOfferLoading(true);
    try {
      await api.post("/requests", {
        ride_id: selectedRide.id,
        offered_price: Number(offer.offered_price),
        seats_requested: Number(offer.seats_requested),
      });

      const mine = await api.get("/requests/mine");
      const visibleRequest = mine.data.find((item) => item.ride_id === selectedRide.id);
      if (!visibleRequest) {
        toast.error("Request submitted but not visible yet. Please refresh once.");
        return;
      }

      toast.success("Request sent! Redirecting to My Bookings.");
      setOffer({ offered_price: "", seats_requested: 1 });
      navigate("/my-bookings");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send request");
    } finally {
      setOfferLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="search-page">
      <div className="mb-6 rounded-3xl border border-border bg-card p-6 shadow-sm" data-testid="search-filter-card">
        <h1 className="font-heading text-4xl font-bold text-zinc-900" data-testid="search-heading">
          Find matching rides
        </h1>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="space-y-2" data-testid="search-from-wrap">
            <CityAutocompleteInput
              id="search_from"
              label="From city"
              value={filters.from_city}
              onChange={(value) => setFilters((prev) => ({ ...prev, from_city: value }))}
              cities={cities}
              placeholder="e.g., Jaipur"
              testIdPrefix="search-from"
            />
          </div>

          <div className="space-y-2" data-testid="search-to-wrap">
            <CityAutocompleteInput
              id="search_to"
              label="To city"
              value={filters.to_city}
              onChange={(value) => setFilters((prev) => ({ ...prev, to_city: value }))}
              cities={cities}
              placeholder="e.g., Delhi"
              testIdPrefix="search-to"
            />
          </div>

          <div className="space-y-2" data-testid="search-date-wrap">
            <Label htmlFor="search_date" data-testid="search-date-label">
              Date
            </Label>
            <Input
              id="search_date"
              type="date"
              value={filters.date}
              onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
              data-testid="search-date-input"
            />
          </div>

          <div className="flex items-end">
            <Button
              className="h-12 w-full rounded-full"
              onClick={runSearch}
              disabled={loading}
              data-testid="search-submit-button"
            >
              <Search size={16} className="mr-2" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-2 lg:hidden" data-testid="mobile-view-toggle-wrap">
        <Button
          variant={mobileView === "list" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setMobileView("list")}
          data-testid="mobile-list-view-button"
        >
          Ride list
        </Button>
        <Button
          variant={mobileView === "map" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setMobileView("map")}
          data-testid="mobile-map-view-button"
        >
          Map view
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.56fr_0.44fr]">
        <div
          className={`space-y-4 ${mobileView === "map" ? "hidden lg:block" : "block"}`}
          data-testid="rides-list-section"
        >
          {rides.map((ride, index) => (
            <motion.article
              key={ride.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className={`cursor-pointer rounded-3xl border p-6 shadow-sm transition-all ${
                ride.id === selectedRideId
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:-translate-y-0.5 hover:shadow-md"
              }`}
              onClick={() => setSelectedRideId(ride.id)}
              data-testid={`ride-card-${ride.id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-heading text-xl font-semibold text-zinc-900" data-testid={`ride-route-${ride.id}`}>
                  {ride.from_city} → {ride.to_city}
                </p>
                <span
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700"
                  data-testid={`ride-driver-${ride.id}`}
                >
                  Driver: {ride.driver_name}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-700">
                <p data-testid={`ride-date-${ride.id}`}>Date: {formatDate(ride.date)}</p>
                <p data-testid={`ride-time-${ride.id}`}>Time: {ride.time}</p>
                <p data-testid={`ride-seats-${ride.id}`}>Seats: {ride.seats_available}</p>
                <p className="font-bold text-primary" data-testid={`ride-price-${ride.id}`}>
                  ₹{ride.price_per_seat}/seat
                </p>
              </div>
            </motion.article>
          ))}

          {!rides.length && (
            <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center" data-testid="empty-rides-state">
              <p className="text-zinc-700">No rides found. Try adjusting cities or date.</p>
            </div>
          )}

          {selectedRide && (
            <div className="rounded-3xl border border-border bg-card p-6" data-testid="offer-form-card">
              <h2 className="font-heading text-xl font-semibold text-zinc-900" data-testid="offer-form-heading">
                Send your offer for {selectedRide.from_city} → {selectedRide.to_city}
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2" data-testid="offer-price-wrap">
                  <Label htmlFor="offer_price" data-testid="offer-price-label">
                    Your offered price (INR)
                  </Label>
                  <Input
                    id="offer_price"
                    type="number"
                    min={1}
                    step="0.01"
                    value={offer.offered_price}
                    onChange={(event) => setOffer((prev) => ({ ...prev, offered_price: event.target.value }))}
                    placeholder={`Base price: ₹${selectedRide.price_per_seat}`}
                    data-testid="offer-price-input"
                  />
                </div>
                <div className="space-y-2" data-testid="offer-seats-wrap">
                  <Label htmlFor="offer_seats" data-testid="offer-seats-label">
                    Seats needed
                  </Label>
                  <Input
                    id="offer_seats"
                    type="number"
                    min={1}
                    max={Math.max(1, selectedRide.seats_available)}
                    value={offer.seats_requested}
                    onChange={(event) => setOffer((prev) => ({ ...prev, seats_requested: event.target.value }))}
                    data-testid="offer-seats-input"
                  />
                </div>
              </div>

              <Button
                className="mt-4 h-12 rounded-full px-8"
                onClick={submitOffer}
                disabled={offerLoading || !user}
                data-testid="offer-submit-button"
              >
                {offerLoading ? "Sending..." : user ? "Send booking request" : "Sign in to request"}
              </Button>
            </div>
          )}
        </div>

        <div
          className={`${mobileView === "list" ? "hidden lg:block" : "block"} lg:sticky lg:top-24 lg:h-fit`}
          data-testid="map-section"
        >
          <RouteMap rides={rides} selectedRide={selectedRide} />
        </div>
      </div>
    </section>
  );
}
