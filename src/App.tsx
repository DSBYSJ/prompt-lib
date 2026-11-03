import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Composer from './components/Composer'
import Drawer from './components/Drawer'
import PromptCard from './components/PromptCard'
import Sidebar from './components/Sidebar'
import Toast, { type ToastMessage } from './components/Toast'
import { PROMPTS } from './data/prompts'
import { collectTags, countByView, filterPrompts } from './lib/search'
import {
  exportPayload,
  loadCustom,
  loadFavorites,
  parseImport,
  saveCustom,
  saveFavorites,
  storageAvailable,
} from './lib/storage'
import { CATEGORY_ORDER, type Prompt, type ViewKey } from './types'

/** 复制：优先 Clipboard API，失败降级 execCommand —— 老浏览器与权限被拒都要能用 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 继续走降级 */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export default function App() {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewKey>('all')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [custom, setCustom] = useState<Prompt[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 首次挂载读本地数据；存储不可用（隐私模式）时给出一次提示
  useEffect(() => {
    if (!storageAvailable()) {
      setToast({ id: Date.now(), text: '浏览器禁用了本地存储，收藏与自建仅在本次会话有效', tone: 'warn' })
      return
    }
    setFavorites(loadFavorites())
    setCustom(loadCustom())
  }, [])

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])
  useEffect(() => {
    saveCustom(custom)
  }, [custom])

  const all = useMemo(() => [...PROMPTS, ...custom], [custom])
  const favSet = useMemo(() => new Set(favorites), [favorites])
  const visible = useMemo(
    () => filterPrompts(all, { query, view, tags: activeTags }, favSet),
    [all, query, view, activeTags, favSet],
  )
  const counts = useMemo(() => countByView(all, favSet, CATEGORY_ORDER), [all, favSet])
  // 标签墙只放最高频的 16 个：全放会把侧栏撑成一堵墙，长尾交给搜索
  const tags = useMemo(() => collectTags(all).slice(0, 16), [all])
  const open = useMemo(() => all.find((p) => p.id === openId) ?? null, [all, openId])

  const say = useCallback((text: string, tone: ToastMessage['tone'] = 'ok') => {
    setToast({ id: Date.now(), text, tone })
  }, [])

  const copy = useCallback(
    async (p: Prompt) => {
      const ok = await writeClipboard(p.body)
      if (!ok) {
        say('复制失败，请打开详情手动选中复制', 'warn')
        return
      }
      setCopiedId(p.id)
      window.setTimeout(() => setCopiedId(null), 1500)
      say('已复制到剪贴板')
    },
    [say],
  )

  const toggleFav = useCallback((id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const toggleTag = useCallback((t: string) => {
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }, [])

  const doExport = () => {
    const blob = new Blob([exportPayload(favorites, custom)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompt-lib-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    say('已导出备份文件')
  }

  const doImport = async (file: File) => {
    if (file.size > 1024 * 1024) {
      say('文件过大（超过 1MB），请检查选错了文件', 'warn')
      return
    }
    const text = await file.text()
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      say('文件格式不正确：不是合法 JSON', 'warn')
      return
    }
    const res = parseImport(raw)
    if (res.items.length === 0 && res.ignored === 0) {
      say('文件格式不正确：没有可导入的提示词', 'warn')
      return
    }
    setCustom((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]))
      for (const item of res.items) map.set(item.id, item)
      return [...map.values()]
    })
    const favs = (raw as { favorites?: unknown })?.favorites
    if (Array.isArray(favs)) {
      setFavorites((prev) => [...new Set([...prev, ...favs.filter((x): x is string => typeof x === 'string')])])
    }
    say(res.ignored > 0 ? `导入 ${res.items.length} 条，忽略 ${res.ignored} 条格式不符的` : `导入 ${res.items.length} 条`)
  }

  const removeCustom = (id: string) => {
    setCustom((prev) => prev.filter((p) => p.id !== id))
    setOpenId(null)
    say('已删除')
  }

  const emptyHint =
    query || activeTags.length > 0
      ? { title: '没有匹配的提示词', sub: '换个关键词，或者清空筛选条件', action: '清空筛选' }
      : view === 'favorites'
        ? { title: '还没有收藏', sub: '在卡片右上角点星标，常用的就会收在这里', action: '' }
        : view === 'mine'
          ? { title: '还没有自建的提示词', sub: '左下角「新建提示词」，写好的只存在本机', action: '' }
          : { title: '这里是空的', sub: '换个分类看看', action: '' }

  return (
    <div className="app">
      <header className="top">
        <div className="top__brand">
          <div className="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="19" height="19">
              <path
                d="M4 7h9M4 12h13M4 17h7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <h1>提示词库</h1>
            <p>自己验证过有效的那些，收在一处</p>
          </div>
        </div>

        <div className="top__search">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="top__searchIcon">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜标题、场景、正文、标签…"
            aria-label="搜索提示词"
          />
          {query && (
            <button type="button" className="top__clear" onClick={() => setQuery('')} aria-label="清空搜索">
              ×
            </button>
          )}
        </div>

        <div className="top__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={doExport}>
            导出
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
            导入
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void doImport(f)
              e.target.value = ''
            }}
          />
        </div>
      </header>

      <main className="main">
        <Sidebar
          view={view}
          counts={counts}
          tags={tags}
          activeTags={activeTags}
          onView={(v) => {
            setView(v)
            setActiveTags([])
          }}
          onTag={toggleTag}
          onCompose={() => setComposerOpen(true)}
        />

        <section className="content">
          <div className="content__bar">
            <span>
              共 <b>{visible.length}</b> 条
              {activeTags.length > 0 && ` · 标签：${activeTags.map((t) => `#${t}`).join(' ')}`}
            </span>
            {(query || activeTags.length > 0 || view !== 'all') && (
              <button
                type="button"
                className="linkbtn"
                onClick={() => {
                  setQuery('')
                  setActiveTags([])
                  setView('all')
                }}
              >
                重置筛选
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="empty">
              <div className="empty__mark" aria-hidden="true">
                ∅
              </div>
              <h3>{emptyHint.title}</h3>
              <p>{emptyHint.sub}</p>
              {emptyHint.action && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setQuery('')
                    setActiveTags([])
                  }}
                >
                  {emptyHint.action}
                </button>
              )}
            </div>
          ) : (
            <div className="grid">
              {visible.map((p, i) => (
                <PromptCard
                  key={p.id}
                  prompt={p}
                  fav={favSet.has(p.id)}
                  index={i}
                  onOpen={() => setOpenId(p.id)}
                  onCopy={() => void copy(p)}
                  onToggleFav={() => toggleFav(p.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <button type="button" className="fab" onClick={() => setComposerOpen(true)} aria-label="新建提示词">
        ＋
      </button>

      <footer className="foot">        <span>纯静态 · 无账号 · 自建内容只存本机</span>
        <span className="foot__dot">·</span>
        <span>v{__APP_VERSION__}</span>
        {import.meta.env.VITE_ICP_LICENSE && (
          <>
            <span className="foot__dot">·</span>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">
              {import.meta.env.VITE_ICP_LICENSE}
            </a>
          </>
        )}
      </footer>

      <Drawer
        prompt={open}
        fav={open ? favSet.has(open.id) : false}
        copied={open ? copiedId === open.id : false}
        onClose={() => setOpenId(null)}
        onCopy={() => open && void copy(open)}
        onToggleFav={() => open && toggleFav(open.id)}
        onDelete={open && !open.builtin ? () => removeCustom(open.id) : undefined}
      />

      {composerOpen && (
        <Composer
          onClose={() => setComposerOpen(false)}
          onSave={(p) => {
            setCustom((prev) => [p, ...prev])
            setComposerOpen(false)
            setView('mine')
            say('已保存到「我的提示词」')
          }}
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
