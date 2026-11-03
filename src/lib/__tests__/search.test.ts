import { describe, expect, it } from 'vitest'
import type { Prompt } from '../../types'
import { collectTags, countByView, extractVars, filterPrompts, matchPrompt } from '../search'

function p(over: Partial<Prompt> & { id: string }): Prompt {
  return {
    title: over.id,
    category: 'writing',
    tags: [],
    when: '',
    body: '',
    builtin: true,
    ...over,
  }
}

describe('extractVars', () => {
  it('抽取 {{变量}}，去重且保持首次出现顺序', () => {
    expect(extractVars('写一份关于{{主题}}的{{体裁}}，主题是{{主题}}')).toEqual(['主题', '体裁'])
  })

  it('容忍花括号内侧空格，并忽略空变量', () => {
    expect(extractVars('{{ 主题 }} 和 {{}} 和 {{   }}')).toEqual(['主题'])
  })

  it('没有变量时返回空数组', () => {
    expect(extractVars('一句普通的话')).toEqual([])
  })
})

describe('matchPrompt', () => {
  const item = p({
    id: 'weekly-report',
    title: '把零散记录整理成周报',
    when: '周五下午要交周报',
    body: '按三块整理：做完了什么…',
    tags: ['周报', '汇报'],
    aliases: ['weekly'],
  })

  it('空关键词一律命中（不当作过滤条件）', () => {
    expect(matchPrompt(item, '')).toBe(true)
    expect(matchPrompt(item, '   ')).toBe(true)
  })

  it('命中标题、用途、正文、标签、别名', () => {
    for (const q of ['周报', '周五', '三块', '汇报', 'weekly']) {
      expect(matchPrompt(item, q)).toBe(true)
    }
  })

  it('大小写不敏感', () => {
    expect(matchPrompt(item, 'WEEKLY')).toBe(true)
  })

  it('不命中时返回 false', () => {
    expect(matchPrompt(item, '区块链')).toBe(false)
  })
})

describe('filterPrompts', () => {
  const list = [
    p({ id: 'a', category: 'writing', tags: ['周报'] }),
    p({ id: 'b', category: 'coding', tags: ['重构', '质量'] }),
    p({ id: 'c', category: 'coding', tags: ['测试'] }),
    p({ id: 'mine1', category: 'study', tags: [], builtin: false }),
  ]

  it('view=all 时不按类别过滤', () => {
    expect(filterPrompts(list, { query: '', view: 'all', tags: [] }, new Set())).toHaveLength(4)
  })

  it('按类别过滤', () => {
    const r = filterPrompts(list, { query: '', view: 'coding', tags: [] }, new Set())
    expect(r.map((x) => x.id)).toEqual(['b', 'c'])
  })

  it('view=favorites 只看收藏，且与类别互斥', () => {
    const fav = new Set(['a', 'b'])
    expect(filterPrompts(list, { query: '', view: 'favorites', tags: [] }, fav).map((x) => x.id)).toEqual([
      'a',
      'b',
    ])
  })

  it('view=mine 只看自建', () => {
    expect(filterPrompts(list, { query: '', view: 'mine', tags: [] }, new Set()).map((x) => x.id)).toEqual([
      'mine1',
    ])
  })

  it('多个标签是 AND 语义', () => {
    const one = filterPrompts(list, { query: '', view: 'all', tags: ['重构'] }, new Set())
    expect(one.map((x) => x.id)).toEqual(['b'])
    const two = filterPrompts(list, { query: '', view: 'all', tags: ['重构', '质量'] }, new Set())
    expect(two.map((x) => x.id)).toEqual(['b'])
    const none = filterPrompts(list, { query: '', view: 'all', tags: ['重构', '测试'] }, new Set())
    expect(none).toEqual([])
  })

  it('关键词与标签叠加', () => {
    const r = filterPrompts(list, { query: '重构', view: 'coding', tags: ['质量'] }, new Set())
    expect(r.map((x) => x.id)).toEqual(['b'])
  })

  it('不修改入参', () => {
    const snapshot = JSON.stringify(list)
    filterPrompts(list, { query: '重构', view: 'coding', tags: ['质量'] }, new Set())
    expect(JSON.stringify(list)).toBe(snapshot)
  })

  it('结果保持输入顺序', () => {
    const many = [p({ id: 'x1' }), p({ id: 'x2' }), p({ id: 'x3' })]
    expect(filterPrompts(many, { query: 'x', view: 'all', tags: [] }, new Set()).map((i) => i.id)).toEqual([
      'x1',
      'x2',
      'x3',
    ])
  })
})

describe('countByView', () => {
  it('给出各视图数量', () => {
    const list = [
      p({ id: 'a', category: 'writing' }),
      p({ id: 'b', category: 'coding' }),
      p({ id: 'c', category: 'coding', builtin: false }),
    ]
    const c = countByView(list, new Set(['a']), ['writing', 'coding'])
    expect(c.all).toBe(3)
    expect(c.favorites).toBe(1)
    expect(c.mine).toBe(1)
    expect(c.coding).toBe(2)
  })
})

describe('collectTags', () => {
  it('按出现次数降序，次数相同按字典序', () => {
    const list = [p({ id: 'a', tags: ['z', '常见'] }), p({ id: 'b', tags: ['常见', 'a'] })]
    expect(collectTags(list)).toEqual(['常见', 'a', 'z'])
  })
})
