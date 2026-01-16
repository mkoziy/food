<template>
  <div id="app">
    <LoadingState v-if="loading" :message="loadingMessage"/>

    <!-- Navbar -->
    <header class="navbar navbar-expand-md navbar-light d-print-none">
      <div class="container-xl">
        <h1 class="navbar-brand navbar-brand-autodark d-none-navbar-horizontal pe-0 pe-md-3">
          <a href="#">
            <span class="navbar-brand-image"></span>
            <span class="d-none d-sm-inline">OpenFoodFacts Germany</span>
            <span class="d-sm-none">OpenFoodFacts Germany</span>
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
                  <span class="d-none d-sm-inline">{{ loading ? loadingMessage : 'Load Database' }}</span>
                  <span class="d-sm-none">{{ loading ? 'Loading...' : 'Load' }}</span>
                </button>
                <button
                    v-if="dbStats.count > 0"
                    class="btn btn-outline-danger"
                    @click="handleClearDatabase"
                    :disabled="loading"
                >
                  <i class="ti ti-trash"></i>
                  <span class="d-none d-sm-inline">Clear Data</span>
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
            <!-- Mobile Filter Toggle & Stats Bar -->
            <div class="col-12 d-lg-none mb-3">
              <div class="card">
                <div class="card-body py-2">
                  <div class="d-flex align-items-center justify-content-between">
                    <button
                        class="btn btn-primary"
                        @click="showMobileFilters = true"
                    >
                      <i class="ti ti-filter me-1"></i>
                      Filters
                      <span v-if="activeFilterCount > 0" class="badge bg-white text-primary ms-1">
                        {{ activeFilterCount }}
                      </span>
                    </button>
                    <div class="d-flex align-items-center gap-3">
                      <div class="text-center">
                        <div class="text-muted small">Total</div>
                        <div class="fw-bold">{{ dbStats.count.toLocaleString() }}</div>
                      </div>
                      <div class="text-center">
                        <div class="text-muted small">Filtered</div>
                        <div class="fw-bold">{{ totalCount.toLocaleString() }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mobile Filters Offcanvas -->
            <div
                class="offcanvas offcanvas-start"
                :class="{ show: showMobileFilters }"
                tabindex="-1"
                @click.self="showMobileFilters = false"
            >
              <div class="offcanvas-header">
                <h5 class="offcanvas-title">
                  <i class="ti ti-filter me-2"></i>
                  Filters
                </h5>
                <button type="button" class="btn-close" @click="showMobileFilters = false"></button>
              </div>
              <div class="offcanvas-body">
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
                <div class="d-grid gap-2 mt-3">
                  <button class="btn btn-primary" @click="showMobileFilters = false">
                    <i class="ti ti-check me-1"></i>
                    Apply Filters
                  </button>
                  <button class="btn btn-outline-secondary" @click="resetFilters(); showMobileFilters = false">
                    <i class="ti ti-refresh me-1"></i>
                    Reset All
                  </button>
                </div>
              </div>
            </div>
            <div
                v-if="showMobileFilters"
                class="offcanvas-backdrop fade show"
                @click="showMobileFilters = false"
            ></div>

            <!-- Filters Sidebar (Desktop) -->
            <div class="col-lg-3 mb-3 d-none d-lg-block">
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

              <!-- Stats Cards (Desktop) -->
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
                <div class="card-header flex-column flex-sm-row">
                  <h3 class="card-title mb-2 mb-sm-0">
                    <span class="d-none d-sm-inline">Products ({{ displayedProducts.length }} of {{ totalCount.toLocaleString() }})</span>
                    <span class="d-sm-none">{{ totalCount.toLocaleString() }} Products</span>
                  </h3>
                  <div class="card-actions w-100 w-sm-auto">
                    <div class="d-flex align-items-center justify-content-between justify-content-sm-end gap-2 flex-wrap">
                      <!-- View Mode Toggle -->
                      <div class="btn-group">
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
                      <!-- Page Size -->
                      <div class="d-flex align-items-center gap-1">
                        <select
                            class="form-select form-select-sm"
                            :value="itemsPerPage"
                            @change="changePageSize(Number($event.target.value))"
                            style="width: auto;"
                        >
                          <option v-for="size in pageSizeOptions" :key="size" :value="size">
                            {{ size }}
                          </option>
                        </select>
                        <span class="text-muted small d-none d-sm-inline">per page</span>
                      </div>
                      <!-- Pagination -->
                      <div class="d-flex align-items-center gap-1 gap-sm-2">
                        <button
                            class="btn btn-sm btn-outline-primary"
                            @click="previousPage"
                            :disabled="currentPage === 1"
                        >
                          <i class="ti ti-chevron-left"></i>
                          <span class="d-none d-md-inline">Previous</span>
                        </button>
                        <span class="text-muted small">
                          {{ currentPage }}/{{ totalPages }}
                        </span>
                        <button
                            class="btn btn-sm btn-outline-primary"
                            @click="nextPage"
                            :disabled="currentPage >= totalPages"
                        >
                          <span class="d-none d-md-inline">Next</span>
                          <i class="ti ti-chevron-right"></i>
                        </button>
                      </div>
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
import {ref, computed, onMounted, onUnmounted, watch} from 'vue';
import {useDatabase} from './composables/useDatabase';
import {
  hasUrlParams,
  parseUrlParams,
  updateUrl,
  setupHistoryListener,
  resolveIdsToObjects,
  clearUrlParams
} from './composables/useUrlState';
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
const STORAGE_KEY_PAGE_SIZE = 'food-app-page-size';

// Page size options
const pageSizeOptions = [20, 50, 100, 200];

// State
const displayedProducts = ref([]);
const viewMode = ref('grid');
const showMobileFilters = ref(false);
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

// Load saved page size from localStorage
function loadSavedPageSize() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PAGE_SIZE);
    if (saved) {
      const size = parseInt(saved, 10);
      if (pageSizeOptions.includes(size)) {
        return size;
      }
    }
    return 50; // Default
  } catch (error) {
    console.error('Error loading saved page size:', error);
    return 50;
  }
}

const sort = ref(loadSavedSort());
const currentPage = ref(1);
const totalPages = ref(0);
const totalCount = ref(0);
const itemsPerPage = ref(loadSavedPageSize());
const availableBrands = ref([]);
const availableCategories = ref([]);
const availableStores = ref([]);

// URL state management
let pendingUrlState = null;
let cleanupHistoryListener = null;

// Computed
const activeFilterCount = computed(() => {
  let count = 0;
  if (filters.value.search) count++;
  if (filters.value.brands.length) count++;
  if (filters.value.categories.length) count++;
  if (filters.value.stores.length) count++;
  if (filters.value.proteinMin || filters.value.proteinMax) count++;
  if (filters.value.fatMin || filters.value.fatMax) count++;
  if (filters.value.carbsMin || filters.value.carbsMax) count++;
  if (filters.value.energyMin || filters.value.energyMax) count++;
  if (sort.value.length) count++;
  return count;
});

// Methods
async function loadFilterOptions() {
  availableBrands.value = await getUniqueBrands();
  availableCategories.value = await getUniqueCategories();
  availableStores.value = await getUniqueStores();
}

async function applyFilters(newFilters, skipUrlUpdate = false) {
  if (newFilters) {
    filters.value = {...newFilters};
  }

  // Reset to first page when filters change
  currentPage.value = 1;
  await loadProducts();

  // Update URL with current state
  if (!skipUrlUpdate) {
    updateUrl(getCurrentState(), true);
  }
}

async function applySort(newSort, skipUrlUpdate = false) {
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

  // Update URL with current state
  if (!skipUrlUpdate) {
    updateUrl(getCurrentState(), true);
  }
}

async function loadProducts() {
  const result = await queryProducts(filters.value, currentPage.value, itemsPerPage.value, sort.value);

  displayedProducts.value = result.products;
  totalCount.value = result.totalCount;
  totalPages.value = result.totalPages;
}

async function changePageSize(newSize) {
  itemsPerPage.value = newSize;
  currentPage.value = 1; // Reset to first page
  try {
    localStorage.setItem(STORAGE_KEY_PAGE_SIZE, String(newSize));
  } catch (error) {
    console.error('Error saving page size:', error);
  }
  await loadProducts();
  updateUrl(getCurrentState(), true);
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
  // Clear URL params
  clearUrlParams();
  applyFilters(null, true); // Skip URL update since we already cleared
}

async function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    await loadProducts();
    updateUrl(getCurrentState(), false); // pushState for back button
  }
}

async function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    await loadProducts();
    updateUrl(getCurrentState(), false); // pushState for back button
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
    clearUrlParams();
  }
}

/**
 * Get current app state for URL serialization
 */
function getCurrentState() {
  return {
    filters: filters.value,
    sort: sort.value,
    page: currentPage.value,
    pageSize: itemsPerPage.value,
    viewMode: viewMode.value
  };
}

/**
 * Apply parsed URL state to app after filter options are loaded
 */
function applyUrlState(urlState) {
  // Resolve IDs to full objects
  if (urlState.brandIds) {
    filters.value.brands = resolveIdsToObjects(urlState.brandIds, availableBrands.value);
  }
  if (urlState.categoryIds) {
    filters.value.categories = resolveIdsToObjects(urlState.categoryIds, availableCategories.value);
  }
  if (urlState.storeIds) {
    filters.value.stores = resolveIdsToObjects(urlState.storeIds, availableStores.value);
  }

  // Apply simple values
  if (urlState.search !== undefined) {
    filters.value.search = urlState.search;
  }
  if (urlState.proteinMin !== undefined && urlState.proteinMin !== '') {
    filters.value.proteinMin = urlState.proteinMin;
  }
  if (urlState.proteinMax !== undefined && urlState.proteinMax !== '') {
    filters.value.proteinMax = urlState.proteinMax;
  }
  if (urlState.fatMin !== undefined && urlState.fatMin !== '') {
    filters.value.fatMin = urlState.fatMin;
  }
  if (urlState.fatMax !== undefined && urlState.fatMax !== '') {
    filters.value.fatMax = urlState.fatMax;
  }
  if (urlState.carbsMin !== undefined && urlState.carbsMin !== '') {
    filters.value.carbsMin = urlState.carbsMin;
  }
  if (urlState.carbsMax !== undefined && urlState.carbsMax !== '') {
    filters.value.carbsMax = urlState.carbsMax;
  }
  if (urlState.energyMin !== undefined && urlState.energyMin !== '') {
    filters.value.energyMin = urlState.energyMin;
  }
  if (urlState.energyMax !== undefined && urlState.energyMax !== '') {
    filters.value.energyMax = urlState.energyMax;
  }

  // Apply sort
  if (urlState.sort && urlState.sort.length > 0) {
    sort.value = urlState.sort;
  }

  // Apply pagination
  if (urlState.page) {
    currentPage.value = urlState.page;
  }
  if (urlState.pageSize && pageSizeOptions.includes(urlState.pageSize)) {
    itemsPerPage.value = urlState.pageSize;
  }

  // Apply view mode
  if (urlState.viewMode) {
    viewMode.value = urlState.viewMode;
  }
}

/**
 * Handle browser back/forward navigation
 */
async function handleHistoryNavigation(urlState) {
  // Apply the URL state
  applyUrlState(urlState);

  // Reload products with new state
  await loadProducts();
}

async function initializeApp() {
  // Parse URL params first (get IDs before DB loads)
  if (hasUrlParams()) {
    pendingUrlState = parseUrlParams();
  }

  await updateStats();

  // If no data in memory, check cache and auto-load
  if (!(await hasData())) {
    try {
      // Try to load from cache automatically
      await loadData();
      await loadFilterOptions();

      // Apply URL state if present, after filter options are loaded
      if (pendingUrlState) {
        applyUrlState(pendingUrlState);
        pendingUrlState = null;
        await loadProducts();
      } else {
        await applyFilters(null, true); // Skip URL update on initial load
      }
    } catch (error) {
      // Cache doesn't exist or error loading - user needs to click "Load Database"
      console.log('No cached database found, waiting for user to load');
    }
  } else {
    // Data already in memory, just load UI
    await loadFilterOptions();

    // Apply URL state if present
    if (pendingUrlState) {
      applyUrlState(pendingUrlState);
      pendingUrlState = null;
    }
    await loadProducts();
  }

  // Set up history listener for back/forward navigation
  cleanupHistoryListener = setupHistoryListener(handleHistoryNavigation);
}

// Watch viewMode to update URL
watch(viewMode, () => {
  updateUrl(getCurrentState(), true);
});

// Lifecycle
onMounted(() => {
  initializeApp();
});

onUnmounted(() => {
  if (cleanupHistoryListener) {
    cleanupHistoryListener();
  }
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

/* Mobile Offcanvas Styles */
.offcanvas {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 320px;
  max-width: 85vw;
  background: #fff;
  z-index: 1050;
  transform: translateX(-100%);
  transition: transform 0.3s ease-in-out;
  display: flex;
  flex-direction: column;
}

.offcanvas.show {
  transform: translateX(0);
}

.offcanvas-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid rgba(98, 105, 118, 0.16);
}

.offcanvas-title {
  margin: 0;
  font-size: 1.125rem;
}

.offcanvas-body {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.offcanvas-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(24, 36, 51, 0.5);
  z-index: 1040;
}

/* Mobile card header layout */
@media (max-width: 575.98px) {
  .card-header.flex-column {
    align-items: stretch !important;
  }

  .card-header .card-actions {
    margin-top: 0.5rem;
  }

  .w-sm-auto {
    width: auto !important;
  }

  /* Smaller padding on mobile */
  .card-body {
    padding: 0.75rem;
  }

  .container-xl {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  /* Fix navbar on mobile */
  .navbar {
    padding: 0.5rem 0;
  }

  .navbar-brand {
    font-size: 1rem;
  }

  .btn-list {
    gap: 0.25rem;
  }
}

/* Tablet adjustments */
@media (max-width: 991.98px) {
  .page-body {
    padding-top: 0.5rem;
  }
}

/* Ensure offcanvas dropdowns work */
.offcanvas .multiselect__content-wrapper {
  position: relative !important;
  z-index: 1 !important;
}

.offcanvas .filter-section {
  overflow: visible !important;
}

/* Hide body scroll when offcanvas is open */
body.offcanvas-open {
  overflow: hidden;
}
</style>
