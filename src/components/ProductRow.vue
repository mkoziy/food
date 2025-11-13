<template>
  <tr>
    <td>
      <a :href="product.url || '#'" target="_blank" rel="noopener noreferrer" class="text-reset" tabindex="-1">
        {{ product.name || 'Unknown Product' }}
      </a>
    </td>
    <td>
      <span class="text-muted">
        {{ brandsDisplay }}
      </span>
    </td>
    <td>
      <span class="text-muted">
        {{ categoriesDisplay }}
      </span>
    </td>
    <td>
      <span v-if="product.energy">
        {{ Math.round(product.energy) }} kcal
      </span>
      <span v-else class="text-muted">-</span>
    </td>
    <td>
      <span v-if="product.protein_fat_index">
        {{ Number(product.protein_fat_index).toFixed(2) }}
      </span>
      <span v-else class="text-muted">-</span>
    </td>
    <td>
      <span v-if="product.fat">
        {{ product.fat }} g
      </span>
      <span v-else class="text-muted">-</span>
    </td>
    <td>
      <span v-if="product.carbs">
        {{ product.carbs }} g
      </span>
      <span v-else class="text-muted">-</span>
    </td>
    <td>
      <span v-if="product.protein">
        {{ product.protein }} g
      </span>
      <span v-else class="text-muted">-</span>
    </td>
  </tr>
</template>

<script setup>
import {computed} from 'vue';

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
});

const brandsDisplay = computed(() => {
  if (!props.product.brands) return '-';
  if (Array.isArray(props.product.brands)) {
    return props.product.brands.join(', ') || '-';
  }
  return props.product.brands || '-';
});

const categoriesDisplay = computed(() => {
  if (!props.product.categories) return '-';
  if (Array.isArray(props.product.categories)) {
    return props.product.categories.slice(0, 2).join(', ') || '-';
  }
  return props.product.categories || '-';
});
</script>

<style scoped>
tr:hover {
  background-color: #f8f9fa;
}
</style>
