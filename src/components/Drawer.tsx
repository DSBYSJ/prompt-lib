import { Fragment, useEffect } from 'react'
import type { Prompt } from '../types'
import { CATEGORY_LABEL } from '../types'
import { extractVars } from '../lib/search'

interface Props {
  prompt: Prompt | null
  fav: boolean
  copied: boolean
  onClose: () => void
  onCopy: () => void
  onToggleFav: () => void
  /** 仅自建提示词可删；内置的不传，就不渲染删除按钮 */
  onDelete?: () => void
}

/** 把 {{变量}} 切出来单独高亮 —— 正则在 storage 层已有一份，这里只做渲染切分 */
function renderBody(body: string) {
  const parts = body.split(/(\{\{\s*[^{}]+?\s*\}\})/g)
  return parts.map((part, i) => {
    const m = /^\{\{\s*([^{}]+?)\s*\}\}$/.exec(part)
    if (m) {
      return (
        <span key={i} className="var">
          {m[1].trim()}
        </span>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

export default function Drawer({ prompt, fav, copied, onClose, onCopy, onToggleFav, onDelete }: Props) {
  useEffect(() => {
    if (!prompt) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prompt, onClose])

  if (!prompt) return null
  const vars = extractVars(prompt.body)

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
          <pre className="promptbody">{renderBody(prompt.body)}</pre>

          {vars.length > 0 && (
            <section className="drawer__vars">
              <h3>需要替换的变量（{vars.length}）</h3>
              <ul>
                {vars.map((v) => (
                  <li key={v}>
                    <code>{`{{${v}}}`}</code>
                  </li>
                ))}
              </ul>
            </section>
          )}

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
          <button type="button" className={`btn ${copied ? 'btn--ok' : 'btn--primary'}`} onClick={onCopy}>
            {copied ? '已复制 ✓' : '复制全文'}
          </button>
          <button type="button" className={`btn btn--ghost ${fav ? 'btn--fav' : ''}`} onClick={onToggleFav}>
            {fav ? '已收藏' : '收藏'}
          </button>
          {onDelete && (
            <button type="button" className="btn btn--danger" onClick={onDelete}>
              删除
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
