/**
 * URL State Management Composable
 * Enables shareable URLs by syncing filter/sort/pagination state to URL params
 */

// URL parameter mapping
const PARAM_MAP = {
  search: 'q',
  brands: 'brands',
  categories: 'categories',
  stores: 'stores',
  proteinMin: 'pmin',
  proteinMax: 'pmax',
  fatMin: 'fmin',
  fatMax: 'fmax',
  carbsMin: 'cmin',
  carbsMax: 'cmax',
  energyMin: 'emin',
  energyMax: 'emax',
  sort: 'sort',
  page: 'page',
  pageSize: 'size',
  viewMode: 'view'
};

/**
 * Check if URL has any filter/state parameters
 */
export function hasUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return Array.from(params.keys()).some(key =>
    Object.values(PARAM_MAP).includes(key)
  );
}

/**
 * Parse URL query string to state object
 * Returns IDs for brands/categories/stores (resolved later after DB loads)
 */
export function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const state = {};

  // Search
  if (params.has(PARAM_MAP.search)) {
    state.search = params.get(PARAM_MAP.search);
  }

  // ID arrays (brands, categories, stores)
  if (params.has(PARAM_MAP.brands)) {
    state.brandIds = parseIdList(params.get(PARAM_MAP.brands));
  }
  if (params.has(PARAM_MAP.categories)) {
    state.categoryIds = parseIdList(params.get(PARAM_MAP.categories));
  }
  if (params.has(PARAM_MAP.stores)) {
    state.storeIds = parseIdList(params.get(PARAM_MAP.stores));
  }

  // Nutrition ranges
  if (params.has(PARAM_MAP.proteinMin)) {
    state.proteinMin = parseNumber(params.get(PARAM_MAP.proteinMin));
  }
  if (params.has(PARAM_MAP.proteinMax)) {
    state.proteinMax = parseNumber(params.get(PARAM_MAP.proteinMax));
  }
  if (params.has(PARAM_MAP.fatMin)) {
    state.fatMin = parseNumber(params.get(PARAM_MAP.fatMin));
  }
  if (params.has(PARAM_MAP.fatMax)) {
    state.fatMax = parseNumber(params.get(PARAM_MAP.fatMax));
  }
  if (params.has(PARAM_MAP.carbsMin)) {
    state.carbsMin = parseNumber(params.get(PARAM_MAP.carbsMin));
  }
  if (params.has(PARAM_MAP.carbsMax)) {
    state.carbsMax = parseNumber(params.get(PARAM_MAP.carbsMax));
  }
  if (params.has(PARAM_MAP.energyMin)) {
    state.energyMin = parseNumber(params.get(PARAM_MAP.energyMin));
  }
  if (params.has(PARAM_MAP.energyMax)) {
    state.energyMax = parseNumber(params.get(PARAM_MAP.energyMax));
  }

  // Sort (format: "field:direction" or "field1:dir1,field2:dir2")
  if (params.has(PARAM_MAP.sort)) {
    state.sort = parseSortParam(params.get(PARAM_MAP.sort));
  }

  // Pagination
  if (params.has(PARAM_MAP.page)) {
    const page = parseInt(params.get(PARAM_MAP.page), 10);
    if (!isNaN(page) && page >= 1) {
      state.page = page;
    }
  }
  if (params.has(PARAM_MAP.pageSize)) {
    const size = parseInt(params.get(PARAM_MAP.pageSize), 10);
    if (!isNaN(size) && size > 0) {
      state.pageSize = size;
    }
  }

  // View mode
  if (params.has(PARAM_MAP.viewMode)) {
    const view = params.get(PARAM_MAP.viewMode);
    if (view === 'grid' || view === 'list') {
      state.viewMode = view;
    }
  }

  return state;
}

/**
 * Convert state to URL query string
 */
export function serializeToUrl(state) {
  const params = new URLSearchParams();

  // Search
  if (state.filters?.search) {
    params.set(PARAM_MAP.search, state.filters.search);
  }

  // ID arrays - extract IDs from objects
  if (state.filters?.brands?.length > 0) {
    const ids = state.filters.brands.map(b => typeof b === 'object' ? b.id : b);
    params.set(PARAM_MAP.brands, ids.join(','));
  }
  if (state.filters?.categories?.length > 0) {
    const ids = state.filters.categories.map(c => typeof c === 'object' ? c.id : c);
    params.set(PARAM_MAP.categories, ids.join(','));
  }
  if (state.filters?.stores?.length > 0) {
    const ids = state.filters.stores.map(s => typeof s === 'object' ? s.id : s);
    params.set(PARAM_MAP.stores, ids.join(','));
  }

  // Nutrition ranges - only include if not empty
  if (state.filters?.proteinMin !== '' && state.filters?.proteinMin != null) {
    params.set(PARAM_MAP.proteinMin, state.filters.proteinMin);
  }
  if (state.filters?.proteinMax !== '' && state.filters?.proteinMax != null) {
    params.set(PARAM_MAP.proteinMax, state.filters.proteinMax);
  }
  if (state.filters?.fatMin !== '' && state.filters?.fatMin != null) {
    params.set(PARAM_MAP.fatMin, state.filters.fatMin);
  }
  if (state.filters?.fatMax !== '' && state.filters?.fatMax != null) {
    params.set(PARAM_MAP.fatMax, state.filters.fatMax);
  }
  if (state.filters?.carbsMin !== '' && state.filters?.carbsMin != null) {
    params.set(PARAM_MAP.carbsMin, state.filters.carbsMin);
  }
  if (state.filters?.carbsMax !== '' && state.filters?.carbsMax != null) {
    params.set(PARAM_MAP.carbsMax, state.filters.carbsMax);
  }
  if (state.filters?.energyMin !== '' && state.filters?.energyMin != null) {
    params.set(PARAM_MAP.energyMin, state.filters.energyMin);
  }
  if (state.filters?.energyMax !== '' && state.filters?.energyMax != null) {
    params.set(PARAM_MAP.energyMax, state.filters.energyMax);
  }

  // Sort
  if (state.sort?.length > 0) {
    const sortStr = state.sort.map(s => `${s.field}:${s.direction}`).join(',');
    params.set(PARAM_MAP.sort, sortStr);
  }

  // Pagination - only include if not default
  if (state.page && state.page > 1) {
    params.set(PARAM_MAP.page, state.page);
  }
  if (state.pageSize && state.pageSize !== 50) {
    params.set(PARAM_MAP.pageSize, state.pageSize);
  }

  // View mode - only include if not default
  if (state.viewMode && state.viewMode !== 'grid') {
    params.set(PARAM_MAP.viewMode, state.viewMode);
  }

  return params.toString();
}

/**
 * Update browser URL without reload
 * @param {Object} state - Current app state
 * @param {boolean} replace - Use replaceState instead of pushState
 */
export function updateUrl(state, replace = true) {
  const queryString = serializeToUrl(state);
  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  // Don't pass state object to history API - it contains Vue reactives that can't be cloned
  // All state is encoded in the URL anyway, so we parse it on popstate
  if (replace) {
    window.history.replaceState(null, '', newUrl);
  } else {
    window.history.pushState(null, '', newUrl);
  }
}

/**
 * Set up history listener for back/forward navigation
 * @param {Function} callback - Called with parsed state when navigation occurs
 * @returns {Function} Cleanup function to remove listener
 */
export function setupHistoryListener(callback) {
  const handler = (event) => {
    // Parse URL params on navigation
    const state = parseUrlParams();
    callback(state, event.state);
  };

  window.addEventListener('popstate', handler);

  return () => {
    window.removeEventListener('popstate', handler);
  };
}

/**
 * Resolve IDs to full objects after DB loads
 * @param {number[]} ids - Array of IDs from URL
 * @param {Object[]} availableItems - Array of available items with id property
 * @param {string} idKey - Key name for ID (default: 'id')
 * @returns {Object[]} Array of matched objects
 */
export function resolveIdsToObjects(ids, availableItems, idKey = 'id') {
  if (!ids || !availableItems) return [];

  return ids
    .map(id => availableItems.find(item => item[idKey] === id))
    .filter(item => item != null);
}

// Helper functions

function parseIdList(str) {
  if (!str) return [];
  return str.split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n));
}

function parseNumber(str) {
  if (!str) return '';
  const num = parseFloat(str);
  return isNaN(num) ? '' : num;
}

function parseSortParam(str) {
  if (!str) return [];

  const validFields = ['name', 'protein', 'fat', 'carbs', 'energy', 'protein_fat_index'];
  const validDirections = ['asc', 'desc'];

  return str.split(',')
    .map(part => {
      const [field, direction] = part.split(':');
      if (validFields.includes(field) && validDirections.includes(direction?.toLowerCase())) {
        return { field, direction: direction.toLowerCase() };
      }
      return null;
    })
    .filter(s => s != null);
}

/**
 * Clear all URL parameters
 */
export function clearUrlParams() {
  window.history.replaceState({}, '', window.location.pathname);
}
