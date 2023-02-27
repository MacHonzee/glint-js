import { jest } from "@jest/globals";
import { AppEventEmitter } from "../../../src/index.js";

describe("AppEventEmitter test", () => {
  test("HDS", async () => {
    function validationSubscription(arg1, arg2) {
      expect(arg1).toBe(69);
      expect(arg2).toBe(420);
    }

    AppEventEmitter.subscribe("customEvent", validationSubscription);

    AppEventEmitter.publish("customEvent", 69, 420);
  });

  test("HDS - anonymous function", async () => {
    AppEventEmitter.subscribe("secondEvent", (arg1) => {
      expect(arg1).toBe("Hello world!");
    });

    AppEventEmitter.publish("secondEvent", "Hello world!");
  });

  test("HDS - nothing subscribed", async () => {
    const spyFunc = jest.fn();

    AppEventEmitter.subscribe("nonexistentEvent", spyFunc);
    AppEventEmitter.publish("thirdEvent", "I should be silent.");

    expect(spyFunc).not.toBeCalled();
  });
});
