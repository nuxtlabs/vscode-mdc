# Docus Markdown

Docus writing experience is based on a specific syntax built upon Vue components.

## Editor Extensions

[![Docus Extension for VS Code](https://img.shields.io/visual-studio-marketplace/v/NuxtLabs.docus?label=Visual%20Studio%20Code)](https://marketplace.visualstudio.com/items?itemName=NuxtLabs.docus)

## Features

- Block Components

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

- Inline Components

```md
:button-link[A button link]{.text-bold}
<!-- or -->
:button-link{.text-bold}[A button link]
```

- Span Text

```md
Hello [World]!
```

- Attributes

```md
Hello [World]{.text-primary-500}!

[Link](#link){.text-primary-500 ref="noopener"}!

**Bold Text**{style="color: tomato"}

`Inline Code`{style="background: #333"}

_Italic Text_{#italic_text}
```

### For more information

* [Docus Syntax Reference](https://docus.com/writing/syntax)

