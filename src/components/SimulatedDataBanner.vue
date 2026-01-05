<template>
  <div class="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div class="flex items-center gap-3 flex-1">
        <div class="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <span class="text-xl">🎭</span>
        </div>
        <div>
          <h3 class="font-bold text-yellow-500 text-sm">Simulated Preview</h3>
          <p class="text-dark-textMuted text-xs">
            {{ isUltimateTier 
              ? "This is sample data. Subscribe to Ultimate to see your real projections and recommendations."
              : "This is sample data showing what you'll see with League Pass. Your real league data is just one click away!"
            }}
          </p>
        </div>
      </div>
      <button 
        @click="handleUpgrade"
        class="px-5 py-2 rounded-lg font-bold text-sm transition-all transform hover:scale-105 flex-shrink-0"
        :class="isUltimateTier 
          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900' 
          : 'bg-primary text-gray-900'"
      >
        {{ isUltimateTier ? 'Go Ultimate - $4.99/mo' : 'Get League Pass' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps<{
  isUltimateTier?: boolean
}>()

const router = useRouter()

function handleUpgrade() {
  router.push('/pricing')
}
</script>
