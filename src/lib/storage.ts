import type { Category, Prompt } from '../types'
import { CATEGORY_ORDER } from '../types'

/**
 * 本地存储层。
 *
 * 两条硬约束（见 SPEC S-2）：
 *   1. 所有 localStorage 访问都包 try/catch —— 隐私模式下读写会直接抛错，不能白屏；
 *   2. 导入不接受任何"看起来像"的字段，逐条校验，脏数据丢弃并计数。
 */

export const KEYS = {
  favorites: 'promptlib.v1.favorites',
  custom: 'promptlib.v1.custom',
} as const

export const EXPORT_VERSION = 1

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/** 存储是否可用（隐私模式 / 配额满都会 false）。App 用它决定要不要提示降级。 */
export function storageAvailable(): boolean {
  const probe = 'promptlib.probe'
  try {
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function loadFavorites(): string[] {
  const raw = safeGet(KEYS.favorites)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

export function saveFavorites(ids: string[]): void {
  safeSet(KEYS.favorites, JSON.stringify([...new Set(ids)]))
}

export function loadCustom(): Prompt[] {
  const raw = safeGet(KEYS.custom)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    const items = (parsed as { items?: unknown })?.items
    if (!Array.isArray(items)) return []
    return items.filter(isPrompt).map((p) => ({ ...p, builtin: false }))
  } catch {
    return []
  }
}

export function saveCustom(items: Prompt[]): void {
  safeSet(KEYS.custom, JSON.stringify({ version: EXPORT_VERSION, items }))
}

export interface ExportPayload {
  version: number
  exportedAt: string
  favorites: string[]
  items: Prompt[]
}

export function exportPayload(favIds: string[], custom: Prompt[]): string {
  const payload: ExportPayload = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    favorites: favIds,
    items: custom,
  }
  return JSON.stringify(payload, null, 2)
}

/** 只认这几个类别的数据，别的一律当脏数据 */
const CATEGORIES: Category[] = CATEGORY_ORDER

/** 结构校验：宁可少导入，也不要让一条坏数据把列表渲染搞崩 */
export function isPrompt(v: unknown): v is Prompt {
  if (!v || typeof v !== 'object') return false
  const p = v as Record<string, unknown>
  if (typeof p.id !== 'string' || !p.id.trim()) return false
  if (typeof p.title !== 'string' || !p.title.trim()) return false
  if (typeof p.body !== 'string' || !p.body.trim()) return false
  if (typeof p.when !== 'string') return false
  if (typeof p.category !== 'string' || !CATEGORIES.includes(p.category as Category)) return false
  return true
}

export interface ParseResult {
  items: Prompt[]
  /** 被丢弃的条数，用于提示"忽略 N 条"而不是静默吞掉 */
  ignored: number
}

/** 解析导入文件。非法整体返回 items=[]，此时调用方应提示"格式不正确" */
export function parseImport(raw: unknown): ParseResult {
  const holder = raw as { items?: unknown } | null
  const list = Array.isArray(raw) ? raw : holder?.items
  if (!Array.isArray(list)) return { items: [], ignored: 0 }

  const items: Prompt[] = []
  let ignored = 0
  for (const entry of list) {
    if (!isPrompt(entry)) {
      ignored += 1
      continue
    }
    const p = entry as Prompt
    items.push({
      ...p,
      tags: Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === 'string') : [],
      builtin: false,
    })
  }
  return { items, ignored }
}
