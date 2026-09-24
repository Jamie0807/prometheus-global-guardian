let csrfToken: string | undefined;

export function setAuthCsrfToken(value: string | undefined): void {
  csrfToken = value;
}

export function getAuthCsrfToken(): string | undefined {
  return csrfToken;
}
