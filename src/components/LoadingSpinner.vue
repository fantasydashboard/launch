<template>
  <div class="loading-spinner-container" :class="containerClass">
    <div class="badge-flipper" :style="{ width: computedSize, height: computedSize }">
      <img 
        src="/ufd-badge.png" 
        alt="Loading..." 
        class="badge-image"
        :style="{ width: computedSize, height: computedSize }"
      />
    </div>
    <p v-if="message" class="loading-message" :class="messageClass">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  message?: string
  centered?: boolean
}>(), {
  size: 'md',
  centered: true
})

const computedSize = computed(() => {
  if (typeof props.size === 'number') {
    return `${props.size}px`
  }
  const sizes = {
    sm: '32px',
    md: '48px',
    lg: '64px',
    xl: '96px'
  }
  return sizes[props.size] || sizes.md
})

const containerClass = computed(() => ({
  'centered': props.centered
}))

const messageClass = computed(() => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  }
  return typeof props.size === 'string' ? sizeClasses[props.size] : 'text-sm'
})
</script>

<style scoped>
.loading-spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner-container.centered {
  justify-content: center;
}

.badge-flipper {
  perspective: 1000px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-image {
  animation: badge-flip 2s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px rgba(234, 179, 8, 0.4));
}

/* 3D horizontal flip that shows logo on both sides */
@keyframes badge-flip {
  0% {
    transform: perspective(400px) rotateY(0deg);
  }
  25% {
    transform: perspective(400px) rotateY(90deg) scaleX(0.1);
  }
  26% {
    transform: perspective(400px) rotateY(90deg) scaleX(0.1);
  }
  50% {
    transform: perspective(400px) rotateY(0deg);
  }
  75% {
    transform: perspective(400px) rotateY(-90deg) scaleX(0.1);
  }
  76% {
    transform: perspective(400px) rotateY(-90deg) scaleX(0.1);
  }
  100% {
    transform: perspective(400px) rotateY(0deg);
  }
}

.loading-message {
  color: #9CA3AF;
  font-weight: 500;
  text-align: center;
}
</style>
