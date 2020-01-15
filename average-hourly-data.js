import moment from 'moment';

import bankersRound from '../../helpers/bankers-round';
import {
  getCurrentLocalTimeAtSpace,
  formatInISOTimeAtSpace,
  parseISOTimeAtSpace,
} from '../../helpers/space-time-utilities';

import { convertTimeRangeToDaysAgo } from '../../helpers/reports';
import fetchAllObjects, { fetchObject } from '../../helpers/fetch-all-objects';


// Just putting this here as an object ... might be useful for testing
exampleParams = {
  spaceId: 123,
  timeRange: {
    start: '2020-01-01T00:00:00Z',
    end: '2020-01-02T23:59:00Z',
    includeWeekends: true
  },
  metric: 'occupancy',
  aggregation: 'average'  
};

// Get meta data about the space (used to get space's time zone)
const space = fetchObject(client, `/spaces/${exampleParams.spaceId}`);

// Tiemstamp comversion stuff
const timestamp = date ? moment.tz(date, space.timeZone) : getCurrentLocalTimeAtSpace(space);
const timeRange = convertTimeRangeToDaysAgo(timestamp, exampleParams.timeRange, weekStart, space.timeZone);

// Fetch all count data within the time range, specifying an interval of choice (min 5 min)
let data = fetchAllObjects(client,
  `/spaces/${exampleParams.spaceId}/counts`,
  {
    params: {
      interval: '1h',
      start_time: formatInISOTimeAtSpace(timeRange.start, space),
      end_time: formatInISOTimeAtSpace(timeRange.end, space),
      ...(slow ? {slow: 'true'} : {}),
    },
    skipCamel: true,
  }
);

// For this particular report, we allow people to choose whether or not to include weekends. I'm going to include this logic here just in case you want to borrow that as well
if (!exampleParams.includeWeekends) {
  data = data.filter(bucket => {
    const timestamp = parseISOTimeAtSpace(bucket.timestamp, space);
    const dayOfWeek = timestamp.format('dddd');
    const isWeekend = ['Saturday', 'Sunday'].indexOf(dayOfWeek) >= 0;
    return !isWeekend;
  });
}

// Group together all count buckets, one group per (columnKey + hours)
// Aggregate all buckets in each (columnKey + hours) into a "bucketArray"
const bucketsByColumn = [];
data.sort((a, b) => moment.utc(a.timestamp).diff(moment.utc(b.timestamp))).forEach(bucket => {
  // Determine values for the unique columnKey and its index in the grouped array, if it exists yet
  const bucketTimestamp = parseISOTimeAtSpace(bucket.timestamp, space);
  const bucketDate = bucketTimestamp.format('YYYY-MM-DD');
  const columnKey = (exampleParams.aggregation || 'none') === 'none' ?
    bucketDate : bucketTimestamp.format('dddd');
  const columnIndex = bucketsByColumn.findIndex(d => d.columnKey === columnKey);

  // If column is found, append each bucket to the correct "bucketArray" for its time slot
  if (columnIndex >= 0) {
    // Determine value of the row index for this bucket
    const columnBucketArrays = bucketsByColumn[columnIndex].bucketArrays;
    const columnTimestamp = parseISOTimeAtSpace(columnBucketArrays[0][0].timestamp, space);
    const columnStartTime = moment.utc(columnTimestamp.format('HH:mm'), 'HH:mm');
    const rowStartTime = moment.utc(bucketTimestamp.format('HH:mm'), 'HH:mm');
    const rowIndex = rowStartTime.diff(columnStartTime, 'hours');

    // If bucketArray at this row index exists, append the value, otherwise create a new bucketArray
    if (bucketsByColumn[columnIndex].bucketArrays[rowIndex]) {
      bucketsByColumn[columnIndex].bucketArrays[rowIndex].push(bucket);
    } else {
      bucketsByColumn[columnIndex].bucketArrays[rowIndex] = [bucket];
    }

    // Overwrite the date since it's OK if the columns end up with the "latest" date for each weekday
    bucketsByColumn[columnIndex].date = bucketDate;

  // If the column is not found, create it and include the first bucket
  } else {
    bucketsByColumn.push({
      columnKey,
      bucketDate,
      bucketArrays: [[bucket]]
    });
  }
});

// Make sure that the timestamp that the first column starts at is at the start of the day, and if
// not, then add empty buckets to offset the column when rendering.
//
// This is normally not an issue, but can present itself as one when the time range that has been
// selected doesn't start at the beginning of the day.
const firstCellTimestamp = parseISOTimeAtSpace(bucketsByColumn[0].bucketArrays[0][0].timestamp, space);
const firstCellOffsetFromStartOfDayInHours = (
  firstCellTimestamp.diff(firstCellTimestamp.clone().startOf('day'), 'hours')
);
if (firstCellOffsetFromStartOfDayInHours > 0) {
  for (let h = firstCellOffsetFromStartOfDayInHours-1; h >= 0; h -= 1) {
    bucketsByColumn[0].bucketArrays.unshift([{
      timestamp: firstCellTimestamp.clone().startOf('day').add(h, 'hours').format(),
      interval: {
        analytics: {},
      },
    }]);
  }
}

// Determine the "extractor" function to get the correct metric out of each bucket
let valueExtractor;
if (exampleParams.metric === 'occupancy') {
  valueExtractor = i => i.interval.analytics.max
} else {
  valueExtractor = i => i.interval.analytics.entrances
}

// Aggregate the buckets for each day/time if necessary, and map to an array of values
const dataByColumn = bucketsByColumn.map(({date, bucketArrays}) => {
  return {
    date: moment.tz(date, "YYYY-MM-DD", space.timeZone),
    values: bucketArrays.map(bucketArray => {
      let value;
      // Sum the values in each bucketArray
      if (exampleParams.aggregation === 'SUM') {
        value = bucketArray.reduce((acc, i) => acc + valueExtractor(i), 0);
      // Average the values in each bucketArray
      } else if (exampleParams.aggregation === 'AVERAGE') {
        value = bucketArray.reduce((acc, i) => acc + valueExtractor(i), 0);
        value = value / bucketArray.length;
        value = value >= 100 ? bankersRound(value, 0) : bankersRound(value, 1);
      // Don't aggregate by default, there should be only one bucket in each bucketArray
      } else {
        value = valueExtractor(bucketArray[0]);
      }
      return isNaN(value) ? null : value;
    })
  };
});

report = {
  startDate: timeRange.start,
  endDate: timeRange.end,
  space,

  data: dataByColumn,
  metric: exampleParams.metric,
  aggregation: exampleParams.aggregation,
};

console.log(report);