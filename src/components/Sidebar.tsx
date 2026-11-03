import type { ViewKey } from '../types'
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../types'

interface Props {
  view: ViewKey
  counts: Record<string, number>
  tags: string[]
  activeTags: string[]
  onView: (v: ViewKey) => void
  onTag: (t: string) => void
  onCompose: () => void
}

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'favorites', label: '我的收藏' },
  { key: 'mine', label: '我的提示词' },
  ...CATEGORY_ORDER.map((c) => ({ key: c as ViewKey, label: CATEGORY_LABEL[c] })),
]

export default function Sidebar({ view, counts, tags, activeTags, onView, onTag, onCompose }: Props) {
  return (
    <aside className="side">
      <nav className="side__nav" aria-label="分类">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`navitem ${view === v.key ? 'navitem--on' : ''}`}
            onClick={() => onView(v.key)}
            aria-current={view === v.key ? 'true' : undefined}
          >
            <span>{v.label}</span>
            <span className="navitem__n">{counts[v.key] ?? 0}</span>
          </button>
        ))}
      </nav>

      <div className="side__block">
        <h2 className="side__h">标签</h2>
        <div className="side__tags">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              className={`tag tag--btn ${activeTags.includes(t) ? 'tag--on' : ''}`}
              onClick={() => onTag(t)}
              aria-pressed={activeTags.includes(t)}
            >
              #{t}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="side__compose" onClick={onCompose}>
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        新建提示词
      </button>

      <p className="side__note">
        自己新增的提示词只存在这台设备的浏览器里，不会上传服务器。
      </p>
    </aside>
  )
}
