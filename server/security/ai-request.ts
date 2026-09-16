/** 校验 AI 聊天请求的结构、字段类型和内容长度边界。 */
const MAX_MESSAGES = 50;
const MAX_MESSAGE_CONTENT_LENGTH = 8_000;
const MAX_CONTEXT_RECENT_ITEMS = 50;
const MAX_CONTEXT_FIELD_LENGTH = 1_000;

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown, maxLength = MAX_CONTEXT_FIELD_LENGTH): boolean {
  return value === undefined || (typeof value === "string" && value.length <= maxLength);
}

function isValidMessage(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.role === "system" || value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    value.content.length <= MAX_MESSAGE_CONTENT_LENGTH
  );
}

function isValidRecentHazard(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalString(value.id) &&
    isOptionalString(value.title) &&
    isOptionalString(value.type) &&
    isOptionalString(value.source) &&
    isOptionalString(value.severity)
  );
}

function isValidDisasterContext(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  if (value.total !== undefined) {
    if (typeof value.total !== "number" || !Number.isSafeInteger(value.total) || value.total < 0) {
      return false;
    }
  }

  if (value.byType !== undefined) {
    if (!isRecord(value.byType) || Object.keys(value.byType).length > MAX_CONTEXT_RECENT_ITEMS) {
      return false;
    }
    if (
      Object.entries(value.byType).some(([key, count]) => {
        return (
          key.length > MAX_CONTEXT_FIELD_LENGTH ||
          typeof count !== "number" ||
          !Number.isSafeInteger(count) ||
          count < 0
        );
      })
    ) {
      return false;
    }
  }

  if (value.recent !== undefined) {
    if (!Array.isArray(value.recent) || value.recent.length > MAX_CONTEXT_RECENT_ITEMS) {
      return false;
    }
    if (value.recent.some((hazard) => !isValidRecentHazard(hazard))) {
      return false;
    }
  }

  return true;
}

function isValidLocation(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  return typeof value === "string" && value.length <= MAX_CONTEXT_FIELD_LENGTH;
}

export function isValidAIRequest(value: unknown): value is RecordValue {
  if (!isRecord(value) || !Array.isArray(value.messages) || value.messages.length > MAX_MESSAGES) {
    return false;
  }

  return (
    value.messages.every(isValidMessage) &&
    isValidDisasterContext(value.disasterContext) &&
    isValidLocation(value.location) &&
    isOptionalString(value.language, 32)
  );
}
