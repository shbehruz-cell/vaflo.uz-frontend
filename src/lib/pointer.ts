/** Sichqoncha/klaviaturali qurilma (kompyuter). Telefon/planshetda — false. */
export const isFinePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches
