<template>
  <div class="product-cards-list">
    <div v-if="products.length === 0" class="empty">
      <div class="empty-icon">
        <i class="ti ti-package-off" style="font-size: 4rem;"></i>
      </div>
      <p class="empty-title">No products found</p>
      <p class="empty-subtitle text-muted">Try adjusting your filters</p>
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list'" class="table-responsive">
      <table class="table table-hover table-vcenter">
        <thead>
          <tr>
            <th style="width: 50px;"></th>
            <th>Name</th>
            <th class="text-end" style="width: 90px;">Protein</th>
            <th class="text-end" style="width: 90px;">Fat</th>
            <th class="text-end" style="width: 90px;">Carbs</th>
            <th class="text-end" style="width: 90px;">Energy</th>
            <th class="text-end" style="width: 90px;">P/F Index</th>
            <th style="width: 60px;"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id">
            <td>
              <div class="list-image-container">
                <div v-if="product.image_url" class="image-wrapper">
                  <div class="image-spinner" :data-id="'list-spinner-' + product.id">
                    <span class="spinner-border spinner-border-sm"></span>
                  </div>
                  <img
                      :src="product.image_url"
                      :alt="product.name"
                      loading="lazy"
                      crossorigin="anonymous"
                      class="list-image"
                      @load="handleImageLoad($event, 'list-spinner-' + product.id)"
                      @error="handleImageError($event, 'list-spinner-' + product.id)"
                  />
                </div>
                <div v-else class="list-placeholder">
                  <i class="ti ti-photo-off"></i>
                </div>
              </div>
            </td>
            <td>
              <div class="product-name-cell">
                <span class="product-name">{{ product.name || 'Unknown Product' }}</span>
                <div v-if="product.brands" class="product-badges mt-1">
                  <span
                      v-for="(brand, idx) in splitJsonArrayFromString(product.brands).slice(0, 2)"
                      :key="idx"
                      class="badge bg-blue-lt me-1"
                  >
                    {{ brand }}
                  </span>
                </div>
              </div>
            </td>
            <td class="text-end">
              <strong v-if="product.protein" class="text-body">{{ product.protein }}g</strong>
              <span v-else class="text-muted">-</span>
            </td>
            <td class="text-end">
              <strong v-if="product.fat" class="text-body">{{ product.fat }}g</strong>
              <span v-else class="text-muted">-</span>
            </td>
            <td class="text-end">
              <strong v-if="product.carbs" class="text-body">{{ product.carbs }}g</strong>
              <span v-else class="text-muted">-</span>
            </td>
            <td class="text-end">
              <strong v-if="product.energy" class="text-body">{{ Math.round(product.energy) }}</strong>
              <span v-else class="text-muted">-</span>
            </td>
            <td class="text-end">
              <strong v-if="product.protein_fat_index" class="text-body">
                {{ Number(product.protein_fat_index).toFixed(2) }}
              </strong>
              <span v-else class="text-muted">-</span>
            </td>
            <td>
              <a
                  v-if="product.url"
                  :href="product.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-sm btn-ghost-primary"
              >
                <i class="ti ti-external-link"></i>
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Grid View (default) -->
    <div v-else class="row row-cards">
      <div v-for="product in products" :key="product.id" class="col-12 col-md-6 col-lg-4">
        <div class="card">
          <!-- Product Image -->
          <div class="card-img-top img-responsive img-responsive-21x9 card-img-top-custom">
            <div v-if="product.image_url" class="image-wrapper-grid">
              <div class="image-spinner-grid" :data-id="'grid-spinner-' + product.id">
                <span class="spinner-border text-primary"></span>
              </div>
              <img
                  :src="product.image_url"
                  :alt="product.name"
                  loading="lazy"
                  crossorigin="anonymous"
                  class="product-image"
                  @load="handleImageLoad($event, 'grid-spinner-' + product.id)"
                  @error="handleImageError($event, 'grid-spinner-' + product.id)"
              />
            </div>
            <div v-else class="placeholder-icon">
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
                  <strong v-if="product.energy" class="text-body values">
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
                  <strong v-if="product.protein_fat_index" class="text-body values">
                    {{ Number(product.protein_fat_index).toFixed(2) }}
                  </strong>
                  <span v-else class="text-muted">-</span>
                </div>
              </div>

              <div class="col-4">
                <div class="d-flex flex-column">
                  <small class="text-muted mb-1">Fat</small>
                  <strong v-if="product.fat" class="text-body values">{{ product.fat }} g</strong>
                  <span v-else class="text-muted">-</span>
                </div>
              </div>

              <div class="col-4">
                <div class="d-flex flex-column">
                  <small class="text-muted mb-1">Carbs</small>
                  <strong v-if="product.carbs" class="text-body values">{{ product.carbs }} g</strong>
                  <span v-else class="text-muted">-</span>
                </div>
              </div>

              <div class="col-4">
                <div class="d-flex flex-column">
                  <small class="text-muted mb-1">Protein</small>
                  <strong v-if="product.protein" class="text-body values">{{ product.protein }} g</strong>
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
  },
  viewMode: {
    type: String,
    default: 'grid',
    validator: (value) => ['grid', 'list'].includes(value)
  }
});

function handleImageLoad(event, spinnerId) {
  // Hide spinner when image loads
  const spinner = document.querySelector(`[data-id="${spinnerId}"]`);
  if (spinner) {
    spinner.style.display = 'none';
  }
}

function handleImageError(event, spinnerId) {
  // Hide spinner on error
  const spinner = document.querySelector(`[data-id="${spinnerId}"]`);
  if (spinner) {
    spinner.style.display = 'none';
  }
  // Hide broken image
  event.target.style.display = 'none';
  // Show placeholder if parent has one
  const parent = event.target.closest('.image-wrapper-grid') || event.target.closest('.image-wrapper');
  if (parent) {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-icon';
    placeholder.innerHTML = '<i class="ti ti-photo-off"></i>';
    parent.appendChild(placeholder);
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
.values {
  font-size: large;
}

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

.image-wrapper-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.image-spinner-grid {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
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

/* List view styles */
.list-image-container {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.image-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.list-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.list-placeholder {
  color: #cbd5e1;
  font-size: 1.25rem;
}

.product-name-cell {
  max-width: 300px;
}

.product-name {
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.product-badges .badge {
  font-size: 0.7rem;
}

.table-vcenter td {
  vertical-align: middle;
}

.btn-ghost-primary {
  color: var(--tblr-primary);
  background: transparent;
  border: none;
}

.btn-ghost-primary:hover {
  background: rgba(32, 107, 196, 0.1);
}

/* Mobile Responsive Styles */
@media (max-width: 767.98px) {
  .card-img-top-custom {
    height: 150px;
  }

  .card-title {
    font-size: 0.9rem;
  }

  .values {
    font-size: medium;
  }

  .card-body {
    padding: 0.75rem;
  }

  .row.g-2 {
    --bs-gutter-x: 0.5rem;
    --bs-gutter-y: 0.5rem;
  }

  .badge {
    font-size: 0.65rem;
    padding: 0.2em 0.5em;
  }

  .placeholder-icon {
    font-size: 2.5rem;
  }

  /* List view mobile adjustments */
  .table th,
  .table td {
    padding: 0.5rem 0.25rem;
    font-size: 0.8rem;
  }

  .list-image-container {
    width: 32px;
    height: 32px;
  }

  .product-name-cell {
    max-width: 150px;
  }

  .product-name {
    font-size: 0.85rem;
  }

  .product-badges .badge {
    font-size: 0.6rem;
  }

  /* Hide some columns on very small screens */
  .table th:nth-child(5),
  .table td:nth-child(5),
  .table th:nth-child(6),
  .table td:nth-child(6) {
    display: none;
  }
}

@media (max-width: 575.98px) {
  .card-img-top-custom {
    height: 120px;
  }

  .card-body {
    padding: 0.5rem;
  }

  .card-title {
    font-size: 0.85rem;
    -webkit-line-clamp: 1;
  }

  .values {
    font-size: 0.9rem;
  }

  small.text-muted {
    font-size: 0.7rem;
  }

  .mb-3 {
    margin-bottom: 0.5rem !important;
  }

  .mb-2 {
    margin-bottom: 0.25rem !important;
  }

  /* Hide fat column on extra small screens */
  .table th:nth-child(4),
  .table td:nth-child(4) {
    display: none;
  }

  .product-name-cell {
    max-width: 120px;
  }

  .empty {
    padding: 1.5rem;
  }

  .empty-icon {
    font-size: 3rem;
  }

  .empty-title {
    font-size: 1rem;
  }
}
</style>
