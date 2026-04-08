import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const useIndiaCities = () => {
  const [cities, setCities] = useState([]);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await api.get("/metadata/india-cities");
        setCities(Array.isArray(response.data) ? response.data : []);
      } catch {
        setCities([]);
      }
    };

    loadCities();
  }, []);

  return cities;
};
