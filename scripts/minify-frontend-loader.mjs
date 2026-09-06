import { minify } from 'terser';

const minifyFrontend = async source => {
  const { code } = await minify(source, {
    ecma: 5,
    ie8: true,
    compress: {
      // Runtime field names may contain hyphens, so preserve bracket notation.
      properties: false,
    },
    // Only local identifiers are mangled; browser APIs and template hooks keep their names.
    mangle: true,
    format: {
      ascii_only: true,
      comments: false,
    },
  });
  return code;
};

export default minifyFrontend;
