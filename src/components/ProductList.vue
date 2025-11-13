<template>
  <div class="product-list">
    <div v-if="products.length === 0" class="empty">
      <div class="empty-icon">
        <i class="ti ti-package-off" style="font-size: 4rem;"></i>
      </div>
      <p class="empty-title">No products found</p>
      <p class="empty-subtitle text-muted">Try adjusting your filters</p>
    </div>

    <div v-else class="table-responsive">
      <table class="table table-selectable card-table table-vcenter text-nowrap">
        <thead>
        <tr>
          <th class="w-1">Product Name</th>
          <th class="w-1">Brand</th>
          <th class="w-1">Category</th>
          <th class="w-1">Energy</th>
          <th class="w-1">Protein / Fat index</th>
          <th class="w-1">Fat</th>
          <th class="w-1">Carb</th>
          <th class="w-1">Protein</th>
        </tr>
        </thead>
        <tbody>
        <ProductRow
            v-for="product in products"
            :key="product.id"
            :product="product"
        />
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import ProductRow from './ProductRow.vue';

defineProps({
  products: {
    type: Array,
    default: () => []
  }
});
</script>

<style scoped>
.product-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.empty {
  text-align: center;
  padding: 3rem;
}

.empty-icon {
  margin-bottom: 1rem;
  color: #6c757d;
}

.empty-title {
  font-size: 1.2rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.95rem;
}
</style>
