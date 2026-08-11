/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * mammoth.js 类型声明（无官方 @types）
 * 仅声明文章工作台用到的 convertToHtml 接口。
 * 同时覆盖 'mammoth' 与 'mammoth/mammoth.browser' 两个入口。
 */
declare module 'mammoth' {
  export interface ConvertResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }
  export interface ConvertOptions {
    styleMap?: string[]
    includeDefaultStyleMap?: boolean
    convertImage?: unknown
  }
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: ConvertOptions,
  ): Promise<ConvertResult>
  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer },
  ): Promise<ConvertResult>
  const _default: {
    convertToHtml: typeof convertToHtml
    extractRawText: typeof extractRawText
  }
  export default _default
}

declare module 'mammoth/mammoth.browser' {
  export interface ConvertResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
  ): Promise<ConvertResult>
  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer },
  ): Promise<ConvertResult>
  const _default: {
    convertToHtml: typeof convertToHtml
    extractRawText: typeof extractRawText
  }
  export default _default
}

