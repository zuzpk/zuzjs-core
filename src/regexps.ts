// Hex color regex (#RGB, #RRGGBB)
// export const hexColorRegex = /^#([A-Fa-f0-9]{3}){1,2}$/;
export const hexColorRegex = /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/;

// RGBA color regex (rgba(255, 255, 255, 1))
export const rgbaColorRegex = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*((0|1|0?\.\d+)\s*))?\)$/;
// HSL color regex (hsl(360, 100%, 100%))
export const hslColorRegex = /^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/;

