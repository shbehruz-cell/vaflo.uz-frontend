/** Backend parol siyosati bilan bir xil minimal tekshiruv (server baribir qayta tekshiradi). */
export function passwordHint(password: string): string | null {
  if (password.length < 8) return "Parol kamida 8 ta belgi bo‘lsin"
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "Parolda kamida bitta harf va bitta raqam bo‘lsin"
  return null
}
