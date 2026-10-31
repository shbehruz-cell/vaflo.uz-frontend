"use client"

import { useEffect } from "react"

/**
 * iOS Safari: ekran klaviaturasi ochilganda "visual viewport" kichrayadi, lekin `position: fixed; bottom: 0`
 * elementlar klaviatura ostida qoladi; klaviatura yopilgach esa ba’zan chizilgan joy bilan bosiladigan joy
 * mos kelmay qoladi (tugma ko‘rinadi, lekin boshqa tugma bosiladi).
 *
 * Shu komponent ko‘rinadigan maydonni CSS o‘zgaruvchilarga yozadi:
 *   --vv-height  — klaviaturasiz ko‘rinadigan balandlik
 *   --vv-bottom  — klaviatura pastdan qancha joy egallagani
 * Pastdan chiqadigan oynalar (`ui/dialog`, `ui/sheet`) shu qiymatlar bilan klaviatura ustida turadi.
 * Klaviatura yopilganda sahifa joylashuvi qayta tiklanadi.
 */
export function ViewportSync() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    let raf = 0

    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        root.style.setProperty("--vv-height", `${vv.height}px`)
        root.style.setProperty("--vv-bottom", `${bottom}px`)
      })
    }

    // Klaviatura yopilganda (fokus input’dan chiqqanda) iOS siljitib qo‘ygan joylashuvni tiklaymiz
    const onFocusOut = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null
      if (!t || !t.matches("input, textarea, select")) return
      setTimeout(() => {
        const a = document.activeElement
        if (a && a.matches("input, textarea, select")) return
        window.scrollTo(window.scrollX, window.scrollY)
        update()
      }, 50)
    }

    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    document.addEventListener("focusout", onFocusOut)
    return () => {
      cancelAnimationFrame(raf)
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      document.removeEventListener("focusout", onFocusOut)
    }
  }, [])

  return null
}
