import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const CityAutocompleteInput = ({
  id,
  label,
  value,
  onChange,
  cities,
  placeholder,
  testIdPrefix,
}) => {
  const filteredCities = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return cities.slice(0, 100);
    }
    return cities.filter((city) => city.toLowerCase().includes(query)).slice(0, 100);
  }, [cities, value]);

  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}-wrap`}>
      <Label htmlFor={id} data-testid={`${testIdPrefix}-label`}>
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        list={`${id}-city-options`}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        data-testid={`${testIdPrefix}-input`}
      />
      <datalist id={`${id}-city-options`} data-testid={`${testIdPrefix}-datalist`}>
        {filteredCities.map((city) => (
          <option key={`${id}-${city}`} value={city} data-testid={`${testIdPrefix}-option-${city}`} />
        ))}
      </datalist>
    </div>
  );
};
