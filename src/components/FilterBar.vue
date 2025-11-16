<template>
  <div class="row g-3">
    <div class="col-md-12">
      <label class="form-label">
        <i class="ti ti-search me-1"></i>
        Search
      </label>
      <input
          v-model="localFilters.search"
          type="text"
          class="form-control"
          placeholder="Search by name..."
          @input="emitFilters"
      />
    </div>

    <div class="col-md-12">
      <label class="form-label">
        <i class="ti ti-tag me-1"></i>
        Brands
      </label>
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

    <div class="col-md-12">
      <label class="form-label">
        <i class="ti ti-category me-1"></i>
        Categories
      </label>
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

    <div class="col-md-12">
      <label class="form-label">
        <i class="ti ti-building-store me-1"></i>
        Stores
      </label>
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
    </div>

    <!-- Sorting Section -->
    <div class="col-md-12">
      <label class="form-label">
        <i class="ti ti-sort-ascending me-1"></i>
        Sort By
      </label>
      <div class="d-flex flex-column gap-2">
        <button
            v-for="field in sortFields"
            :key="field.key"
            class="btn btn-outline w-100 d-flex justify-content-between align-items-center"
            :class="{'active': localSort.field === field.key}"
            @click="toggleSort(field.key)"
        >
          <span>
            <i :class="field.icon" class="me-1"></i>
            {{ field.label }}
          </span>
          <i
              v-if="localSort.field === field.key && localSort.direction === 'asc'"
              class="ti ti-arrow-up"
          ></i>
          <i
              v-else-if="localSort.field === field.key && localSort.direction === 'desc'"
              class="ti ti-arrow-down"
          ></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, watch} from 'vue';
import Multiselect from 'vue-multiselect';
import 'vue-multiselect/dist/vue-multiselect.css';
import {useDatabase} from '../composables/useDatabase';

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
    type: Object,
    default: () => ({ field: null, direction: null })
  }
});

const emit = defineEmits(['update:filters', 'update:sort', 'reset']);

const {getUniqueBrands, getUniqueCategories, getUniqueStores} = useDatabase();

const localFilters = ref({...props.filters});
const localSort = ref({...props.sort});
const brandsOptions = ref([...props.availableBrands]);
const categoriesOptions = ref([...props.availableCategories]);
const storesOptions = ref([...props.availableStores]);
const isLoadingBrands = ref(false);
const isLoadingCategories = ref(false);
const isLoadingStores = ref(false);

// Sort fields configuration
const sortFields = [
  { key: 'fat', label: 'Fat', icon: 'ti ti-droplet' },
  { key: 'carbs', label: 'Carbs', icon: 'ti ti-grain' },
  { key: 'protein', label: 'Protein', icon: 'ti ti-barbell' },
  { key: 'protein_fat_index', label: 'Protein/Fat Index', icon: 'ti ti-chart-line' }
];

watch(() => props.filters, (newFilters) => {
  localFilters.value = {...newFilters};
}, {deep: true});

watch(() => props.sort, (newSort) => {
  localSort.value = {...newSort};
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

function emitFilters() {
  emit('update:filters', {...localFilters.value});
}

function toggleSort(field) {
  // Cycle through: none → asc → desc → none
  if (localSort.value.field !== field) {
    // New field selected, start with ascending
    localSort.value = { field, direction: 'asc' };
  } else if (localSort.value.direction === 'asc') {
    // Switch to descending
    localSort.value = { field, direction: 'desc' };
  } else {
    // Clear sorting
    localSort.value = { field: null, direction: null };
  }

  emit('update:sort', {...localSort.value});
}

// Debounce helper
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
/* Tabler handles most styling */
:deep(.multiselect) {
  min-height: 38px;
}

:deep(.multiselect__tags) {
  min-height: 38px;
  border: 1px solid #d9dbde;
  border-radius: 4px;
  padding: 4px 40px 0 8px;
}

:deep(.multiselect__tag) {
  background: #206bc4;
  margin-bottom: 4px;
}

:deep(.multiselect__tag-icon:hover) {
  background: #1a569d;
}

:deep(.multiselect__option--highlight) {
  background: #206bc4;
}

:deep(.multiselect__input) {
  border: none;
  padding: 4px 0;
}

:deep(.multiselect__placeholder) {
  color: #6c757d;
  padding-top: 4px;
}
</style>
