import type { DietaryRestriction } from "./database.types";

export const dietaryRestrictionOptions: ReadonlyArray<{
  value: DietaryRestriction;
  label: string;
}> = [
  { value: "Vegetarian", label: "Vegetarisch" },
  { value: "Vegan", label: "Vegan" },
  { value: "Lactose intolerant", label: "Laktoseintolerant" },
];

export function isDietaryRestriction(
  value: string
): value is DietaryRestriction {
  return dietaryRestrictionOptions.some((option) => option.value === value);
}
