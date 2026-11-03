/** 提示词库的核心类型。数据与 UI 共用，避免两处定义漂移。 */

export type Category = 'writing' | 'coding' | 'study' | 'career' | 'image'

export interface Prompt {
  /** 稳定 slug，导出/收藏都以它为准，改了等于换一条 */
  id: string
  title: string
  category: Category
  tags: string[]
  /** 搜索别名：英文名、缩写、常见误写，让"记不清叫什么"也能搜到 */
  aliases?: string[]
  /** 什么时候用 —— 比正文更重要的一行 */
  when: string
  /** 正文，{{变量}} 会被高亮并抽取成变量清单 */
  body: string
  /** 使用注意（可选） */
  note?: string
  /** true=内置（进代码），false=用户自建（只进 localStorage） */
  builtin: boolean
}

export const CATEGORY_ORDER: Category[] = ['writing', 'coding', 'study', 'career', 'image']

export const CATEGORY_LABEL: Record<Category, string> = {
  writing: '写作',
  coding: '编程',
  study: '学习',
  career: '求职',
  image: '图像',
}

/** 虚拟分类：不是 Prompt.category 的取值，而是"视图" */
export type ViewKey = 'all' | 'favorites' | 'mine' | Category
