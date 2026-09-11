import { ServiceError } from "../../http/serviceError";

export class HazardContractError extends ServiceError {
  readonly path: string;

  constructor(path: string) {
    super("Hazard response is invalid", "invalid_response");
    this.name = "HazardContractError";
    this.path = path;
  }
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.flatMap((item) => {
        const record = asRecord(item);
        return record ? [record] : [];
      })
    : [];
}

export function parseRecord(value: unknown, path: string): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) throw new HazardContractError(path);
  return record;
}

export function parseString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new HazardContractError(path);
  }
  return value;
}

export function parseFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new HazardContractError(path);
  }
  return value;
}

export function parseStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new HazardContractError(path);
  return value.map((item, index) => parseString(item, `${path}.${index}`));
}

export function parseCoordinates(value: unknown, path: string): number[] {
  if (!Array.isArray(value) || value.length < 2) throw new HazardContractError(path);
  return value.map((coordinate, index) => parseFiniteNumber(coordinate, `${path}.${index}`));
}

export function parseOptionalString(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : parseString(value, path);
}

export function parseNonNegativeInteger(value: unknown, path: string): number {
  const number = parseFiniteNumber(value, path);
  if (!Number.isInteger(number) || number < 0) throw new HazardContractError(path);
  return number;
}
