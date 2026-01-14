<template>
  <div class="filter-bar">
    <!-- Search -->
    <div class="mb-3">
      <label class="form-label">
        <i class="ti ti-search me-1"></i>
        Search
      </label>
      <input
          v-model="localFilters.search"
          type="text"
          class="form-control"
          placeholder="Search by name..."
          @input="debouncedEmitFilters"
      />
    </div>

    <!-- Quick Filter Presets -->
    <div class="filter-section mb-3">
      <div
          class="filter-section-header"
          @click="toggleSection('quickFilters')"
      >
        <span>
          <i class="ti ti-bolt me-1"></i>
          Quick Filters
        </span>
        <i :class="collapsed.quickFilters ? 'ti ti-chevron-down' : 'ti ti-chevron-up'"></i>
      </div>
      <div v-show="!collapsed.quickFilters" class="filter-section-body">
        <div class="d-flex flex-wrap gap-2">
          <button
              v-for="preset in quickPresets"
              :key="preset.label"
              class="btn btn-sm"
              :class="isPresetActive(preset) ? 'btn-primary' : 'btn-outline-secondary'"
              @click="togglePreset(preset)"
          >
            <i :class="preset.icon" class="me-1"></i>
            {{ preset.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Nutrition Ranges -->
    <div class="filter-section mb-3">
      <div
          class="filter-section-header"
          @click="toggleSection('nutrition')"
      >
        <span>
          <i class="ti ti-chart-bar me-1"></i>
          Nutrition Ranges
        </span>
        <i :class="collapsed.nutrition ? 'ti ti-chevron-down' : 'ti ti-chevron-up'"></i>
      </div>
      <div v-show="!collapsed.nutrition" class="filter-section-body">
        <!-- Protein -->
        <div class="mb-3">
          <label class="form-label small text-muted mb-1">
            <i class="ti ti-meat me-1"></i>Protein (g)
          </label>
          <div class="row g-2">
            <div class="col-6">
              <input
                  v-model="localFilters.proteinMin"
                  type="number"
                  class="form-control form-control-sm"
                  placeholder="Min"
                  min="0"
                  @input="debouncedEmitFilters"
              />
            </div>
            <div class="col-6">
              <input
                  v-model="localFilters.proteinMax"
                  type="number"
                  class="form-control form-control-sm"
                  placeholder="Max"
                  min="0"
                  @input="debouncedEmitFilters"
              />
            </div>
          </div>
        </div>

        <!-- Fat -->
        <div class="mb-3">
          <label class="form-label small text-muted mb-1">
            <i class="ti ti-droplet me-1"></i>Fat (g)
          </label>
          <div class="row g-2">
            <div class="col-6">
              <input
                  v-model="localFilters.fatMin"
                  type="number"
                  class="form-control form-control-sm"
                  placeholder="Min"
                  min="0"
                  @input="debouncedEmitFilters"
              />
            </div>
            <div class="col-6">
              <input
                  v-model="localFilters.fatMax"
                  type="number"
                  class="form-control form-control-sm"
                  placeholder="Max"
                  min="0"
                  @input="debouncedEmitFilters"
              />
            </div>
          </div>
        </div>

        <!-- Carbs -->
        <div class="mb-3">
          <label class="form-label small text-muted mb-1">
            <i class="ti ti-grain me-1"></i>Carbs (g)
          </label>
          <div class="row g-2">
            <div class="col-6">
              <input
                  v-model="localFilters.carbsMin"
                  type="number"
                  class="form-control form-control-sm"
                  placeholder="Min"
                  min="0"
                  @input="debouncedEmitFilters"
              />
            </div>
            <div class="col-6">
              <input
                  v-model="localFilters.carbsMax"
                  type="number"
                  class="form-control form-control-sm"
                  placeholder="Max"
                  min="0"
                  @input="debouncedEmitFilters"
              />
            </div>
          </div>
        </div>

        <!-- Energy -->
        <div class="mb-0">
          <label class="form-label small text-muted mb-1">
            <i class="ti ti-flame me-1"></i>Energy (kcal)
          </label>
          <div class="row g-2">
            <div class="col-6">
              <input
                  v-model="localFilters.energyMin"
                  type="number"
                  class="form-control form-control-sm"
                  placeholder="Min"
                  min="0"
                  @input="debouncedEmitFilters"
              />
            </div>
            <div class="col-6">
              <input
                  v-model="localFilters.energyMax"
                  type="number"
                  class="form-control form-control-sm"
                  placeholder="Max"
                  min="0"
                  @input="debouncedEmitFilters"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Brands -->
    <div class="filter-section mb-3">
      <div
          class="filter-section-header"
          @click="toggleSection('brands')"
      >
        <span>
          <i class="ti ti-tag me-1"></i>
          Brands
          <span v-if="localFilters.brands.length" class="badge bg-primary ms-1">
            {{ localFilters.brands.length }}
          </span>
        </span>
        <i :class="collapsed.brands ? 'ti ti-chevron-down' : 'ti ti-chevron-up'"></i>
      </div>
      <div v-show="!collapsed.brands" class="filter-section-body">
        <Multiselect
            v-model="localFilters.brands"
            :options="brandsOptions"
            :multiple="true"
            :searchable="true"
            :loading="isLoadingBrands"
            :close-on-select="false"
            :clear-on-select="false"
            :internal-search="false"
            label="brand"
            track-by="id"
            placeholder="Select brands..."
            @update:modelValue="emitFilters"
            @search-change="searchBrands"
        />
      </div>
    </div>

    <!-- Categories -->
    <div class="filter-section mb-3">
      <div
          class="filter-section-header"
          @click="toggleSection('categories')"
      >
        <span>
          <i class="ti ti-category me-1"></i>
          Categories
          <span v-if="localFilters.categories.length" class="badge bg-primary ms-1">
            {{ localFilters.categories.length }}
          </span>
        </span>
        <i :class="collapsed.categories ? 'ti ti-chevron-down' : 'ti ti-chevron-up'"></i>
      </div>
      <div v-show="!collapsed.categories" class="filter-section-body">
        <Multiselect
            v-model="localFilters.categories"
            :options="categoriesOptions"
            :multiple="true"
            :searchable="true"
            :loading="isLoadingCategories"
            :close-on-select="false"
            :clear-on-select="false"
            :internal-search="false"
            label="category"
            track-by="id"
            placeholder="Select categories..."
            @update:modelValue="emitFilters"
            @search-change="searchCategories"
        />
      </div>
    </div>

    <!-- Stores -->
    <div class="filter-section mb-3">
      <div
          class="filter-section-header"
          @click="toggleSection('stores')"
      >
        <span>
          <i class="ti ti-building-store me-1"></i>
          Stores
          <span v-if="localFilters.stores.length" class="badge bg-primary ms-1">
            {{ localFilters.stores.length }}
          </span>
        </span>
        <i :class="collapsed.stores ? 'ti ti-chevron-down' : 'ti ti-chevron-up'"></i>
      </div>
      <div v-show="!collapsed.stores" class="filter-section-body">
        <Multiselect
            v-model="localFilters.stores"
            :options="storesOptions"
            :multiple="true"
            :searchable="true"
            :loading="isLoadingStores"
            :close-on-select="false"
            :clear-on-select="false"
            :internal-search="false"
            label="store"
            track-by="id"
            placeholder="Select stores..."
            @update:modelValue="emitFilters"
            @search-change="searchStores"
        />

        <!-- Store Presets -->
        <div class="mt-2">
          <small class="text-muted d-block mb-1">Quick Select</small>
          <div class="d-flex flex-wrap gap-1">
            <button
                v-for="preset in storePresets"
                :key="preset"
                class="btn btn-sm"
                :class="isStoreSelected(preset) ? 'btn-primary' : 'btn-outline-secondary'"
                @click="toggleStorePreset(preset)"
            >
              {{ preset }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sorting -->
    <div class="filter-section">
      <div
          class="filter-section-header"
          @click="toggleSection('sorting')"
      >
        <span>
          <i class="ti ti-arrows-sort me-1"></i>
          Sort
        </span>
        <i :class="collapsed.sorting ? 'ti ti-chevron-down' : 'ti ti-chevron-up'"></i>
      </div>
      <div v-show="!collapsed.sorting" class="filter-section-body">
        <div class="d-flex gap-2">
          <select
              v-model="selectedSortField"
              class="form-select"
              @change="updateSort"
          >
            <option value="">Default (Name)</option>
            <option v-for="field in sortFields" :key="field.key" :value="field.key">
              {{ field.label }}
            </option>
          </select>
          <button
              class="btn btn-outline-secondary"
              :disabled="!selectedSortField"
              @click="toggleSortDirection"
              :title="sortDirection === 'asc' ? 'Ascending' : 'Descending'"
          >
            <i :class="sortDirection === 'asc' ? 'ti ti-sort-ascending' : 'ti ti-sort-descending'"></i>
          </button>
        </div>
        <small v-if="selectedSortField" class="text-muted mt-1 d-block">
          {{ getSortFieldLabel(selectedSortField) }}: {{ sortDirection === 'asc' ? 'Low to High' : 'High to Low' }}
        </small>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, watch} from 'vue';
import Multiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.css';
import {useDatabase} from '../composables/useDatabase';
import storePresetsConfig from '../storePresets.json';

const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  availableBrands: {
    type: Array,
    default: () => []
  },
  availableCategories: {
    type: Array,
    default: () => []
  },
  availableStores: {
    type: Array,
    default: () => []
  },
  sort: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:filters', 'update:sort', 'reset']);

const {getUniqueBrands, getUniqueCategories, getUniqueStores} = useDatabase();

// Initialize local filters with all possible fields
const localFilters = ref({
  search: '',
  brands: [],
  categories: [],
  stores: [],
  proteinMin: '',
  proteinMax: '',
  fatMin: '',
  fatMax: '',
  carbsMin: '',
  carbsMax: '',
  energyMin: '',
  energyMax: '',
  ...props.filters
});

// Collapsible sections state (all visible by default for better UX)
const collapsed = ref({
  quickFilters: false,
  nutrition: false,
  brands: true,
  categories: true,
  stores: true,
  sorting: true
});

// Sort state
const selectedSortField = ref('');
const sortDirection = ref('desc');

// Initialize from props
if (props.sort && props.sort.length > 0) {
  selectedSortField.value = props.sort[0].field;
  sortDirection.value = props.sort[0].direction;
}

const brandsOptions = ref([...props.availableBrands]);
const categoriesOptions = ref([...props.availableCategories]);
const storesOptions = ref([...props.availableStores]);
const isLoadingBrands = ref(false);
const isLoadingCategories = ref(false);
const isLoadingStores = ref(false);

// Sort fields configuration
const sortFields = [
  {key: 'protein', label: 'Protein', icon: 'ti ti-meat'},
  {key: 'fat', label: 'Fat', icon: 'ti ti-droplet'},
  {key: 'carbs', label: 'Carbs', icon: 'ti ti-grain'},
  {key: 'energy', label: 'Energy', icon: 'ti ti-flame'},
  {key: 'protein_fat_index', label: 'P/F Index', icon: 'ti ti-chart-line'}
];

// Quick filter presets
const quickPresets = [
  { label: 'High Protein', icon: 'ti ti-meat', filters: { proteinMin: 20 } },
  { label: 'Low Fat', icon: 'ti ti-droplet-off', filters: { fatMax: 5 } },
  { label: 'Low Carb', icon: 'ti ti-leaf', filters: { carbsMax: 10 } },
  { label: 'Low Cal', icon: 'ti ti-flame-off', filters: { energyMax: 100 } }
];

// Store presets loaded from JSON configuration
const storePresets = storePresetsConfig;

// Debounce helper
let filterTimeout = null;
function debouncedEmitFilters() {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    emitFilters();
  }, 300);
}

// Watch for external changes
watch(() => props.filters, (newFilters) => {
  localFilters.value = {
    search: '',
    brands: [],
    categories: [],
    stores: [],
    proteinMin: '',
    proteinMax: '',
    fatMin: '',
    fatMax: '',
    carbsMin: '',
    carbsMax: '',
    energyMin: '',
    energyMax: '',
    ...newFilters
  };
}, {deep: true});

watch(() => props.sort, (newSort) => {
  if (newSort && newSort.length > 0) {
    selectedSortField.value = newSort[0].field;
    sortDirection.value = newSort[0].direction;
  } else {
    selectedSortField.value = '';
    sortDirection.value = 'desc';
  }
}, {deep: true});

watch(() => props.availableBrands, (newBrands) => {
  brandsOptions.value = [...newBrands];
});

watch(() => props.availableCategories, (newCategories) => {
  categoriesOptions.value = [...newCategories];
});

watch(() => props.availableStores, (newStores) => {
  storesOptions.value = [...newStores];
});

function toggleSection(section) {
  collapsed.value[section] = !collapsed.value[section];
}

function emitFilters() {
  emit('update:filters', {...localFilters.value});
}

function updateSort() {
  if (selectedSortField.value) {
    emit('update:sort', [{field: selectedSortField.value, direction: sortDirection.value}]);
  } else {
    emit('update:sort', []);
  }
}

function toggleSortDirection() {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  updateSort();
}

function getSortFieldLabel(key) {
  const field = sortFields.find(f => f.key === key);
  return field ? field.label : key;
}

// Quick preset functions
function isPresetActive(preset) {
  for (const [key, value] of Object.entries(preset.filters)) {
    if (localFilters.value[key] !== value && localFilters.value[key] !== String(value)) {
      return false;
    }
  }
  return true;
}

function togglePreset(preset) {
  if (isPresetActive(preset)) {
    // Remove preset filters
    for (const key of Object.keys(preset.filters)) {
      localFilters.value[key] = '';
    }
  } else {
    // Apply preset filters
    for (const [key, value] of Object.entries(preset.filters)) {
      localFilters.value[key] = value;
    }
  }
  emitFilters();
}

// Store preset functions
function isStoreSelected(presetName) {
  if (!localFilters.value.stores || localFilters.value.stores.length === 0) {
    return false;
  }

  return localFilters.value.stores.some(s => {
    const store = typeof s === 'object' ? s.store : s;
    return store && store.toLowerCase().includes(presetName.toLowerCase());
  });
}

function toggleStorePreset(presetName) {
  const availablePresetStores = storesOptions.value.filter(option =>
      option.store && option.store.toLowerCase().includes(presetName.toLowerCase())
  );

  if (availablePresetStores.length === 0) {
    return;
  }

  const hasAnySelected = localFilters.value.stores.some(s => {
    const store = typeof s === 'object' ? s.store : s;
    return store && store.toLowerCase().includes(presetName.toLowerCase());
  });

  if (hasAnySelected) {
    localFilters.value.stores = localFilters.value.stores.filter(s => {
      const store = typeof s === 'object' ? s.store : s;
      return !(store && store.toLowerCase().includes(presetName.toLowerCase()));
    });
  } else {
    const currentStoreIds = new Set(
        localFilters.value.stores.map(s => (typeof s === 'object' ? s.id : s))
    );

    const storesToAdd = availablePresetStores.filter(
        store => !currentStoreIds.has(store.id)
    );

    localFilters.value.stores = [...localFilters.value.stores, ...storesToAdd];
  }

  emitFilters();
}

// Search functions with debounce
let brandSearchTimeout = null;
let categorySearchTimeout = null;
let storeSearchTimeout = null;

async function searchBrands(query) {
  clearTimeout(brandSearchTimeout);
  brandSearchTimeout = setTimeout(async () => {
    isLoadingBrands.value = true;
    try {
      brandsOptions.value = await getUniqueBrands(query);
    } catch (error) {
      console.error('Error searching brands:', error);
    } finally {
      isLoadingBrands.value = false;
    }
  }, 300);
}

async function searchCategories(query) {
  clearTimeout(categorySearchTimeout);
  categorySearchTimeout = setTimeout(async () => {
    isLoadingCategories.value = true;
    try {
      categoriesOptions.value = await getUniqueCategories(query);
    } catch (error) {
      console.error('Error searching categories:', error);
    } finally {
      isLoadingCategories.value = false;
    }
  }, 300);
}

async function searchStores(query) {
  clearTimeout(storeSearchTimeout);
  storeSearchTimeout = setTimeout(async () => {
    isLoadingStores.value = true;
    try {
      storesOptions.value = await getUniqueStores(query);
    } catch (error) {
      console.error('Error searching stores:', error);
    } finally {
      isLoadingStores.value = false;
    }
  }, 300);
}
</script>

<style scoped>
.filter-bar {
  font-size: 0.9rem;
}

.filter-section {
  border: 1px solid rgba(98, 105, 118, 0.16);
  border-radius: 4px;
  position: relative;
}

.filter-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(98, 105, 118, 0.04);
  cursor: pointer;
  font-weight: 500;
  user-select: none;
  transition: background-color 0.15s;
}

.filter-section-header:hover {
  background: rgba(98, 105, 118, 0.08);
}

.filter-section-body {
  padding: 0.75rem;
  border-top: 1px solid rgba(98, 105, 118, 0.16);
}

/* Multiselect styles - Enhanced for visibility */
:deep(.multiselect) {
  min-height: 42px;
  font-size: 0.9rem;
}

:deep(.multiselect__tags) {
  min-height: 42px;
  border: 1px solid #d9dbde;
  border-radius: 6px;
  padding: 6px 40px 4px 8px;
  background: #fff;
}

:deep(.multiselect__tags:focus-within) {
  border-color: #206bc4;
  box-shadow: 0 0 0 0.2rem rgba(32, 107, 196, 0.25);
}

:deep(.multiselect__tag) {
  background: #206bc4;
  color: #fff;
  padding: 4px 26px 4px 10px;
  margin-right: 6px;
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

:deep(.multiselect__tag-icon) {
  width: 22px;
  line-height: 22px;
}

:deep(.multiselect__tag-icon:after) {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

:deep(.multiselect__tag-icon:hover) {
  background: #1a569d;
}

:deep(.multiselect__tag-icon:hover:after) {
  color: #fff;
}

:deep(.multiselect__select) {
  height: 40px;
  width: 40px;
}

:deep(.multiselect__select:before) {
  border-color: #666 transparent transparent transparent;
}

:deep(.multiselect__content-wrapper) {
  border: 1px solid #d9dbde;
  border-radius: 6px;
  margin-top: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 250px;
  background: #fff;
  z-index: 9999 !important;
  position: absolute;
  width: 100%;
}

:deep(.multiselect__option) {
  padding: 10px 12px;
  min-height: 40px;
  font-size: 0.9rem;
  line-height: 1.4;
  display: flex;
  align-items: center;
}

:deep(.multiselect__option--highlight) {
  background: #206bc4;
  color: #fff;
}

:deep(.multiselect__option--selected) {
  background: #e8f4fd;
  color: #206bc4;
  font-weight: 600;
}

:deep(.multiselect__option--selected.multiselect__option--highlight) {
  background: #1a569d;
  color: #fff;
}

:deep(.multiselect__input) {
  border: none;
  padding: 4px 0;
  font-size: 0.9rem;
  margin-bottom: 4px;
}

:deep(.multiselect__placeholder) {
  color: #929dab;
  padding-top: 6px;
  font-size: 0.9rem;
}

:deep(.multiselect__spinner) {
  height: 38px;
}

:deep(.multiselect--active .multiselect__tags) {
  border-color: #206bc4;
}

/* Empty state */
:deep(.multiselect__option--disabled) {
  background: #f8f9fa;
  color: #929dab;
}

/* Loading state */
:deep(.multiselect__loading) {
  background: rgba(255, 255, 255, 0.8);
}

/* Form control sizing */
.form-control-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

/* Badge styling */
.badge {
  font-size: 0.7rem;
  padding: 0.2em 0.5em;
}
</style>
