import { beforeEach, describe, expect, it } from 'vitest'
import type { Prompt } from '../../types'
import {
  exportPayload,
  isPrompt,
  KEYS,
  loadCustom,
  loadFavorites,
  parseImport,
  saveCustom,
  saveFavorites,
  storageAvailable,
} from '../storage'

/** 内存版 localStorage —— 不引 jsdom，只测这层的逻辑 */
function makeStorage(opts: { fail?: boolean } = {}) {
  const map = new Map<string, string>()
  return {
    getItem(k: string) {
      return map.has(k) ? (map.get(k) as string) : null
    },
    setItem(k: string, v: string) {
      if (opts.fail) throw new Error('QuotaExceededError')
      map.set(k, v)
    },
    removeItem(k: string) {
      map.delete(k)
    },
    clear() {
      map.clear()
    },
    _dump: () => map,
  }
}

function install(storage: ReturnType<typeof makeStorage>) {
  ;(globalThis as unknown as { window: unknown }).window = { localStorage: storage }
}

const one: Prompt = {
  id: 'mine-1',
  title: '我的提示词',
  category: 'writing',
  tags: ['自用'],
  when: '随时',
  body: '正文 {{变量}}',
  builtin: false,
}

beforeEach(() => {
  install(makeStorage())
})

describe('收藏', () => {
  it('保存后能读回，且自动去重', () => {
    saveFavorites(['a', 'b', 'a'])
    expect(loadFavorites()).toEqual(['a', 'b'])
  })

  it('没有数据时返回空数组', () => {
    expect(loadFavorites()).toEqual([])
  })

  it('存储里是坏 JSON 时返回空数组，不抛错', () => {
    window.localStorage.setItem(KEYS.favorites, '{不是 JSON')
    expect(loadFavorites()).toEqual([])
  })
})

describe('自建提示词', () => {
  it('保存后能读回，且强制 builtin=false', () => {
    saveCustom([{ ...one, builtin: true }])
    const back = loadCustom()
    expect(back).toHaveLength(1)
    expect(back[0].builtin).toBe(false)
  })

  it('读到脏条目时逐条丢弃，不整份报废', () => {
    window.localStorage.setItem(
      KEYS.custom,
      JSON.stringify({ version: 1, items: [one, { id: 1 }, null, { ...one, id: 'ok-2' }] }),
    )
    expect(loadCustom().map((x) => x.id)).toEqual(['mine-1', 'ok-2'])
  })
})

describe('存储不可用（隐私模式 / 配额满）', () => {
  it('storageAvailable 返回 false', () => {
    install(makeStorage({ fail: true }))
    expect(storageAvailable()).toBe(false)
  })

  it('读写都不抛错，读回空值', () => {
    install(makeStorage({ fail: true }))
    expect(() => saveFavorites(['a'])).not.toThrow()
    expect(loadFavorites()).toEqual([])
  })
})

describe('isPrompt 结构校验', () => {
  it('必填缺失返回 false', () => {
    expect(isPrompt({ id: 'a', title: 't', body: 'b', when: 'w' })).toBe(false) // 缺 category
    expect(isPrompt({ ...one, category: '不存在' })).toBe(false)
    expect(isPrompt({ ...one, id: '   ' })).toBe(false)
    expect(isPrompt(null)).toBe(false)
    expect(isPrompt('字符串')).toBe(false)
  })

  it('合法对象返回 true', () => {
    expect(isPrompt(one)).toBe(true)
  })
})

describe('导入', () => {
  it('接受 {items:[...]} 与裸数组两种形态', () => {
    expect(parseImport({ items: [one] }).items).toHaveLength(1)
    expect(parseImport([one]).items).toHaveLength(1)
  })

  it('结构不对时返回空，并让调用方提示"格式不正确"', () => {
    expect(parseImport({ nope: 1 })).toEqual({ items: [], ignored: 0 })
    expect(parseImport(null)).toEqual({ items: [], ignored: 0 })
  })

  it('部分条目非法时丢弃并计数', () => {
    const r = parseImport({ items: [one, { id: 'x' }, { ...one, id: 'y' }] })
    expect(r.items.map((i) => i.id)).toEqual(['mine-1', 'y'])
    expect(r.ignored).toBe(1)
  })

  it('tags 不是数组时置空而不是报错', () => {
    const r = parseImport([{ ...one, tags: '不是数组' }])
    expect(r.items[0].tags).toEqual([])
  })
})

describe('导出', () => {
  it('含版本、时间、收藏与自建条目', () => {
    const json = exportPayload(['a'], [one])
    const d = JSON.parse(json)
    expect(d.version).toBe(1)
    expect(d.favorites).toEqual(['a'])
    expect(d.items).toHaveLength(1)
    expect(typeof d.exportedAt).toBe('string')
  })

  it('导出再导入能还原条目', () => {
    const json = exportPayload([], [one])
    const r = parseImport(JSON.parse(json))
    expect(r.items[0].id).toBe('mine-1')
  })
})
