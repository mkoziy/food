<template>
  <div class="product-cards-list">
    <div v-if="products.length === 0" class="empty">
      <div class="empty-icon">
        <i class="ti ti-package-off" style="font-size: 4rem;"></i>
      </div>
      <p class="empty-title">No products found</p>
      <p class="empty-subtitle text-muted">Try adjusting your filters</p>
    </div>

    <div v-else class="row row-cards">
      <div v-for="product in products" :key="product.id" class="col-12 col-md-6 col-lg-4">
        <div class="card">
          <!-- Product Image -->
          <div class="card-img-top img-responsive img-responsive-21x9 card-img-top-custom">
            <img loading="lazy"
              v-if="product.image_url"
              :src="product.image_url"
              :alt="product.name"
              crossorigin="anonymous"
              class="product-image"
              @error="handleImageError"
            />
            <div class="placeholder-icon" :style="{display: product.image_url ? 'none' : 'flex'}">
              <i class="ti ti-photo-off"></i>
            </div>
          </div>

          <div class="card-body">
            <div class="d-flex align-items-center mb-3">
              <div class="flex-fill">
                <a :href="product.url || '#'" target="_blank" rel="noopener noreferrer"
                   class="text-reset text-decoration-none">
                  <h3 class="card-title mb-1">{{ product.name || 'Unknown Product' }}</h3>
                </a>
              </div>
            </div>

            <!-- Nutrition Info Grid -->
            <div class="row g-2 mb-3">
              <div class="col-6">
                <div class="d-flex flex-column">
                  <small class="text-muted mb-1">
                    <i class="ti ti-flame me-1"></i>Energy
                  </small>
                  <strong v-if="product.energy" class="text-body">
                    {{ Math.round(product.energy) }} kcal
                  </strong>
                  <span v-else class="text-muted">-</span>
                </div>
              </div>

              <div class="col-6">
                <div class="d-flex flex-column">
                  <small class="text-muted mb-1">
                    <i class="ti ti-chart-line me-1"></i>P/F Index
                  </small>
                  <strong v-if="product.protein_fat_index" class="text-body">
                    {{ Number(product.protein_fat_index).toFixed(2) }}
                  </strong>
                  <span v-else class="text-muted">-</span>
                </div>
              </div>

              <div class="col-4">
                <div class="d-flex flex-column">
                  <small class="text-muted mb-1">Fat</small>
                  <strong v-if="product.fat" class="text-body">{{ product.fat }} g</strong>
                  <span v-else class="text-muted">-</span>
                </div>
              </div>

              <div class="col-4">
                <div class="d-flex flex-column">
                  <small class="text-muted mb-1">Carbs</small>
                  <strong v-if="product.carbs" class="text-body">{{ product.carbs }} g</strong>
                  <span v-else class="text-muted">-</span>
                </div>
              </div>

              <div class="col-4">
                <div class="d-flex flex-column">
                  <small class="text-muted mb-1">Protein</small>
                  <strong v-if="product.protein" class="text-body">{{ product.protein }} g</strong>
                  <span v-else class="text-muted">-</span>
                </div>
              </div>
            </div>

            <!-- Brands, Categories, Stores -->
            <div class="mb-0">
              <div v-if="product.brands" class="mb-2">
                <small class="text-muted d-block mb-1">
                  <i class="ti ti-tag me-1"></i>Brands
                </small>
                <div class="d-flex flex-wrap gap-1">
                  <span v-for="(brand, idx) in splitJsonArrayFromString(product.brands)"
                        :key="idx"
                        class="badge bg-blue-lt">
                    {{ brand }}
                  </span>
                </div>
              </div>

              <div v-if="product.categories" class="mb-2">
                <small class="text-muted d-block mb-1">
                  <i class="ti ti-category me-1"></i>Categories
                </small>
                <div class="d-flex flex-wrap gap-1">
                  <span v-for="(category, idx) in splitJsonArrayFromString(product.categories)"
                        :key="idx"
                        class="badge bg-green-lt">
                    {{ category }}
                  </span>
                </div>
              </div>

              <div v-if="product.stores">
                <small class="text-muted d-block mb-1">
                  <i class="ti ti-building-store me-1"></i>Stores
                </small>
                <div class="d-flex flex-wrap gap-1">
                  <span v-for="(store, idx) in splitJsonArrayFromString(product.stores)"
                        :key="idx"
                        class="badge bg-orange-lt">
                    {{ store }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card Footer with Link -->
          <div v-if="product.url" class="card-footer">
            <a :href="product.url" target="_blank" rel="noopener noreferrer"
               class="btn btn-outline-primary w-100">
              <i class="ti ti-external-link me-1"></i>
              View
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  products: {
    type: Array,
    default: () => []
  }
});

function handleImageError(event) {
  // Hide broken image and show placeholder
  event.target.style.display = 'none';
  const placeholder = event.target.nextElementSibling;
  if (placeholder) {
    placeholder.style.display = 'flex';
  }
}

function splitJsonArrayFromString(arr) {
  if (!arr) return [];
  if (Array.isArray(arr)) {
    return arr.map(b => String(b).trim()).filter(Boolean).slice(0, 3);
  }

  if (typeof arr === 'string') {
    try {
      const parsed = JSON.parse(arr);
      if (Array.isArray(parsed)) {
        return parsed.map(b => String(b).trim()).filter(Boolean).slice(0, 3);
      }
    } catch (e) {
      // not JSON, fall through to comma-split
    }

    return arr.split(',').map(b => b.trim()).filter(Boolean).slice(0, 3);
  }

  return [];
}
</script>

<style scoped>
.product-cards-list {
  min-height: 200px;
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

.card {
  height: 100%;
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

.card-img-top-custom {
  height: 200px;
  width: 100%;
  position: relative;
  border-bottom: 1px solid rgba(98, 105, 118, 0.16);
  background-color: #f8f9fa;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
}

.placeholder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  color: #cbd5e1;
  font-size: 4rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-title:hover {
  color: var(--tblr-primary);
}

.badge {
  font-size: 0.75rem;
  font-weight: 500;
}

.gap-1 {
  gap: 0.25rem;
}
</style>
