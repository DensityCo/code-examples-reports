import fetchAllPages from './fetch-all-pages';
import objectSnakeToCamel from './object-snake-to-camel';

const CACHE = {};

function generateCacheKey(url, params, body) {
  return `${url} ${JSON.stringify(params)} ${JSON.stringify(body)}`;
}

export default async function fetchAllObjects(client, url, options) {
  const opts = {
    cache: true,
    cacheExpiryTimeMs: 5000,
    params: {},
    body: {},
    ...options,
  };

  const cacheKey = generateCacheKey(url, opts.params, opts.body);

  let responseData;
  if (opts.cache && CACHE[cacheKey]) {
    // Use cached value
    responseData = CACHE[cacheKey];
  } else {
    // Value not cached, make request and add to cache if cache should be used
    responseData = await fetchAllPages(async page => {
      const response = await client.get(url, {
        params: { ...opts.params, page, page_size: 5000 },
        paramsSerializer: opts.paramsSerializer,
      });
      return response.data;
    });
    if (opts.cache) {
      CACHE[cacheKey] = responseData;

      // After the specified amount of time, remove this entry from the cache
      setTimeout(() => {
        delete CACHE[cacheKey];
      }, opts.cacheExpiryTimeMs);
    }
  }

  if (opts.skipCamel) { return responseData; }
  return responseData.map(i => typeof i === 'object' ? objectSnakeToCamel(i) : i);
}

export async function fetchObject(client, url, options) {
  const opts = {
    cache: true,
    cacheExpiryTimeMs: 5000,
    params: {},
    body: {},
    ...options,
  };

  const cacheKey = generateCacheKey(url, opts.params, opts.body);

  let response;
  if (opts.cache && CACHE[cacheKey]) {
    // Use cached value
    response = CACHE[cacheKey];
  } else {
    // Value not cached, make request and add to cache if cache should be used
    response = await client.get(url, { params: opts.params });
    if (opts.cache) {
      CACHE[cacheKey] = response;

      // After the specified amount of time, remove this entry from the cache
      setTimeout(() => {
        delete CACHE[cacheKey];
      }, opts.cacheExpiryTimeMs);
    }
  }

  if (opts.skipCamel) { return response.data; }
  return typeof response.data === 'object' ? objectSnakeToCamel(response.data) : response.data;
}
