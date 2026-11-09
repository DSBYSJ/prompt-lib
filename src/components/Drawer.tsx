import { useEffect, useMemo, useState } from 'react'
import type { Prompt } from '../types'
import { CATEGORY_LABEL } from '../types'
import { extractVars, findMissing, renderTemplate, splitTemplate } from '../lib/template'

export type CopyKind = 'filled' | 'template'

interface Props {
  prompt: Prompt | null
  fav: boolean
  copied: boolean
  onClose: () => void
  /** 把"复制什么"交给调用方：Drawer 只负责产出文本，剪贴板与提示是 App 的事 */
  onCopy: (text: string, kind: CopyKind, missing: number) => void
  onToggleFav: () => void
  /** 仅自建提示词可删；内置的不传，就不渲染删除按钮 */
  onDelete?: () => void
}

export default function Drawer({ prompt, fav, copied, onClose, onCopy, onToggleFav, onDelete }: Props) {
  // 填值只活在抽屉里。App 传 key={prompt.id}，换条目时组件重建 → 天然清空，不需要手写 reset。
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!prompt) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prompt, onClose])

  const body = prompt?.body ?? ''
  const vars = useMemo(() => extractVars(body), [body])
  const missing = useMemo(() => findMissing(body, values), [body, values])
  const segments = useMemo(() => splitTemplate(body), [body])
  const filledCount = vars.length - missing.length

  if (!prompt) return null

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label={prompt.title}>
      <button type="button" className="drawer__mask" onClick={onClose} aria-label="关闭" />
      <div className="drawer__panel">
        <header className="drawer__head">
          <div>
            <span className={`chip chip--${prompt.category}`}>
              {prompt.builtin ? CATEGORY_LABEL[prompt.category] : '我的提示词'}
            </span>
            <h2 className="drawer__title">{prompt.title}</h2>
            <p className="drawer__when">{prompt.when}</p>
          </div>
          <button type="button" className="iconbtn iconbtn--lg" onClick={onClose} aria-label="关闭详情">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="drawer__body">
          {vars.length > 0 && (
            <section className="fill">
              <div className="fill__head">
                <span className={`fill__count ${missing.length === 0 ? 'fill__count--ok' : ''}`}>
                  共 {vars.length} 个变量 · 已填 {filledCount} 个
                </span>
                {filledCount > 0 && (
                  <button type="button" className="linkbtn" onClick={() => setValues({})}>
                    清空
                  </button>
                )}
              </div>

              <div className="fill__grid">
                {vars.map((name) => (
                  <label key={name} className="fill__field">
                    <span className="fill__label">{name}</span>
                    <input
                      value={values[name] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                      placeholder={`填写${name}`}
                      aria-label={`变量 ${name}`}
                    />
                  </label>
                ))}
              </div>
            </section>
          )}

          <pre className="promptbody">
            {segments.map((seg, i) =>
              seg.type === 'text' ? (
                <span key={i}>{seg.value}</span>
              ) : (values[seg.value] ?? '').trim() ? (
                <span key={i} className="var var--filled">
                  {values[seg.value]}
                </span>
              ) : (
                <span key={i} className="var var--empty">{`{{${seg.value}}}`}</span>
              ),
            )}
          </pre>

          {prompt.note && <p className="drawer__note">注意：{prompt.note}</p>}

          <div className="drawer__tags">
            {prompt.tags.map((t) => (
              <span key={t} className="tag">
                #{t}
              </span>
            ))}
          </div>
        </div>

        <footer className="drawer__foot">
          <div className="drawer__footMain">
            {missing.length > 0 && (
              <p className="drawer__miss">
                还有 {missing.length} 处没填，复制后保留 {'{{变量}}'}
              </p>
            )}
            <button
              type="button"
              className={`btn ${copied ? 'btn--ok' : 'btn--primary'} btn--block`}
              onClick={() => onCopy(renderTemplate(body, values), 'filled', missing.length)}
            >
              {copied ? '已复制 ✓' : '复制成品'}
            </button>
          </div>
          <div className="drawer__footSide">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onCopy(body, 'template', missing.length)}
            >
              复制模板
            </button>
            <button
              type="button"
              className={`btn btn--ghost btn--sm ${fav ? 'btn--fav' : ''}`}
              onClick={onToggleFav}
            >
              {fav ? '已收藏' : '收藏'}
            </button>
            {onDelete && (
              <button type="button" className="btn btn--danger btn--sm" onClick={onDelete}>
                删除
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
