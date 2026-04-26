import { describe, expect, it } from "vitest";
import { COLLECTION_COLORS, pickNextCollectionColor } from "./collectionColors";

describe("pickNextCollectionColor", () => {
  it("devuelve el primer color cuando no hay colecciones", () => {
    expect(pickNextCollectionColor([])).toBe(COLLECTION_COLORS[0]);
  });

  it("devuelve el segundo color cuando ya está usado el primero", () => {
    const existing = [{ color: COLLECTION_COLORS[0] }];
    expect(pickNextCollectionColor(existing)).toBe(COLLECTION_COLORS[1]);
  });

  it("devuelve el siguiente libre cuando los primeros N consecutivos están usados", () => {
    const existing = COLLECTION_COLORS.slice(0, 3).map((color) => ({ color }));
    expect(pickNextCollectionColor(existing)).toBe(COLLECTION_COLORS[3]);
  });

  it("rellena un hueco intermedio en lugar de saltarlo (caso del bug original)", () => {
    // Usuario crea 2 collections, borra la del medio, y crea otra:
    // las existentes son COLOR[0] y COLOR[2] → debe asignar COLOR[1].
    const existing = [
      { color: COLLECTION_COLORS[0] },
      { color: COLLECTION_COLORS[2] },
    ];
    expect(pickNextCollectionColor(existing)).toBe(COLLECTION_COLORS[1]);
  });

  it("rellena el hueco más cercano al inicio del array", () => {
    const existing = [
      { color: COLLECTION_COLORS[0] },
      { color: COLLECTION_COLORS[1] },
      { color: COLLECTION_COLORS[3] },
      { color: COLLECTION_COLORS[5] },
    ];
    expect(pickNextCollectionColor(existing)).toBe(COLLECTION_COLORS[2]);
  });

  it("cae al cycling por módulo cuando todos los colores están usados", () => {
    const existing = COLLECTION_COLORS.map((color) => ({ color }));
    // length = 6, módulo 6 = 0 → primer color
    expect(pickNextCollectionColor(existing)).toBe(COLLECTION_COLORS[0]);
  });

  it("cycling por módulo respeta el length total cuando hay duplicados", () => {
    const existing = [
      ...COLLECTION_COLORS.map((color) => ({ color })),
      { color: COLLECTION_COLORS[0] },
    ];
    // length = 7, módulo 6 = 1
    expect(pickNextCollectionColor(existing)).toBe(COLLECTION_COLORS[1]);
  });
});
