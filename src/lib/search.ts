import type { Category, Prompt, ViewKey } from '../types'

/**
 * 筛选与检索的纯逻辑层。
 *
 * 刻意不 import React：这层是"会出错且出错难发现"的地方
 * （筛选条件组合、子串匹配的边界），必须能脱离 UI 单测。
 */

const VAR_RE = /\{\{\s*([^{}]+?)\s*\}\}/g

/** 从正文里抽取 {{变量}}，去重且保持首次出现顺序 */
export function extractVars(body: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const m of body.matchAll(VAR_RE)) {
    const name = m[1].trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

/** 单条是否命中关键词：标题 / 用途 / 正文 / 标签 / 别名，大小写不敏感 */
export function matchPrompt(p: Prompt, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const haystack = [p.title, p.when, p.body, p.note ?? '', ...p.tags, ...(p.aliases ?? [])]
    .join('\n')
    .toLowerCase()
  return haystack.includes(needle)
}

export interface FilterState {
  query: string
  view: ViewKey
  tags: string[]
}

/**
 * 分类 + 关键词 + 标签三者 AND。
 * 「我的收藏」「我的提示词」是视图而不是额外筛选器 —— 避免"选了收藏又选编程"的语义歧义。
 */
export function filterPrompts(list: Prompt[], f: FilterState, favIds: Set<string>): Prompt[] {
  return list.filter((p) => {
    if (f.view === 'favorites') {
      if (!favIds.has(p.id)) return false
    } else if (f.view === 'mine') {
      if (p.builtin) return false
    } else if (f.view !== 'all') {
      if (p.category !== f.view) return false
    }
    if (f.tags.length > 0 && !f.tags.every((t) => p.tags.includes(t))) return false
    return matchPrompt(p, f.query)
  })
}

/** 侧栏角标：每个视图下有多少条（不受当前关键词影响，避免数字跳来跳去） */
export function countByView(
  list: Prompt[],
  favIds: Set<string>,
  categories: Category[],
): Record<string, number> {
  const out: Record<string, number> = {
    all: list.length,
    favorites: list.filter((p) => favIds.has(p.id)).length,
    mine: list.filter((p) => !p.builtin).length,
  }
  for (const c of categories) out[c] = list.filter((p) => p.category === c).length
  return out
}

/** 全部标签去重，按出现次数降序 —— 常用的排前面 */
export function collectTags(list: Prompt[]): string[] {
  const freq = new Map<string, number>()
  for (const p of list) for (const t of p.tags) freq.set(t, (freq.get(t) ?? 0) + 1)
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t)
}
