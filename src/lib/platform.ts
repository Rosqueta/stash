const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().indexOf("MAC") >= 0;

export const mod = isMac ? "⌘" : "Ctrl";
export const shift = "⇧";
export const modKey = isMac ? "metaKey" : "ctrlKey";
