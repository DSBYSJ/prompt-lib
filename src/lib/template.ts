/**
 * 模板语法的**唯一**实现。
 *
 * 为什么要有这个文件：Epic 1 里同一套 `{{变量}}` 语法，正则散在
 * `lib/search.ts`（抽取）、`components/Drawer.tsx`（高亮渲染）两处，
 * 改一处忘另一处就会出现「表单识别出 5 个变量、预览只高亮 3 个」这种鬼现象。
 * 现在解析、切分、渲染、缺值判定全在这里，别处只调用。
 *
 * 语法只有一条：`{{变量名}}`，花括号内侧允许空格。
 */

export const TEMPLATE_RE = /\{\{\s*([^{}]+?)\s*\}\}/g

export interface Segment {
  type: 'text' | 'var'
  /** type=text 时是原文片段；type=var 时是**已 trim 的变量名** */
  value: string
}

/** 抽取变量名，去重且保持首次出现顺序 */
export function extractVars(body: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const m of body.matchAll(TEMPLATE_RE)) {
    const name = m[1].trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

/**
 * 把正文切成有序片段，供预览逐段渲染。
 * 相邻变量、开头就是变量、完全没有变量，都得处理对。
 */
export function splitTemplate(body: string): Segment[] {
  const out: Segment[] = []
  let cursor = 0
  for (const m of body.matchAll(TEMPLATE_RE)) {
    const at = m.index ?? 0
    if (at > cursor) out.push({ type: 'text', value: body.slice(cursor, at) })
    out.push({ type: 'var', value: m[1].trim() })
    cursor = at + m[0].length
  }
  if (cursor < body.length) out.push({ type: 'text', value: body.slice(cursor) })
  return out
}

/** 值是否算"已填"：null/undefined 或 trim 后为空都算没填 */
function filled(values: Record<string, string>, name: string): string | null {
  const raw = values[name]
  if (typeof raw !== 'string') return null
  return raw.trim() === '' ? null : raw
}

/**
 * 渲染成品：已填的替换，未填的**原样保留**（连同 `{{ }}` 内侧的写法）。
 *
 * ⚠️ 必须用函数式 replace：若写成 `body.replace(re, values[name])`，
 * 用户填值里的 `$&`、`$1`、`$$` 会被当成替换模式解释，输出直接错乱。
 */
export function renderTemplate(body: string, values: Record<string, string>): string {
  return body.replace(TEMPLATE_RE, (whole, rawName: string) => {
    const v = filled(values, rawName.trim())
    return v ?? whole
  })
}

/** 还没填的变量名（去重保序），用于计数与提示 */
export function findMissing(body: string, values: Record<string, string>): string[] {
  return extractVars(body).filter((name) => filled(values, name) === null)
}
