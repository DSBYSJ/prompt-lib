import { useState } from 'react'
import type { Category, Prompt } from '../types'
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../types'

interface Props {
  onClose: () => void
  onSave: (p: Prompt) => void
}

const EMPTY = { title: '', when: '', body: '', category: 'writing' as Category, tags: '' }

export default function Composer({ onClose, onSave }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState('')

  const submit = () => {
    if (!form.title.trim()) return setErr('标题不能为空')
    if (!form.body.trim()) return setErr('正文不能为空')
    onSave({
      id: `mine-${Date.now().toString(36)}`,
      title: form.title.trim(),
      category: form.category,
      tags: form.tags
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
      when: form.when.trim() || '（未填写使用场景）',
      body: form.body,
      builtin: false,
    })
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="新建提示词">
      <button type="button" className="drawer__mask" onClick={onClose} aria-label="关闭" />
      <div className="modal__panel">
        <h2 className="modal__title">新建提示词</h2>
        <p className="modal__hint">只保存在这台设备的浏览器里，不会上传服务器。</p>

        <label className="field">
          <span>标题</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="例：把零散记录整理成周报"
            autoFocus
          />
        </label>

        <label className="field">
          <span>什么时候用</span>
          <input
            value={form.when}
            onChange={(e) => setForm({ ...form, when: e.target.value })}
            placeholder="例：周五下午手上只有碎片笔记"
          />
        </label>

        <div className="field">
          <span>类别</span>
          <div className="segs">
            {CATEGORY_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                className={`seg ${form.category === c ? 'seg--on' : ''}`}
                onClick={() => setForm({ ...form, category: c })}
              >
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>标签（逗号分隔，可空）</span>
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="例：周报, 汇报"
          />
        </label>

        <label className="field">
          <span>正文（用 {'{{变量}}'} 标出要替换的地方）</span>
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={8}
            placeholder={'你是……请帮我处理 {{主题}} ……'}
          />
        </label>

        {err && <p className="field__err">{err}</p>}

        <div className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn--primary" onClick={submit}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
