// TODO create a new library that will be added mainly as devDependency
// the library should handle
// 1) tests via Jest, including system tests when we want to start up the server and tear it down
// 2) configurable global mongo (probably @shelf preset) to make sure that we do not mock mongo
//    everywhere and to have more reliability
// 3) tools for starting, packaging, testing and deploying of the app (scripts for npm)
// 4) eslint configuration (both FE and BE)
// 5) nodemon integration (configurable)

test('Dummy test just for CI integration', () => {
  expect(true).toBe(true);
});
