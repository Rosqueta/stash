import { describe, expect, it } from "vitest";
import { detectInitialLanguage } from "./locale";

describe("detectInitialLanguage", () => {
  it("devuelve 'es' para 'es-ES'", () => {
    expect(detectInitialLanguage("es-ES")).toBe("es");
  });

  it("devuelve 'es' para 'es'", () => {
    expect(detectInitialLanguage("es")).toBe("es");
  });

  it("devuelve 'es' para 'es-419' (Latam)", () => {
    expect(detectInitialLanguage("es-419")).toBe("es");
  });

  it("devuelve 'en' para 'en-US'", () => {
    expect(detectInitialLanguage("en-US")).toBe("en");
  });

  it("devuelve 'en' para 'en-GB'", () => {
    expect(detectInitialLanguage("en-GB")).toBe("en");
  });

  it("devuelve 'en' como fallback para 'fr-FR'", () => {
    expect(detectInitialLanguage("fr-FR")).toBe("en");
  });

  it("devuelve 'en' como fallback para 'ja'", () => {
    expect(detectInitialLanguage("ja")).toBe("en");
  });

  it("devuelve 'en' como fallback para 'de-DE'", () => {
    expect(detectInitialLanguage("de-DE")).toBe("en");
  });

  it("devuelve 'en' para string vacío", () => {
    expect(detectInitialLanguage("")).toBe("en");
  });

  it("normaliza mayúsculas correctamente ('ES-es')", () => {
    expect(detectInitialLanguage("ES-es")).toBe("es");
  });
});
