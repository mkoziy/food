<template>
  <div id="app">
    <LoadingState v-if="loading" :message="loadingMessage"/>

    <!-- Navbar -->
    <header class="navbar navbar-expand-md navbar-light d-print-none">
      <div class="container-xl">
        <h1 class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
          <a href="#">
            <span class="navbar-brand-image"></span>
            OpenFoodFacts Germany
          </a>
        </h1>
        <div class="navbar-nav flex-row order-md-last">
          <div class="d-flex align-items-center">
            <div class="col-auto ms-auto d-print-none">
              <div class="btn-list">
                <button
                    class="btn btn-primary"
                    @click="handleLoadData"
                    :disabled="loading"
                >
                  <i v-if="!loading" class="ti ti-download"></i>
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  {{ loading ? loadingMessage : 'Load Database' }}
                </button>
                <button
                    v-if="dbStats.count > 0"
                    class="btn btn-outline-danger"
                    @click="handleClearDatabase"
                    :disabled="loading"
                >
                  <i class="ti ti-trash"></i>
                  Clear Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Page wrapper -->
    <div class="page-wrapper">

      <!-- Page body -->
      <div class="page-body">
        <div class="container-xl">
          <div class="row">
            <!-- Filters Sidebar -->
            <div class="col-lg-3 mb-3">
              <div class="card sticky-top" style="top: 1rem;">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="ti ti-filter me-2"></i>
                    Filters
                  </h3>
                  <div class="card-actions">
                    <button class="btn btn-outline" @click="resetFilters">
                      <i class="ti ti-refresh"></i>
                      Reset
                    </button>
                  </div>
                </div>
                <div class="card-body">
                  <FilterBar
                      :filters="filters"
                      :sort="sort"
                      :available-brands="availableBrands"
                      :available-categories="availableCategories"
                      :available-stores="availableStores"
                      @update:filters="applyFilters"
                      @update:sort="applySort"
                      @reset="resetFilters"
                  />
                </div>
              </div>

              <!-- Stats Cards -->
              <div class="row row-cards mt-3">
                <div class="col-12">
                  <div class="card">
                    <div class="card-body">
                      <div class="subheader">Total Products</div>
                      <div class="h1 mb-0">{{ dbStats.count.toLocaleString() }}</div>
                    </div>
                  </div>
                </div>
                <div class="col-12">
                  <div class="card">
                    <div class="card-body">
                      <div class="subheader">Filtered Results</div>
                      <div class="h1 mb-0">{{ totalCount.toLocaleString() }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Products Main Content -->
            <div class="col-lg-9">
              <div class="card mb-3">
                <div class="card-header">
                  <h3 class="card-title">
                    Products ({{ displayedProducts.length }} of {{ totalCount.toLocaleString() }})
                  </h3>
                  <div class="card-actions">
                    <div class="d-flex align-items-center gap-2">
                      <!-- View Mode Toggle -->
                      <div class="btn-group me-2">
                        <button
                            class="btn btn-sm"
                            :class="viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'"
                            @click="viewMode = 'grid'"
                            title="Grid View"
                        >
                          <i class="ti ti-grid-dots"></i>
                        </button>
                        <button
                            class="btn btn-sm"
                            :class="viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'"
                            @click="viewMode = 'list'"
                            title="List View"
                        >
                          <i class="ti ti-list"></i>
                        </button>
                      </div>
                      <button
                          class="btn btn-outline-primary"
                          @click="previousPage"
                          :disabled="currentPage === 1"
                      >
                        <i class="ti ti-chevron-left"></i>
                        Previous
                      </button>
                      <span class="text-muted">
                        Page {{ currentPage }} of {{ totalPages }}
                      </span>
                      <button
                          class="btn btn-outline-primary"
                          @click="nextPage"
                          :disabled="currentPage >= totalPages"
                      >
                        Next
                        <i class="ti ti-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="card-body">
                  <ProductCardsList :products="displayedProducts" :view-mode="viewMode"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="footer footer-transparent d-print-none">
        <div class="container-xl">
          <div class="row text-center align-items-center">
            <div class="col-12 col-lg-auto mt-3 mt-lg-0">
              <ul class="list-inline list-inline-dots mb-0">
                <li class="list-inline-item">
                  Powered by OpenFoodFacts data
                </li>
                <li class="list-inline-item">
                  <a href="https://github.com/mkoziy/food" target="_blank" rel="noopener noreferrer" class="link-muted align-items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="me-1" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.7.5.9 5.3.9 11.6c0 4.7 3 8.7 7.2 10.1.5.1.7-.2.7-.5v-1.9c-2.9.6-3.5-1.4-3.5-1.4-.5-1.2-1.2-1.6-1.2-1.6-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1 1.6.7 1.9 1.2.1-.8.4-1.4.8-1.8-2.3-.3-4.7-1.2-4.7-5.3 0-1.2.4-2.1 1.1-2.8-.1-.3-.5-1.5.1-3.1 0 0 .9-.3 3 .1.9-.3 1.8-.4 2.7-.4s1.8.1 2.7.4c2.1-.4 3-.1 3-.1.6 1.6.2 2.8.1 3.1.7.7 1.1 1.6 1.1 2.8 0 4.1-2.4 5-4.7 5.3.4.3.8 1.1.8 2.2v3.2c0 .3.2.6.7.5 4.2-1.4 7.2-5.4 7.2-10.1C23.1 5.3 18.3.5 12 .5z"/></svg>
                    Source on GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue';
import {useDatabase} from './composables/useDatabase';
import FilterBar from './components/FilterBar.vue';
import LoadingState from './components/LoadingState.vue';
import ProductCardsList from "./components/ProductCardsList.vue";

// Database composable
const {
  loading,
  loadingMessage,
  dbStats,
  loadData,
  clearDatabase,
  updateStats,
  queryProducts,
  getUniqueBrands,
  getUniqueCategories,
  getUniqueStores,
  hasData
} = useDatabase();

// LocalStorage keys
const STORAGE_KEY_SORT = 'food-app-sort';

// State
const displayedProducts = ref([]);
const viewMode = ref('grid');
const filters = ref({
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
});

// Load saved sort from localStorage
function loadSavedSort() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SORT);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading saved sort:', error);
    return [];
  }
}

const sort = ref(loadSavedSort());
const currentPage = ref(1);
const totalPages = ref(0);
const totalCount = ref(0);
const itemsPerPage = 21;
const availableBrands = ref([]);
const availableCategories = ref([]);
const availableStores = ref([]);

// Methods
async function loadFilterOptions() {
  availableBrands.value = await getUniqueBrands();
  availableCategories.value = await getUniqueCategories();
  availableStores.value = await getUniqueStores();
}

async function applyFilters(newFilters) {
  if (newFilters) {
    filters.value = {...newFilters};
  }

  // Reset to first page when filters change
  currentPage.value = 1;
  await loadProducts();
}

async function applySort(newSort) {
  if (newSort) {
    sort.value = [...newSort];
    // Save sort to localStorage
    try {
      localStorage.setItem(STORAGE_KEY_SORT, JSON.stringify(newSort));
    } catch (error) {
      console.error('Error saving sort:', error);
    }
  }

  // Reset to first page when sort changes
  currentPage.value = 1;
  await loadProducts();
}

async function loadProducts() {
  const result = await queryProducts(filters.value, currentPage.value, itemsPerPage, sort.value);

  displayedProducts.value = result.products;
  totalCount.value = result.totalCount;
  totalPages.value = result.totalPages;
}

function resetFilters() {
  filters.value = {
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
  };
  sort.value = [];
  // Clear saved sort from localStorage
  try {
    localStorage.removeItem(STORAGE_KEY_SORT);
  } catch (error) {
    console.error('Error clearing saved sort:', error);
  }
  applyFilters();
}

async function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    await loadProducts();
  }
}

async function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    await loadProducts();
  }
}

async function handleLoadData() {
  try {
    await loadData();
    await loadFilterOptions();
    await applyFilters();
  } catch (error) {
    alert('Error loading data: ' + error.message);
  }
}

async function handleClearDatabase() {
  const cleared = await clearDatabase();
  if (cleared) {
    displayedProducts.value = [];
    totalCount.value = 0;
    totalPages.value = 1;
    availableBrands.value = [];
    availableCategories.value = [];
  }
}

async function initializeApp() {
  await updateStats();

  // If no data in memory, check cache and auto-load
  if (!(await hasData())) {
    try {
      // Try to load from cache automatically
      await loadData();
      await loadFilterOptions();
      await applyFilters();
    } catch (error) {
      // Cache doesn't exist or error loading - user needs to click "Load Database"
      console.log('No cached database found, waiting for user to load');
    }
  } else {
    // Data already in memory, just load UI
    await loadFilterOptions();
    await loadProducts();
  }
}

// Lifecycle
onMounted(() => {
  initializeApp();
});
</script>

<style>
#app {
  min-height: 100vh;
}

/* Fix multiselect dropdown visibility in sidebar */
.col-lg-3 .card,
.col-lg-3 .card.sticky-top {
  overflow: visible !important;
}

.col-lg-3 .card-body {
  overflow: visible !important;
}

/* Ensure sidebar and dropdowns appear above other content */
.col-lg-3 {
  position: relative;
  z-index: 100;
}

/* Ensure filter sections don't clip dropdowns */
.col-lg-3 .filter-section {
  overflow: visible !important;
}

.col-lg-3 .filter-section-body {
  overflow: visible !important;
}
</style>
