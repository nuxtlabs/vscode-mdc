<template>
  <div class="h-full default-theme" :push-other-panes="false">
      <Editor class="editor" :file="currentFile" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Editor from './components/Editor.vue'

const currentFile = ref(`---
key: value
---
<!--
Inline :block
Inline :block[with content]
-->

[Span]

[Span]{with="attribute"}

**bold**{with="attribute"}
__bold__{with="attribute"}

\`code\`{with="attribute"}

_italic_{with="attribute"}

[Link](#link){with="attribute"}

![image](#image){with="attribute"}

Inline :block

Inline :block[with content]

Inline :block[with content]{and="attributes"}
Inline :block{with="attributes"}[and content]

inline :block{with="attributes"}

::block{with="attributes"}
---
key: value
key2: 
  - value
  - another value
---
This is **default slot**

#other_slot

# The Other slot

::

`
)

</script>
