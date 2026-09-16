/** 验证客户端授权服务对 BFF 认证结果和访问令牌的管理。 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const requestJsonMock = vi.hoisted(() => vi.fn());

vi.mock("../src/services/http/httpClient", () => ({ requestJson: requestJsonMock }));

describe("authorization service", () => {
  beforeEach(() => {
    requestJsonMock.mockReset();
    vi.resetModules();
  });

  it("sets the BFF-managed access token for an authorized response", async () => {
    requestJsonMock.mockResolvedValue({ authorized: true });
    const { authorize, getAccessToken } = await import("../src/services/auth/authService");

    await authorize();

    expect(getAccessToken()).toBe("bff-managed");
  });

  it("rejects a syntactically valid but invalid authorize response", async () => {
    requestJsonMock.mockResolvedValue({ authorized: false });
    const { ServiceError } = await import("../src/services/http/serviceError");
    const { authorize, getAccessToken } = await import("../src/services/auth/authService");

    const authorization = authorize();

    await expect(authorization).rejects.toBeInstanceOf(ServiceError);
    await expect(authorization).rejects.toMatchObject({
      message: "Authorization response is invalid",
      code: "invalid_response",
      responseBody: undefined,
    });
    expect(getAccessToken()).toBe("");
  });

  it("rejects an authorize response with a missing authorization field", async () => {
    requestJsonMock.mockResolvedValue({});
    const { ServiceError } = await import("../src/services/http/serviceError");
    const { authorize } = await import("../src/services/auth/authService");

    const authorization = authorize();

    await expect(authorization).rejects.toBeInstanceOf(ServiceError);
    await expect(authorization).rejects.toMatchObject({
      message: "Authorization response is invalid",
      code: "invalid_response",
      responseBody: undefined,
    });
  });

  it("rejects a non-object authorize response", async () => {
    requestJsonMock.mockResolvedValue("authorized");
    const { ServiceError } = await import("../src/services/http/serviceError");
    const { authorize } = await import("../src/services/auth/authService");

    const authorization = authorize();

    await expect(authorization).rejects.toBeInstanceOf(ServiceError);
    await expect(authorization).rejects.toMatchObject({
      message: "Authorization response is invalid",
      code: "invalid_response",
      responseBody: undefined,
    });
  });
});
