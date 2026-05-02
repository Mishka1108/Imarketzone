export default import('../dist/imarketzone/server/server.mjs')
  .then((module) => module.default || module.app || module);