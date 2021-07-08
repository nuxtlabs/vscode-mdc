<template>
  <Monaco :value="raw" language="docus-markdown" @change="update" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Monaco from './Monaco.vue'

const props = defineProps({
  file: {
    type: String,
    required: true
  }
})

const raw = ref(props.file)


function update(content) {
  
}
</script>
