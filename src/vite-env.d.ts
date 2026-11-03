/// <reference types="vite/client" />

/** 构建期从 package.json 注入，见 vite.config.ts 的 define */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** 备案号：与主站同一份，构建时通过环境变量传入（不进仓库） */
  readonly VITE_ICP_LICENSE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
