import { useMemo } from "react";

export type LandingPageCustomization = {
  headingFont?: string;
  bodyFont?: string;
  headingWeight?: string | number;
  bodyWeight?: string | number;
  primaryColor?: string;
  headingSize?: number;
  bodySize?: number;
  headingLetterSpacing?: number;
  [key: string]: any;
};

export type PageTypographyProps = {
  headingFont?: string;
  bodyFont?: string;
  headingWeight?: string | number;
  bodyWeight?: string | number;
  primaryColor?: string;
  headingSize?: number;
  bodySize?: number;
  headingLetterSpacing?: number;
};

const FONT_MAP: Record<string, string> = {
  "iowan-old-style": '"Iowan Old Style", "Baskerville", "Times New Roman", serif',
  inter: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  geist: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

function resolveFont(font?: string) {
  if (!font) return undefined;
  const key = font.toLowerCase().trim();
  return FONT_MAP[key] || font;
}

export function splitTypographyProps<T extends Record<string, any>>(
  props: T
): [PageTypographyProps, Omit<T, keyof PageTypographyProps>] {
  const {
    headingFont,
    bodyFont,
    headingWeight,
    bodyWeight,
    primaryColor,
    headingSize,
    bodySize,
    headingLetterSpacing,
    ...rest
  } = props;

  const typography: PageTypographyProps = {
    headingFont,
    bodyFont,
    headingWeight,
    bodyWeight,
    primaryColor,
    headingSize,
    bodySize,
    headingLetterSpacing,
  };

  return [typography, rest as Omit<T, keyof PageTypographyProps>];
}

export function usePageTypography(
  recipe: PageTypographyProps = {},
  custom?: PageTypographyProps
): LandingPageCustomization {
  return useMemo(() => {
    return {
      ...recipe,
      ...Object.fromEntries(
        Object.entries(custom || {}).filter(([_, v]) => v !== undefined)
      ),
    };
  }, [recipe, custom]);
}

const CUSTOMIZATION_STYLE_ID = "threeui-page-customization";

export function applyPageCustomization(
  frame: HTMLIFrameElement | null,
  customization?: LandingPageCustomization
) {
  if (!frame) return;
  let doc: Document | null = null;
  try {
    doc = frame.contentDocument || frame.contentWindow?.document || null;
  } catch {
    return;
  }
  if (!doc || !doc.head) return;

  doc.getElementById(CUSTOMIZATION_STYLE_ID)?.remove();
  if (!customization || Object.keys(customization).length === 0) return;

  const headingFont = resolveFont(customization.headingFont);
  const bodyFont = resolveFont(customization.bodyFont);

  const rules: string[] = [];

  if (customization.primaryColor) {
    rules.push(`--accent: ${customization.primaryColor} !important;`);
    rules.push(`--primary: ${customization.primaryColor} !important;`);
  }
  if (headingFont) {
    rules.push(`--serif: ${headingFont} !important;`);
    rules.push(`--heading-font: ${headingFont} !important;`);
  }
  if (bodyFont) {
    rules.push(`--mono: ${bodyFont} !important;`);
    rules.push(`--body-font: ${bodyFont} !important;`);
  }
  if (customization.headingSize) {
    rules.push(`--heading-size: ${customization.headingSize}px !important;`);
  }
  if (customization.bodySize) {
    rules.push(`--body-size: ${customization.bodySize}px !important;`);
  }
  if (customization.headingWeight) {
    rules.push(`--heading-weight: ${customization.headingWeight} !important;`);
  }
  if (customization.bodyWeight) {
    rules.push(`--body-weight: ${customization.bodyWeight} !important;`);
  }
  if (customization.headingLetterSpacing !== undefined) {
    rules.push(`--heading-letter-spacing: ${customization.headingLetterSpacing}em !important;`);
  }

  if (rules.length > 0) {
    const styleEl = doc.createElement("style");
    styleEl.id = CUSTOMIZATION_STYLE_ID;
    styleEl.textContent = `
      :root {
        ${rules.join("\n        ")}
      }
    `;
    doc.head.appendChild(styleEl);
  }
}

export function postPageCustomization(
  frame: HTMLIFrameElement | null,
  customization?: LandingPageCustomization
) {
  if (!frame?.contentWindow || !customization) return;
  try {
    frame.contentWindow.postMessage(
      {
        type: "threeui-customization",
        customization,
      },
      "*"
    );
  } catch {}
}
