<img src="./images/icon.png" alt="MDC - Markdown Components by NuxtLabs" width="150" />

# MDC syntax highlight for Visual Studio Code

[![MDC Extension for VS Code][extension-version-src]][extension-href]
[![MDC Extension for VS Code][extension-downloads-src]][extension-href]
[![MDC Extension for VS Code][extension-installs-src]][extension-href]

Provides syntax highlighting and colon (`:`) matching for MDC (Markdown Components) files.

- [Download VS Code extension](https://marketplace.visualstudio.com/items?itemName=Nuxt.mdc)

Best used with:
- [Remark MDC](https://github.com/nuxtlabs/remark-mdc)
- [Markdown It MDC](https://github.com/antfu/markdown-it-mdc)

Or with Nuxt modules:
- [Nuxt MDC](https://github.com/nuxt-modules/mdc)
- [Nuxt Content](https://content.nuxt.com)

## Features

### Block Components

```md
::card
---
icon: IconNuxt
title: A complex card.
---

Default slot

#description
  ::alert
    Description slot
  ::
::
```

### Inline Components

```md
:button-link[A button link]{.text-bold}
<!-- or -->
:button-link{.text-bold}[A button link]
```

### Span Text

```md
Hello [World]!
```

### Attributes

```md
Hello [World]{.text-primary-500}!

[Link](#link){.text-primary-500 ref="noopener"}!

**Bold Text**{style="color: tomato"}

`Inline Code`{style="background: #333"}

_Italic Text_{#italic_text}
```

### Component name and prop suggestions

The extension provides intelligent auto-completion for MDC components and their properties when provided with a `mdc.componentMetadataURL` in your VS Code settings.

When typing a colon (`:`) at the start of a line, it suggests available component names. Within MDC component YAML frontmatter sections (between `---`), it provides contextual property suggestions with proper types and documentation.

Configure component suggestions by setting the `mdc.componentMetadataURL` in your VS Code settings. This URL should return JSON data in the following format:

```typescript
interface MDCComponentData {
  /** The kebab-case name of the markdown component */
  mdc_name: string
  /** Component description */
  description?: string
  /** Markdown-formatted documentation */
  documentation_markdown?: string
  /** URL to component documentation */
  docs_url?: string
  /** Component metadata from `@nuxtlabs/nuxt-component-meta` */
  component_meta: { ... }
}

type MDCMetadataResponse = MDCComponentData[]
```

The extension caches component metadata for 6 hours and provides a command `MDC: Refresh Component Metadata` to manually update the cache.

To customize the cache TTL you may customize the value for `mdc.componentMetadataCacheTTL` in settings. Defaults to `360` minutes (6 hours).

### For more information

* [MDC Syntax Reference](https://content.nuxt.com/usage/markdown#introduction)

<!-- Badges -->
[extension-href]: https://marketplace.visualstudio.com/items?itemName=Nuxt.mdc
[extension-version-src]: https://img.shields.io/visual-studio-marketplace/v/Nuxt.mdc?label=Visual%20Studio%20Code&style=flat&colorA=020420&colorB=28CF8D
[extension-downloads-src]: https://img.shields.io/visual-studio-marketplace/d/Nuxt.mdc?style=flat&colorA=020420&colorB=28CF8D
[extension-installs-src]: https://img.shields.io/visual-studio-marketplace/i/Nuxt.mdc?style=flat&colorA=020420&colorB=28CF8D
