import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const defaultCenter = [22.9734, 78.6569];

const geocodeCity = async (cityName) => {
  if (!cityName) {
    return null;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(cityName)}`,
    );
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) {
      return null;
    }
    return [Number(data[0].lat), Number(data[0].lon)];
  } catch {
    return null;
  }
};

export const RouteMap = ({ rides, selectedRide }) => {
  const [ridePoints, setRidePoints] = useState([]);
  const [selectedLine, setSelectedLine] = useState([]);

  useEffect(() => {
    const loadRidePoints = async () => {
      const topRides = rides.slice(0, 6);
      const coords = await Promise.all(
        topRides.map(async (ride) => {
          const fromCoord = await geocodeCity(ride.from_city);
          const toCoord = await geocodeCity(ride.to_city);
          return {
            id: ride.id,
            fromCoord,
            toCoord,
            route: `${ride.from_city} → ${ride.to_city}`,
            price: ride.price_per_seat,
          };
        }),
      );

      setRidePoints(coords.filter((item) => item.fromCoord || item.toCoord));
    };

    loadRidePoints();
  }, [rides]);

  useEffect(() => {
    const loadSelected = async () => {
      if (!selectedRide) {
        setSelectedLine([]);
        return;
      }

      const fromCoord = await geocodeCity(selectedRide.from_city);
      const toCoord = await geocodeCity(selectedRide.to_city);
      if (fromCoord && toCoord) {
        setSelectedLine([fromCoord, toCoord]);
      }
    };

    loadSelected();
  }, [selectedRide]);

  const center = useMemo(() => {
    if (selectedLine.length === 2) {
      return selectedLine[0];
    }
    if (ridePoints.length && ridePoints[0].fromCoord) {
      return ridePoints[0].fromCoord;
    }
    return defaultCenter;
  }, [ridePoints, selectedLine]);

  const markerElements = useMemo(
    () =>
      ridePoints.flatMap((ride) => {
        const elements = [];
        if (ride.fromCoord) {
          elements.push(
            <CircleMarker
              key={`${ride.id}-from`}
              center={ride.fromCoord}
              radius={8}
              pathOptions={{ color: "#4338ca", fillColor: "#4338ca", fillOpacity: 0.8 }}
            >
              <Popup>
                <div data-testid={`map-from-point-${ride.id}`}>
                  <p className="font-semibold">Start: {ride.route}</p>
                  <p>₹{ride.price} / seat</p>
                </div>
              </Popup>
            </CircleMarker>,
          );
        }
        if (ride.toCoord) {
          elements.push(
            <CircleMarker
              key={`${ride.id}-to`}
              center={ride.toCoord}
              radius={8}
              pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.8 }}
            >
              <Popup>
                <div data-testid={`map-to-point-${ride.id}`}>
                  <p className="font-semibold">Drop: {ride.route}</p>
                  <p>₹{ride.price} / seat</p>
                </div>
              </Popup>
            </CircleMarker>,
          );
        }
        return elements;
      }),
    [ridePoints],
  );

  return (
    <div
      className="overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-sm"
      data-testid="ride-map-wrapper"
    >
      <MapContainer
        center={center}
        zoom={5}
        scrollWheelZoom={false}
        className="h-[420px] w-full rounded-2xl"
        data-testid="ride-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markerElements}

        {selectedLine.length === 2 && (
          <Polyline
            positions={selectedLine}
            pathOptions={{ color: "#18181b", weight: 4, dashArray: "8 6" }}
          />
        )}
      </MapContainer>
    </div>
  );
};
