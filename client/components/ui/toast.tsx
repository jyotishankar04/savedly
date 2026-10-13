"use client"

import * as React from "react"

import { ToastStack, ToastStackProvider, useToastStack, type ToastOptions, type ToastStackApi, type ToastType } from "@/components/arc/toast-stack/toast-stack"

// The app's toasts. They are Arc UI's toast stack (components/arc/toast-stack):
// typed (success, info, warning, error, loading), stacked at the bottom edge,
// swipeable, with an optional action, and able to change in place, so a
// "Saving" toast can become "Saved".
//
// Arc's stack is used through a hook inside its provider. Most of the app
// raises toasts from plain functions (event handlers, mutations, helpers), so
// this file keeps one `toast` object that works from anywhere: <Toaster />
// hands it the stack's functions once it has mounted.

type Action = { label: string; onClick: (id: string) => void }

export interface ToastInput {
  /** Reuse an id to replace a toast that is still showing instead of adding another. */
  id?: string
  title: string
  description?: string
  /** Defaults to "info". */
  type?: ToastType
  /** A button on the toast, such as "Undo" or "View". */
  action?: Action
  /** The older spelling of `action`, still accepted. */
  actionProps?: { children: string; onClick?: () => void }
  /** Milliseconds before it leaves. Warnings and errors already stay longer. */
  duration?: number
  /** The older spelling of `duration`, still accepted. */
  timeout?: number
  /** Ignored. Kept so older calls still compile. */
  data?: unknown
}

let api: ToastStackApi | null = null
// Raised before the toaster mounted (rare: during the very first render).
let waiting: ToastOptions[] = []

function toOptions(input: ToastInput): ToastOptions {
  const action = input.action ?? (input.actionProps ? { label: input.actionProps.children, onClick: () => input.actionProps?.onClick?.() } : undefined)
  return {
    id: input.id,
    type: input.type ?? "info",
    title: input.title,
    description: input.description,
    action,
    duration: input.duration ?? input.timeout,
  }
}

function add(input: ToastInput): string {
  const options = toOptions(input)
  if (api) return api.toast(options)
  const id = options.id ?? `queued-${waiting.length}-${Date.now()}`
  waiting.push({ ...options, id })
  return id
}

const typed = (type: ToastType) => (title: string, rest: Omit<ToastInput, "title" | "type"> = {}) => add({ ...rest, title, type })

const toast = {
  /** Shows a toast and returns its id. */
  add,
  success: typed("success"),
  info: typed("info"),
  warning: typed("warning"),
  error: typed("error"),
  /** Stays until it is updated or dismissed. */
  loading: typed("loading"),
  /** Changes a showing toast in place (its type, words or action) and restarts its timer. */
  update(id: string, patch: Partial<Omit<ToastInput, "id">>) {
    const { actionProps, timeout, data, ...rest } = patch
    void data
    api?.update(id, {
      ...rest,
      ...(actionProps ? { action: { label: actionProps.children, onClick: () => actionProps.onClick?.() } } : {}),
      ...(timeout !== undefined ? { duration: timeout } : {}),
    })
  },
  /** Dismisses one toast, or every toast when called with no id. */
  dismiss(id?: string) {
    api?.dismiss(id)
  },
  /**
   * A loading toast that becomes a success or an error when the work settles.
   * Returns the work's own promise, so it can still be awaited.
   */
  promise<T>(work: Promise<T>, words: { loading: string; success: string | ((value: T) => string); error: string | ((reason: unknown) => string) }): Promise<T> {
    const id = add({ type: "loading", title: words.loading })
    work.then(
      (value) => toast.update(id, { type: "success", title: typeof words.success === "function" ? words.success(value) : words.success }),
      (reason) => toast.update(id, { type: "error", title: typeof words.error === "function" ? words.error(reason) : words.error }),
    )
    return work
  },
}

/** Gives the module-level `toast` the stack's functions, and shows anything raised before it mounted. */
function Bridge() {
  const stack = useToastStack()
  const latest = React.useRef(stack)
  React.useEffect(() => {
    latest.current = stack
  })
  React.useEffect(() => {
    api = {
      toast: (options) => latest.current.toast(options),
      update: (id, patch) => latest.current.update(id, patch),
      dismiss: (id) => latest.current.dismiss(id),
    }
    const queued = waiting
    waiting = []
    queued.forEach((options) => latest.current.toast(options))
    return () => {
      api = null
    }
  }, [])
  return null
}

/** Wrap the app once. Toasts show at the bottom right, and at the bottom centre on a phone. */
function Toaster({ children }: { children?: React.ReactNode }) {
  return (
    <ToastStackProvider>
      {children}
      <Bridge />
      <ToastStack />
    </ToastStackProvider>
  )
}

export { Toaster, toast }
export type { ToastType }
