import type { ActiveHazard, HazardType } from "../../../types";
import { HazardContractError, parseFiniteNumber, parseRecord } from "./common";

const activeHazardStringKeys = [
  "app_IDs",
  "autoexpire",
  "category_ID",
  "charter_Uri",
  "comment_Text",
  "create_Date",
  "creator",
  "end_Date",
  "glide_Uri",
  "hazard_Name",
  "last_Update",
  "master_Incident_ID",
  "message_ID",
  "severity_ID",
  "snc_url",
  "start_Date",
  "status",
  "type_ID",
  "update_Date",
  "product_total",
  "uuid",
  "in_Dashboard",
  "description",
] as const;

type ActiveHazardStringFields = {
  [Key in (typeof activeHazardStringKeys)[number]]: string;
};

function parseString(value: unknown, path: string): string {
  if (typeof value !== "string") throw new HazardContractError(path);
  return value;
}

function parseNullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  return parseString(value, path);
}

function assertActiveHazardStrings(
  hazard: Record<string, unknown>,
  path: string,
): asserts hazard is Record<string, unknown> & ActiveHazardStringFields {
  for (const key of activeHazardStringKeys) {
    parseString(hazard[key], `${path}.${key}`);
  }
}

function parseHazardType(value: unknown, path: string): HazardType {
  const hazardType = parseRecord(value, path);
  const typeIcon =
    hazardType.type_icon === undefined
      ? undefined
      : parseString(hazardType.type_icon, `${path}.type_icon`);

  return {
    type_id: parseString(hazardType.type_id, `${path}.type_id`),
    type_name: parseString(hazardType.type_name, `${path}.type_name`),
    ...(typeIcon === undefined ? {} : { type_icon: typeIcon }),
  };
}

function parseActiveHazard(value: unknown, path: string): ActiveHazard {
  const hazard = parseRecord(value, path);
  assertActiveHazardStrings(hazard, path);
  if (!Array.isArray(hazard.roles)) throw new HazardContractError(`${path}.roles`);

  return {
    app_ID: parseFiniteNumber(hazard.app_ID, `${path}.app_ID`),
    app_IDs: hazard.app_IDs,
    autoexpire: hazard.autoexpire,
    category_ID: hazard.category_ID,
    charter_Uri: hazard.charter_Uri,
    comment_Text: hazard.comment_Text,
    create_Date: hazard.create_Date,
    creator: hazard.creator,
    end_Date: hazard.end_Date,
    glide_Uri: hazard.glide_Uri,
    hazard_ID: parseFiniteNumber(hazard.hazard_ID, `${path}.hazard_ID`),
    hazard_Name: hazard.hazard_Name,
    last_Update: hazard.last_Update,
    latitude: parseFiniteNumber(hazard.latitude, `${path}.latitude`),
    longitude: parseFiniteNumber(hazard.longitude, `${path}.longitude`),
    master_Incident_ID: hazard.master_Incident_ID,
    message_ID: hazard.message_ID,
    org_ID: parseFiniteNumber(hazard.org_ID, `${path}.org_ID`),
    severity_ID: hazard.severity_ID,
    snc_url: hazard.snc_url,
    start_Date: hazard.start_Date,
    status: hazard.status,
    type_ID: hazard.type_ID,
    update_Date: hazard.update_Date,
    update_User: parseNullableString(hazard.update_User, `${path}.update_User`),
    product_total: hazard.product_total,
    uuid: hazard.uuid,
    in_Dashboard: hazard.in_Dashboard,
    areabrief_url: parseNullableString(hazard.areabrief_url, `${path}.areabrief_url`),
    description: hazard.description,
    roles: hazard.roles,
  };
}

export function parseHazardTypes(value: unknown): HazardType[] {
  if (!Array.isArray(value)) throw new HazardContractError("response");
  return value.map((hazardType, index) => parseHazardType(hazardType, `hazardTypes.${index}`));
}

export function parseActiveHazards(value: unknown): ActiveHazard[] {
  if (!Array.isArray(value)) throw new HazardContractError("response");
  return value.map((hazard, index) => parseActiveHazard(hazard, `activeHazards.${index}`));
}
