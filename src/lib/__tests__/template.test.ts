import { describe, expect, it } from 'vitest'
import {
  extractVars,
  findMissing,
  renderTemplate,
  splitTemplate,
  TEMPLATE_RE,
} from '../template'

describe('extractVars', () => {
  it('去重并保持首次出现顺序', () => {
    expect(extractVars('关于{{主题}}的{{体裁}}，主题是{{主题}}')).toEqual(['主题', '体裁'])
  })

  it('容忍花括号内侧空格，忽略空变量', () => {
    expect(extractVars('{{ 主题 }} 和 {{}} 和 {{   }}')).toEqual(['主题'])
  })

  it('没有变量时返回空数组', () => {
    expect(extractVars('一句普通的话')).toEqual([])
  })
})

describe('splitTemplate', () => {
  it('开头就是变量时，不产生空文本片段', () => {
    const segs = splitTemplate('{{甲}}结尾文字')
    expect(segs).toEqual([
      { type: 'var', value: '甲' },
      { type: 'text', value: '结尾文字' },
    ])
  })

  it('相邻变量之间不插入空片段', () => {
    expect(splitTemplate('{{甲}}{{乙}}')).toEqual([
      { type: 'var', value: '甲' },
      { type: 'var', value: '乙' },
    ])
  })

  it('无变量时整段是文本', () => {
    expect(splitTemplate('纯文本')).toEqual([{ type: 'text', value: '纯文本' }])
  })

  it('空字符串返回空数组', () => {
    expect(splitTemplate('')).toEqual([])
  })

  it('切分后拼回原文无损', () => {
    const body = '前 {{甲}} 中 {{ 乙 }} 后'
    const joined = splitTemplate(body)
      .map((s) => (s.type === 'text' ? s.value : `{{${s.value}}}`))
      .join('')
    // 变量内侧空格会被 trim，所以用规范化后的字符串比较
    expect(joined).toBe('前 {{甲}} 中 {{乙}} 后')
  })
})

describe('renderTemplate', () => {
  it('同名变量全部替换，不只是第一处', () => {
    const out = renderTemplate('{{主题}}和{{主题}}还有{{主题}}', { 主题: '周报' })
    expect(out).toBe('周报和周报还有周报')
    expect(out).not.toContain('{{')
  })

  it('未填的变量原样保留（含内侧空格写法）', () => {
    expect(renderTemplate('关于{{ 主题 }}', {})).toBe('关于{{ 主题 }}')
  })

  it('空串与纯空格都视为未填', () => {
    expect(renderTemplate('关于{{主题}}', { 主题: '' })).toBe('关于{{主题}}')
    expect(renderTemplate('关于{{主题}}', { 主题: '   ' })).toBe('关于{{主题}}')
  })

  it('填值含 $& 与 $1 时必须原样输出（这层错了输出会错乱）', () => {
    const out = renderTemplate('价格{{符号}}折扣{{层}}', { 符号: '$&', 层: '$100' })
    expect(out).toBe('价格$&折扣$100')
  })

  it('填值含反斜杠与花括号也原样输出', () => {
    expect(renderTemplate('{{路径}}', { 路径: 'C:\\a\\{b}' })).toBe('C:\\a\\{b}')
  })

  it('不修改传入的 values', () => {
    const values = { 主题: 'x' }
    const snapshot = JSON.stringify(values)
    renderTemplate('{{主题}}{{其它}}', values)
    expect(JSON.stringify(values)).toBe(snapshot)
  })

  it('无变量时原文返回', () => {
    expect(renderTemplate('纯文本', {})).toBe('纯文本')
  })
})

describe('findMissing', () => {
  it('列出未填的变量，去重保序', () => {
    const body = '{{甲}} {{乙}} {{甲}} {{丙}}'
    expect(findMissing(body, { 乙: '有值' })).toEqual(['甲', '丙'])
  })

  it('全部填完时为空数组', () => {
    expect(findMissing('{{甲}}{{乙}}', { 甲: 'a', 乙: 'b' })).toEqual([])
  })

  it('只有空格算未填', () => {
    expect(findMissing('{{甲}}', { 甲: '  ' })).toEqual(['甲'])
  })

  it('无变量时为空数组', () => {
    expect(findMissing('纯文本', {})).toEqual([])
  })
})

describe('TEMPLATE_RE', () => {
  it('允许复用而不受 lastIndex 影响（matchAll 内部克隆）', () => {
    const body = '{{甲}}{{乙}}'
    const first = [...body.matchAll(TEMPLATE_RE)].length
    const second = [...body.matchAll(TEMPLATE_RE)].length
    expect(first).toBe(2)
    expect(second).toBe(2)
  })
})
