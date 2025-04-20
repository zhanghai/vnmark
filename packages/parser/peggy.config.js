export default {
  allowedStartRules: ['Document', 'Line'],
  dts: true,
  format: 'es',
  input: 'vnmark.pegjs',
  output: 'index.js',
  returnTypes: {
    Document: "import('./vnmark.d.ts').Document",
    Line: "import('./vnmark.d.ts').Line",
  },
};
