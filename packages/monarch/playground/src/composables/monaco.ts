import { watch, Ref, unref, ref } from 'vue'
import type { editor as Editor } from 'monaco-editor'
import * as monaco from 'monaco-editor'
import { createSingletonPromise } from '@antfu/utils'
import { language as markdownLanguage } from '../../../src'

const setupMonaco = createSingletonPromise(async () => {
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
    noUnusedLocals: false,
    noUnusedParameters: false,
    allowUnreachableCode: true,
    allowUnusedLabels: true,
    strict: true,
  })
  monaco.languages.register({id: 'docus-markdown'})
  // Register a tokens provider for the language
  monaco.languages.setMonarchTokensProvider('docus-markdown', markdownLanguage);
  
  return { monaco }
})

export function useMonaco(
  target: Ref,
  options: { code: string; language: string; onChanged?: (content: string) => void }
) {
  const isSetup = ref(false)
  let editor: Editor.IStandaloneCodeEditor

  const setContent = (content: string) => {
    if (!isSetup.value) return
    if (editor) editor.setValue(content)
  }

  const init = async () => {
    const { monaco } = await setupMonaco()

    watch(
      target,
      () => {
        const el = unref(target)

        if (!el) return

        const extension = () => {
          if (options.language === 'typescript') return 'ts'
          else if (options.language === 'javascript') return 'js'
          else if (options.language === 'html') return 'html'
        }

        const model = monaco.editor.createModel(
          options.code,
          options.language,
          monaco.Uri.parse(`file:///root/${Date.now()}.${extension()}`)
        )

        editor = monaco.editor.create(el, {
          model,
          tabSize: 2,
          wordWrap: 'on',
          insertSpaces: true,
          autoClosingQuotes: 'always',
          detectIndentation: true,
          folding: true,
          glyphMargin: false,
          lineNumbersMinChars: 3,
          overviewRulerLanes: 0,
          automaticLayout: true,
          theme: 'vs-dark',
          minimap: {
            enabled: false
          }
        })

        isSetup.value = true

        editor.getModel()?.onDidChangeContent(() => {
          options.onChanged?.(editor.getValue())
        })
      },
      {
        flush: 'post',
        immediate: true
      }
    )
  }

  init()

  return {
    setContent
  }
}
