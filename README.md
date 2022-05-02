# MDC for Visual Studio Code

[![MDC Extension for VS Code][extension-version-src]][extension-href]
[![MDC Extension for VS Code][extension-downloads-src]][extension-href]
[![MDC Extension for VS Code][extension-installs-src]][extension-href]

Provides syntax highlighting and colon (`:`) matching for MDC (Markdown Components) files for [Nuxt Content](https://content.nuxtjs.org).

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

### For more information

* [Docus Syntax Reference](https://docus.dev/writing/syntax)


<!-- Badges -->
[extension-href]: https://marketplace.visualstudio.com/items?itemName=Nuxt.mdc
[extension-version-src]: https://img.shields.io/visual-studio-marketplace/v/Nuxt.mdc?label=Visual%20Studio%20Code
[extension-downloads-src]: https://img.shields.io/visual-studio-marketplace/d/Nuxt.mdc
[extension-installs-src]: https://img.shields.io/visual-studio-marketplace/i/Nuxt.mdc
