import { describe, expect, it } from "vitest";
import { suggestTags } from "./autoTag";

describe("autoTag service", () => {
  describe("suggestTags", () => {
    describe("tags individuales por categoría", () => {
      it("detecta 'code' cuando el contenido menciona 'function'", () => {
        expect(suggestTags("write a function in typescript")).toContain("code");
      });

      it("detecta 'code' cuando el contenido menciona 'debug'", () => {
        expect(suggestTags("help me debug this script")).toContain("code");
      });

      it("detecta 'writing' cuando el contenido menciona 'email'", () => {
        expect(suggestTags("write an email to my team")).toContain("writing");
      });

      it("detecta 'writing' cuando el contenido menciona 'newsletter'", () => {
        expect(suggestTags("create a newsletter")).toContain("writing");
      });

      it("detecta 'design' cuando el contenido menciona 'ui'", () => {
        expect(suggestTags("design a ui component")).toContain("design");
      });

      it("detecta 'design' cuando el contenido menciona 'figma'", () => {
        expect(suggestTags("create a figma layout")).toContain("design");
      });

      it("detecta 'analysis' cuando el contenido menciona 'data'", () => {
        expect(suggestTags("analyze data and create a report")).toContain("analysis");
      });

      it("detecta 'meeting' cuando el contenido menciona 'agenda'", () => {
        expect(suggestTags("create a meeting agenda")).toContain("meeting");
      });
    });

    describe("casos de borde y múltiples tags", () => {
      it("devuelve array vacío para texto sin keywords conocidas", () => {
        expect(suggestTags("random text without any known keyword here")).toEqual([]);
      });

      it("devuelve array vacío para string vacío", () => {
        expect(suggestTags("")).toEqual([]);
      });

      it("detecta múltiples tags cuando el contenido tiene keywords de varias categorías", () => {
        expect(suggestTags("write a typescript function and analyze data")).toEqual(
          expect.arrayContaining(["code", "writing", "analysis"])
        );
      });

      it("la detección es case-insensitive", () => {
        const result = suggestTags("Write a FUNCTION");
        expect(result).toContain("writing");
        expect(result).toContain("code");
      });
    });
  });
});
