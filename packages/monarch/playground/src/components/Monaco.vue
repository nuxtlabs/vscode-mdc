<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMonaco } from '../composables/monaco'

const emit = defineEmits<(e: 'change', content: string) => void>()
const props = defineProps<{ language: string; value: string }>()
const target = ref()

const { setContent } = useMonaco(target, {
  language: props.language,
  code: props.value,
  onChanged(content: string) {
    emit('change', content)
  }
})
watch(
  () => props.value,
  () => setContent(props.value)
)
emit('change', props.value)
</script>

<template>
  <div ref="target" style="height: 100vh"></div>
</template>
