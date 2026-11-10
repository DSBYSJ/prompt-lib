import { describe, expect, it } from 'vitest'
import { PROMPTS } from '../prompts'
import { CATEGORY_ORDER } from '../../types'
import { extractVars } from '../../lib/template'

/**
 * 数据完整性守卫。
 *
 * 为什么需要这层：`prompts.ts` 是纯手写数组，id 写重、`{{` 少一半、category 打错，
 * TypeScript 只在**字面量类型**上能挡住一部分，运行时仍会出现"点开是空白"这类问题。
 * 这个文件守的就是"加内容时不要加坏"。
 *
 * 以后新增条目如果让下面任何一条变红，先改数据，不要改断言。
 */

describe('内置提示词数据完整性', () => {
  it('总数不少于 36 条（Epic 3 的基线，只能增不能减）', () => {
    expect(PROMPTS.length).toBeGreaterThanOrEqual(36)
  })

  it('id 必须唯一', () => {
    const ids = PROMPTS.map((p) => p.id)
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dup, `重复 id: ${dup.join(', ')}`).toEqual([])
  })

  it('标题不能重复（同义改写可以，字面重复不行）', () => {
    const titles = PROMPTS.map((p) => p.title.trim())
    const dup = titles.filter((t, i) => titles.indexOf(t) !== i)
    expect(dup, `重复标题: ${dup.join(' / ')}`).toEqual([])
  })

  it('id 只能是 kebab-case（便于做锚点与导出文件名）', () => {
    const bad = PROMPTS.filter((p) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)).map((p) => p.id)
    expect(bad, `不符合 kebab-case: ${bad.join(', ')}`).toEqual([])
  })

  it('必填字段非空：title / when / body', () => {
    const bad = PROMPTS.filter(
      (p) => !p.title.trim() || !p.when.trim() || !p.body.trim(),
    ).map((p) => p.id)
    expect(bad, `字段为空: ${bad.join(', ')}`).toEqual([])
  })

  it('分类必须在白名单内', () => {
    const bad = PROMPTS.filter((p) => !CATEGORY_ORDER.includes(p.category)).map((p) => p.id)
    expect(bad, `分类非法: ${bad.join(', ')}`).toEqual([])
  })

  it('每个分类至少 5 条（避免某一类点开是空的）', () => {
    const counts = new Map(CATEGORY_ORDER.map((c) => [c, 0]))
    for (const p of PROMPTS) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
    const thin = [...counts.entries()].filter(([, n]) => n < 5)
    expect(thin, `条数不足 5 的分类: ${thin.map(([c, n]) => `${c}=${n}`).join(', ')}`).toEqual([])
  })

  it('标签至少 1 个且不能有空串', () => {
    const bad = PROMPTS.filter(
      (p) => !Array.isArray(p.tags) || p.tags.length === 0 || p.tags.some((t) => !t.trim()),
    ).map((p) => p.id)
    expect(bad, `标签有问题: ${bad.join(', ')}`).toEqual([])
  })

  it('花括号必须成对（写坏会导致整条渲染异常）', () => {
    const bad = PROMPTS.filter((p) => {
      const open = (p.body.match(/\{\{/g) ?? []).length
      const close = (p.body.match(/\}\}/g) ?? []).length
      return open !== close
    }).map((p) => p.id)
    expect(bad, `花括号不配对: ${bad.join(', ')}`).toEqual([])
  })

  it('每条正文至少含 1 个变量（否则无法"填完再复制"）', () => {
    const bad = PROMPTS.filter((p) => extractVars(p.body).length === 0).map((p) => p.id)
    expect(bad, `没有变量: ${bad.join(', ')}`).toEqual([])
  })

  it('内置数据必须都标记 builtin=true', () => {
    const bad = PROMPTS.filter((p) => p.builtin !== true).map((p) => p.id)
    expect(bad, `builtin 不为 true: ${bad.join(', ')}`).toEqual([])
  })

  it('变量名不能重复出现却语义不同 —— 这里只校验没有空变量名', () => {
    const bad: string[] = []
    for (const p of PROMPTS) {
      for (const v of extractVars(p.body)) {
        if (!v.trim()) bad.push(`${p.id}:空变量名`)
      }
    }
    expect(bad).toEqual([])
  })
})
