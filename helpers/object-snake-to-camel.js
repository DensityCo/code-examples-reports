import camelcase from 'camelcase';

// Convert an object with snake case keys to camel case keys.
export default function objectSnakeToCamel(input) {
  const output = {};

  for (const key in input) {
    if (Array.isArray(input[key])) {
      // If the value is an array, convert keys deeply.
      output[camelcase(key)] = input[key].map(i => objectSnakeToCamel({temp: i}).temp);
    } else if (input[key] && input[key].toString() === '[object Object]') {
      // If the value is an object, convert keys deeply.
      output[camelcase(key)] = objectSnakeToCamel(input[key]);
    } else if (typeof key === 'string') {
      output[camelcase(key)] = input[key];
    } else {
      output[key] = input[key];
    }
  }

  return output;
}
