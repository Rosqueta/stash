import { describe, expect, it } from "vitest";
import { extractVariables, parseSegments, resolveVariables } from "./variables";

describe("variables service", () => {
  describe("extractVariables", () => {
    it("devuelve array vacío para texto sin variables", () => {
      expect(extractVariables("hello world")).toEqual([]);
    });

    it("extrae una variable simple", () => {
      expect(extractVariables("Di {{nombre}}")).toEqual(["nombre"]);
    });

    it("extrae múltiples variables distintas", () => {
      expect(extractVariables("{{a}} y {{b}} y {{c}}")).toEqual(["a", "b", "c"]);
    });

    it("deduplica variables repetidas", () => {
      expect(extractVariables("{{name}} {{name}} {{name}}")).toEqual(["name"]);
    });

    it("respeta el orden de primera aparición al deduplicar", () => {
      expect(extractVariables("{{b}} {{a}} {{b}}")).toEqual(["b", "a"]);
    });

    it("ignora llaves simples {x}", () => {
      expect(extractVariables("{nombre}")).toEqual([]);
    });

    it("acepta variables con guion bajo y números", () => {
      expect(extractVariables("{{var_1}} {{item2}}")).toEqual(["var_1", "item2"]);
    });

    it("devuelve array vacío para string vacío", () => {
      expect(extractVariables("")).toEqual([]);
    });
  });

  describe("parseSegments", () => {
    it("texto plano sin variables produce un segmento de tipo text", () => {
      expect(parseSegments("hola mundo")).toEqual([
        { type: "text", value: "hola mundo" },
      ]);
    });

    it("una variable sola produce un segmento de tipo var", () => {
      expect(parseSegments("{{ciudad}}")).toEqual([
        { type: "text", value: "" },
        { type: "var", name: "ciudad" },
        { type: "text", value: "" },
      ]);
    });

    it("mezcla texto y variable en orden correcto", () => {
      expect(parseSegments("Hola {{nombre}}, bienvenido")).toEqual([
        { type: "text", value: "Hola " },
        { type: "var", name: "nombre" },
        { type: "text", value: ", bienvenido" },
      ]);
    });

    it("variables contiguas producen segmento text vacío entre ellas", () => {
      expect(parseSegments("{{a}}{{b}}")).toEqual([
        { type: "text", value: "" },
        { type: "var", name: "a" },
        { type: "text", value: "" },
        { type: "var", name: "b" },
        { type: "text", value: "" },
      ]);
    });

    it("string vacío produce un segmento de texto vacío", () => {
      expect(parseSegments("")).toEqual([{ type: "text", value: "" }]);
    });

    it("variable al inicio y al final produce segmentos text vacíos en los extremos", () => {
      const result = parseSegments("{{x}} texto {{y}}");
      expect(result[0]).toEqual({ type: "text", value: "" });
      expect(result[1]).toEqual({ type: "var", name: "x" });
      expect(result[3]).toEqual({ type: "var", name: "y" });
      expect(result[4]).toEqual({ type: "text", value: "" });
    });
  });

  describe("resolveVariables", () => {
    it("reemplaza una variable con su valor", () => {
      expect(resolveVariables("Hola {{nombre}}", { nombre: "Ana" })).toBe("Hola Ana");
    });

    it("reemplaza múltiples variables distintas", () => {
      expect(resolveVariables("{{greeting}} {{name}}", { greeting: "Hey", name: "Bob" })).toBe("Hey Bob");
    });

    it("deja la variable sin resolver si no tiene valor en el mapa", () => {
      expect(resolveVariables("{{missing}}", {})).toBe("{{missing}}");
    });

    it("reemplaza solo las variables con valor y deja las demás", () => {
      expect(resolveVariables("{{a}} {{b}}", { a: "X" })).toBe("X {{b}}");
    });

    it("reemplaza todas las ocurrencias de la misma variable", () => {
      expect(resolveVariables("{{x}} y {{x}}", { x: "Z" })).toBe("Z y Z");
    });

    it("texto sin variables devuelve el mismo texto", () => {
      expect(resolveVariables("sin vars", { x: "y" })).toBe("sin vars");
    });

    it("valor vacío como string reemplaza correctamente", () => {
      expect(resolveVariables("{{a}}texto", { a: "" })).toBe("texto");
    });
  });
});
