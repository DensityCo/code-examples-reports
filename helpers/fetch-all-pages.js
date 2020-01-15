// Fetch all pages of data, given a functino to fetch a single page.
//
// The `fetchSinglePage` function is passed a single argument, the page of data to fetch, and
// expected to resolve a core-api-like data response, which includes these keys:
// - `next`, which indicates if there is another page of data for the system to fetch.
// - `results`, which contains an array of data items that are contained within that data page.
// - `total`, which contains the total number of items in the response.
//
// Example call: fetchSinglePage(1)
// Example response: {next: 'https://api.density.io/v2/spaces?page=2', total: 18, results: [1, 2, 3, 4, 5]}
export default function fetchAllPages(fetchSinglePage) {
  const getPage = async function(page) {
    const data = await fetchSinglePage(page);

    // If endpoint just returns an array, don't try to paginate
    if (data && typeof data.length !== 'undefined') {
      return data;
    }

    // Check that the page exists and contains the necessary properties
    if (!data) {
      throw new Error(`Function did not return a page of data! (data=${data})`);
    }
    if (typeof data.next === 'undefined') {
      throw new Error(`Page of data did not contain .next key! (data=${JSON.stringify(data)})`);
    }
    if (typeof data.results === 'undefined') {
      throw new Error(`Page of data did not contain .results key! (data=${data})`);
    }

    if (data.next) {
      if (Array.isArray(data.results)) {
        // When an array, add items to the array.
        return [...data.results, ...await getPage(page+1)];
      } else {
        // When an object, collect each item in each subarray into a central object.
        const all = {};
        const rest = await getPage(page+1);
        for (const key in data.results) {
          all[key] = [...data.results[key], ...rest[key]];
        }
        return all;
      }
    } else {
      return data.results;
    }
  };
  return getPage(1);
}
