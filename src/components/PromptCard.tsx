import type { Prompt } from '../types'
import { CATEGORY_LABEL } from '../types'

interface Props {
  prompt: Prompt
  fav: boolean
  index: number
  onOpen: () => void
  onCopy: () => void
  onToggleFav: () => void
}

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
    <path
      d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 9.7l5.8-.8z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M15 6.5A2.5 2.5 0 0012.5 4H6.5A2.5 2.5 0 004 6.5v6A2.5 2.5 0 006.5 15" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)

export default function PromptCard({ prompt, fav, index, onOpen, onCopy, onToggleFav }: Props) {
  return (
    <article
      className="card"
      style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      aria-label={`查看提示词：${prompt.title}`}
    >
      <div className="card__top">
        <span className={`chip chip--${prompt.category}`}>
          {prompt.builtin ? CATEGORY_LABEL[prompt.category] : '我的'}
        </span>
        <div className="card__tools">
          <button
            type="button"
            className={`iconbtn ${fav ? 'iconbtn--on' : ''}`}
            aria-label={fav ? `取消收藏 ${prompt.title}` : `收藏 ${prompt.title}`}
            aria-pressed={fav}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFav()
            }}
          >
            <StarIcon filled={fav} />
          </button>
          <button
            type="button"
            className="iconbtn"
            aria-label={`复制 ${prompt.title}`}
            onClick={(e) => {
              e.stopPropagation()
              onCopy()
            }}
          >
            <CopyIcon />
          </button>
        </div>
      </div>

      <h3 className="card__title">{prompt.title}</h3>
      <p className="card__when">{prompt.when}</p>

      <div className="card__tags">
        {prompt.tags.slice(0, 3).map((t) => (
          <span key={t} className="tag">
            #{t}
          </span>
        ))}
      </div>
    </article>
  )
}
