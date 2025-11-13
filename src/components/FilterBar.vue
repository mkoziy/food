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
  }
});

const emit = defineEmits(['update:filters', 'reset']);

const {getUniqueBrands, getUniqueCategories, getUniqueStores} = useDatabase();

const localFilters = ref({...props.filters});
const brandsOptions = ref([...props.availableBrands]);
const categoriesOptions = ref([...props.availableCategories]);
const storesOptions = ref([...props.availableStores]);
const isLoadingBrands = ref(false);
const isLoadingCategories = ref(false);
const isLoadingStores = ref(false);

watch(() => props.filters, (newFilters) => {
  localFilters.value = {...newFilters};
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
