"use client"

import type { ComponentProps } from "react"

import { Switch as ArcSwitch } from "@/components/arc/switch/switch"

/**
 * The app's switch. It is Arc UI's switch (components/arc/switch), kept
 * behind this file so every screen imports it from one place.
 * `size` is accepted for older call sites and no longer changes anything:
 * Arc's switch has one size, large enough to tap.
 */
function Switch(
  props: ComponentProps<typeof ArcSwitch> & {
    size?: "sm" | "default"
  }
) {
  const rest = { ...props }
  delete rest.size
  return <ArcSwitch data-slot="switch" {...rest} />
}

export { Switch }
