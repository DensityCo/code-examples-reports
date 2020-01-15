# Report Calculation Exmaples
The following codebase is meant to demonstrate how Density would generate certain datasets using the baseline metrics Density provides via our API.

**Note:** This repository isn't maintained as a functional reports repository. There's no guarantee that just plugging the following into an application will work.

## Available Examples

### Hourly Report Data
[hourly-data.js](hourly-data.md)

Returns hourly occupancy and entrance data for a specified time range. It also accepts an aggregation parameter: `sum` or `average` which which returns the hourly averages for each day of the week over the specified time period.

## Helpers
Included are examples of helper functions we've written to make querying for Density data easier:

- **fetch-all-pages.js -** Handles fetching every page in a paginated response
- **fetch-all-objects.js -** Handles fetching every page in a paginated response
- **object-snake-camel.js -** Converts snake case to camel
- **bankers-round.js -** Rounds 0.5 up

If you need any help, please contact rob@density.io

❤ Density