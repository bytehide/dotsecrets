import { describe, it, expect, beforeAll } from "vitest";
import { secrets, preloadAllSecrets } from "../src/index"; // ajusta el path si fuera necesario

beforeAll(async () => {
  // Carga los secretos desde el directorio actual
  await preloadAllSecrets(".");
});

describe("dotsecrets", () => {
  it("should resolve a required secret", async () => {
    process.env.KIKE = "12345"; // mock para test
    const value = await secrets.KIKE.required();
    expect(value).toBe("12345");
  });

  /*it("should convert secret to number", async () => {
    process.env.PUBLIC_PORT = "8080";
    const port = await secrets.PUBLIC_PORT.number().required();
    expect(port).toBe(8080);
  });*/

  it("should validate boolean secret", async () => {
    process.env.DEBUG = "true";
    const isDebug = await secrets.DEBUG.boolean().true();
    expect(isDebug).toBe(true);
  });

  it("should throw if required secret is missing", async () => {
    delete process.env.SHOULD_THROW;
    await expect(() => secrets.SHOULD_THROW.required()).rejects.toThrow();
  });

  it("should validate regex", async () => {
    process.env.TOKEN = "abc-123";
    const token = await secrets.TOKEN
      .required()
      .regex(/^[-a-z0-9]+$/i, "Invalid token format");

    expect(token).toBe("abc-123");
  });
});