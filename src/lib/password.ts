export type PasswordRuleId =
  | "min_length"
  | "lowercase"
  | "uppercase"
  | "number"
  | "symbol";

export type PasswordRuleResult = {
  id: PasswordRuleId;
  label: string;
  valid: boolean;
};

export const passwordValidationMessage =
  "Le mot de passe doit contenir au moins 8 caracteres, une minuscule, une majuscule, un chiffre et un symbole.";

export function getPasswordRuleResults(password: string): PasswordRuleResult[] {
  return [
    {
      id: "min_length",
      label: "8 caracteres minimum",
      valid: password.length >= 8,
    },
    {
      id: "lowercase",
      label: "Une minuscule",
      valid: /[a-z]/.test(password),
    },
    {
      id: "uppercase",
      label: "Une majuscule",
      valid: /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "Un chiffre",
      valid: /\d/.test(password),
    },
    {
      id: "symbol",
      label: "Un symbole",
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function isPasswordValid(password: string) {
  return getPasswordRuleResults(password).every((rule) => rule.valid);
}
