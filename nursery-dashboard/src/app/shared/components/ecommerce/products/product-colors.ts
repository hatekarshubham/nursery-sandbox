export interface ProductColorOption {

  name: string;

  hex: string;

}


export const MIXED_COLOR_NAME = 'Mixed';


export const MIXED_COLOR_SWATCH =
  'conic-gradient(#E53935, #FB8C00, #FDD835, #43A047, #1E88E5, #8E24AA, #E53935)';


export const PRODUCT_COLORS: ProductColorOption[] = [

  { name: 'Red', hex: '#E53935' },
  { name: 'Dark Red', hex: '#B71C1C' },
  { name: 'Crimson', hex: '#DC143C' },
  { name: 'Scarlet', hex: '#FF2400' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Wine', hex: '#722F37' },
  { name: 'Brick', hex: '#B22222' },

  { name: 'Pink', hex: '#F48FB1' },
  { name: 'Hot Pink', hex: '#FF69B4' },
  { name: 'Rose', hex: '#E11D48' },
  { name: 'Blush', hex: '#F9A8D4' },
  { name: 'Dusty Rose', hex: '#C08081' },
  { name: 'Salmon', hex: '#FA8072' },
  { name: 'Magenta', hex: '#D81B60' },
  { name: 'Fuchsia', hex: '#C026D3' },

  { name: 'Coral', hex: '#FF7F50' },
  { name: 'Peach', hex: '#FFCBA4' },
  { name: 'Orange', hex: '#FB8C00' },
  { name: 'Dark Orange', hex: '#EF6C00' },
  { name: 'Burnt Orange', hex: '#CC5500' },
  { name: 'Terracotta', hex: '#E2725B' },
  { name: 'Rust', hex: '#B7410E' },
  { name: 'Amber', hex: '#FFB300' },
  { name: 'Apricot', hex: '#FBCEB1' },
  { name: 'Copper', hex: '#B87333' },

  { name: 'Yellow', hex: '#FDD835' },
  { name: 'Gold', hex: '#F9A825' },
  { name: 'Lemon', hex: '#FDE047' },
  { name: 'Mustard', hex: '#D4A017' },
  { name: 'Cream', hex: '#FFF8DC' },
  { name: 'Ivory', hex: '#FFFFF0' },

  { name: 'Lime', hex: '#C0CA33' },
  { name: 'Chartreuse', hex: '#C6FF00' },
  { name: 'Green', hex: '#43A047' },
  { name: 'Kelly Green', hex: '#4CBB17' },
  { name: 'Emerald', hex: '#00A86B' },
  { name: 'Mint', hex: '#98FF98' },
  { name: 'Sage', hex: '#9CAF88' },
  { name: 'Olive', hex: '#808000' },
  { name: 'Avocado', hex: '#568203' },
  { name: 'Forest', hex: '#2E7D32' },
  { name: 'Dark Green', hex: '#1B5E20' },

  { name: 'Teal', hex: '#009688' },
  { name: 'Turquoise', hex: '#26C6DA' },
  { name: 'Cyan', hex: '#00BCD4' },
  { name: 'Aqua', hex: '#00E5FF' },
  { name: 'Sea Green', hex: '#2E8B57' },

  { name: 'Sky Blue', hex: '#29B6F6' },
  { name: 'Blue', hex: '#1E88E5' },
  { name: 'Cobalt', hex: '#0047AB' },
  { name: 'Royal Blue', hex: '#1565C0' },
  { name: 'Navy', hex: '#0D47A1' },
  { name: 'Indigo', hex: '#3949AB' },
  { name: 'Periwinkle', hex: '#8F99FB' },
  { name: 'Steel Blue', hex: '#4682B4' },

  { name: 'Purple', hex: '#8E24AA' },
  { name: 'Violet', hex: '#6A1B9A' },
  { name: 'Lavender', hex: '#B39DDB' },
  { name: 'Lilac', hex: '#CE93D8' },
  { name: 'Plum', hex: '#7B1FA2' },
  { name: 'Orchid', hex: '#DA70D6' },
  { name: 'Mauve', hex: '#E0B0FF' },

  { name: 'Brown', hex: '#8D6E63' },
  { name: 'Dark Brown', hex: '#5D4037' },
  { name: 'Chocolate', hex: '#7B3F00' },
  { name: 'Coffee', hex: '#6F4E37' },
  { name: 'Tan', hex: '#D2B48C' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Khaki', hex: '#C3B091' },
  { name: 'Bronze', hex: '#CD7F32' },

  { name: 'White', hex: '#FFFFFF' },
  { name: 'Off White', hex: '#F5F5F5' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Gray', hex: '#9E9E9E' },
  { name: 'Dark Gray', hex: '#616161' },
  { name: 'Charcoal', hex: '#37474F' },
  { name: 'Black', hex: '#212121' }

];


export interface ResolvedProductColor {

  color: string;

  colorName: string;

  swatch: string;

}


export function resolveProductColor(
  color?: string,
  colorName?: string
): ResolvedProductColor {

  const name =
    (colorName ?? '').trim();

  const named =
    PRODUCT_COLORS.find(
      option =>
        option.name.toLowerCase() ===
        name.toLowerCase()
    );

  const hex =
    normalizeHex(color ?? '');

  if (named) {

    if (
      !hex ||
      hex === named.hex.toUpperCase()
    ) {

      return {
        color: named.hex,
        colorName: named.name,
        swatch: named.hex
      };

    }

    return {
      color: hex,
      colorName: name,
      swatch: hex
    };

  }

  if (
    name.toLowerCase() ===
    MIXED_COLOR_NAME.toLowerCase()
  ) {

    return {
      color: '',
      colorName: MIXED_COLOR_NAME,
      swatch: MIXED_COLOR_SWATCH
    };

  }

  if (hex) {

    const match =
      PRODUCT_COLORS.find(
        option =>
          option.hex.toUpperCase() === hex
      );

    if (
      match &&
      (
        !name ||
        name.toLowerCase() === 'custom'
      )
    ) {

      return {
        color: match.hex,
        colorName: match.name,
        swatch: match.hex
      };

    }

    return {
      color: hex,
      colorName:
        name && name.toLowerCase() !== 'custom'
          ? name
          : 'Custom',
      swatch: hex
    };

  }

  return {
    color: '',
    colorName: '',
    swatch: ''
  };

}


function normalizeHex(
  value: string
): string {

  const color =
    value.trim();

  if (!color) {

    return '';

  }

  const hex =
    color.startsWith('#')
      ? color
      : `#${color}`;

  return /^#[0-9A-Fa-f]{6}$/.test(hex)
    ? hex.toUpperCase()
    : '';

}
