module.exports = {
  // indicate which modules should be treated as external
  external: [
    'long',
    'protobufjs/minimal',
  ],
  output: {globals: {long: 'Long', 'protobufjs/minimal': 'protobuf'}}
};
