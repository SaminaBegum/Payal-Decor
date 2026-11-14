require("dotenv").config();

const app = require("../app");

console.log("\nChecking Express routes:\n");

for (const layer of app.router.stack) {
  if (layer.route) {
    console.log("APP ROUTE:", layer.route.path, Object.keys(layer.route.methods));
  }

  if (layer.name === "router" && layer.handle && layer.handle.stack) {
    console.log("\nAUTHENTICATION ROUTER FOUND:");

    for (const routeLayer of layer.handle.stack) {
      if (routeLayer.route) {
        console.log(
          "AUTH ROUTE:",
          routeLayer.route.path,
          Object.keys(routeLayer.route.methods)
        );
      }
    }
  }
}
