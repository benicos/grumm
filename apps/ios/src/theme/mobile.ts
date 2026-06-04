import { designTokens } from "./designTokens";

export const mobileDesign = {
  radius: {
    card: designTokens.radius.card,
    control: designTokens.radius.control,
    pill: designTokens.radius.full,
    sheet: designTokens.radius.sheet,
  },
  space: {
    screenX: designTokens.space.gutter,
    section: designTokens.space.md,
  },
  typography: {
    body: designTokens.typography.body,
    caption: designTokens.typography.caption,
    display: designTokens.typography.display,
    section: designTokens.typography.section,
    title: designTokens.typography.title,
  },
  weight: designTokens.weight,
} as const;
